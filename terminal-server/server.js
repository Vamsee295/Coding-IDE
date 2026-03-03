const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

/**
 * VS Code-style Terminal Service
 *
 * terminals is a flat map: terminalId → { ptyProcess, cwd, socketId }
 * Multiple terminals can exist per socket connection.
 * I/O is always routed by terminalId.
 */
const terminals = {};

function killTerminal(terminalId) {
    const entry = terminals[terminalId];
    if (!entry) return;
    try {
        entry.ptyProcess.kill();
    } catch (e) {
        console.error(`[TerminalService] Error killing terminal ${terminalId}:`, e.message);
    }
    delete terminals[terminalId];
    console.log(`[TerminalService] Terminal ${terminalId} disposed.`);
}

io.on('connection', (socket) => {
    console.log(`[TerminalService] Socket connected: ${socket.id}`);

    // ── CREATE TERMINAL ──────────────────────────────────────────────────────
    // Frontend emits: { cwd, name?, profile? }
    // Backend responds: { terminalId }
    socket.on('create-terminal', ({ cwd, name, profile } = {}) => {
        const terminalId = uuidv4();
        const workingDir = cwd || os.homedir();

        let shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        let shellArgs = [];

        if (os.platform() === 'win32') {
            if (profile === 'Command Prompt') {
                shell = 'cmd.exe';
            } else if (profile === 'Git Bash') {
                shell = 'C:\\Program Files\\Git\\bin\\bash.exe';
                shellArgs = ['--login'];
            } else if (profile === 'Ubuntu (WSL)') {
                shell = 'wsl.exe';
            } else if (profile === 'JavaScript Debug Terminal') {
                // A basic node REPL mapping for the sake of the demo
                shell = 'node.exe';
            } else {
                // Default PowerShell
                shellArgs = ['-NoLogo'];
            }
        }

        console.log(`[TerminalService] Creating terminal ${terminalId} in: ${workingDir} with profile: ${profile || 'Default'}`);

        try {
            const ptyProcess = pty.spawn(shell, shellArgs, {
                name: 'xterm-256color',
                cwd: workingDir,
                env: process.env,
                cols: 120,
                rows: 30,
            });

            terminals[terminalId] = { ptyProcess, cwd: workingDir, socketId: socket.id };

            // Stream PTY output back to the frontend, tagged with terminalId
            ptyProcess.onData((data) => {
                socket.emit('terminal-output', { terminalId, data });
            });

            ptyProcess.onExit(({ exitCode }) => {
                console.log(`[TerminalService] Terminal ${terminalId} exited (code ${exitCode})`);
                socket.emit('terminal-output', {
                    terminalId,
                    data: `\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`,
                });
                delete terminals[terminalId];
            });

            // Confirm to frontend
            socket.emit('terminal-created', { terminalId, cwd: workingDir, name: name || 'PowerShell' });

        } catch (err) {
            console.error(`[TerminalService] Failed to spawn PTY for ${terminalId}:`, err);
            socket.emit('terminal-output', {
                terminalId,
                data: `\r\n\x1b[1;31m[Error]\x1b[0m Failed to start terminal: ${err.message}\r\n`,
            });
        }
    });

    // ── TERMINAL INPUT ───────────────────────────────────────────────────────
    // Frontend emits: { terminalId, data }
    socket.on('terminal-input', ({ terminalId, data }) => {
        const entry = terminals[terminalId];
        if (entry && entry.socketId === socket.id) {
            entry.ptyProcess.write(data);
        }
    });

    // ── RESIZE ───────────────────────────────────────────────────────────────
    // Frontend emits: { terminalId, cols, rows }
    socket.on('resize', ({ terminalId, cols, rows }) => {
        const entry = terminals[terminalId];
        if (entry && entry.socketId === socket.id && cols && rows) {
            try {
                entry.ptyProcess.resize(cols, rows);
            } catch (e) {
                console.error(`[TerminalService] Resize error for ${terminalId}:`, e.message);
            }
        }
    });

    // ── KILL TERMINAL ────────────────────────────────────────────────────────
    // Frontend emits: { terminalId }
    socket.on('kill-terminal', ({ terminalId }) => {
        const entry = terminals[terminalId];
        if (entry && entry.socketId === socket.id) {
            killTerminal(terminalId);
        }
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    // Kill ALL terminals owned by this socket
    socket.on('disconnect', () => {
        console.log(`[TerminalService] Socket disconnected: ${socket.id}`);
        Object.keys(terminals).forEach((id) => {
            if (terminals[id].socketId === socket.id) {
                killTerminal(id);
            }
        });
    });
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', terminals: Object.keys(terminals).length }));

// Native OS Folder Picker
app.get('/pick-folder', (req, res) => {
    if (os.platform() !== 'win32') {
        return res.status(500).json({ error: 'Only supported on Windows currently' });
    }

    const ps1Script = `
        Add-Type -AssemblyName System.windows.forms;
        $f = New-Object System.Windows.Forms.FolderBrowserDialog;
        $f.Description = "Select Workspace Folder";
        $f.ShowNewFolderButton = $true;
        $result = $f.ShowDialog();
        if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
            Write-Output $f.SelectedPath
        }
    `;

    const ps = spawn('powershell', ['-NoProfile', '-STA', '-Command', ps1Script]);

    let pathChunk = "";

    ps.stdout.on('data', (data) => {
        pathChunk += data.toString();
    });

    ps.on('close', (code) => {
        const selectedPath = pathChunk.trim();
        if (selectedPath) {
            res.json({ path: selectedPath });
        } else {
            res.json({ path: null });
        }
    });
});

const PORT = 8082;
server.listen(PORT, () => {
    console.log(`[TerminalService] VS Code-style Terminal Service running on port ${PORT}`);
});
