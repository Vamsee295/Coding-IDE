const pty = require('node-pty');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const outputBuffer = require('./outputBuffer');

class TerminalService {
    constructor() {
        this.terminals = {}; // terminalId -> { ptyProcess, cwd, socketId }
    }

    createTerminal(socket, payload = {}) {
        const { cwd, name, profile } = payload;
        console.log(`[Server] Received create-terminal event:`, payload);
        const terminalId = uuidv4();
        const workingDir = cwd || os.homedir();

        let shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        let shellArgs = [];

        if (os.platform() === 'win32') {
            if (profile === 'Command Prompt') { shell = 'cmd.exe'; }
            else if (profile === 'Git Bash') { shell = 'C:\\Program Files\\Git\\bin\\bash.exe'; shellArgs = ['--login']; }
            else if (profile === 'Ubuntu (WSL)') { shell = 'wsl.exe'; }
            else { shellArgs = ['-NoLogo']; }
        }

        console.log(`[TerminalService] Spawning ${shell} in ${workingDir} (ID: ${terminalId})`);
        outputBuffer.pushLog('Terminal', 'info', `New terminal: ${name || profile || 'PowerShell'} in ${workingDir}`);

        try {
            const ptyProcess = pty.spawn(shell, shellArgs, {
                name: 'xterm-256color',
                cwd: workingDir,
                env: process.env,
                cols: 120, rows: 30,
            });

            this.terminals[terminalId] = { ptyProcess, cwd: workingDir, socketId: socket.id };

            ptyProcess.onData((data) => socket.emit('terminal-output', { terminalId, data }));

            ptyProcess.onExit(({ exitCode }) => {
                outputBuffer.pushLog('Terminal', 'info', `Terminal exited with code ${exitCode}`);
                socket.emit('terminal-output', {
                    terminalId,
                    data: `\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`,
                });
                delete this.terminals[terminalId];
            });

            socket.emit('terminal-created', { terminalId, cwd: workingDir, name: name || 'PowerShell' });
        } catch (err) {
            console.error(`[TerminalService] Failed to spawn PTY:`, err);
            socket.emit('terminal-output', {
                terminalId,
                data: `\r\n\x1b[1;31m[Error]\x1b[0m Failed to start terminal: ${err.message}\r\n`,
            });
        }
    }

    writeToTerminal(socketId, terminalId, data) {
        const entry = this.terminals[terminalId];
        if (entry && entry.socketId === socketId) entry.ptyProcess.write(data);
    }

    resizeTerminal(socketId, terminalId, cols, rows) {
        const entry = this.terminals[terminalId];
        if (entry && entry.socketId === socketId && cols && rows) {
            try { entry.ptyProcess.resize(cols, rows); } catch (e) { }
        }
    }

    killTerminal(socketId, terminalId, override = false) {
        const entry = this.terminals[terminalId];
        if (!entry) return;
        if (!override && entry.socketId !== socketId) return;

        try { entry.ptyProcess.kill(); } catch (e) { }
        delete this.terminals[terminalId];
        console.log(`[TerminalService] Terminal ${terminalId} disposed.`);
    }

    killAllTerminalsForSocket(socketId) {
        Object.keys(this.terminals).forEach(id => {
            if (this.terminals[id].socketId === socketId) {
                this.killTerminal(socketId, id, true);
            }
        });
    }

    getActiveTerminalCount() {
        return Object.keys(this.terminals).length;
    }
}

// Export as a singleton
module.exports = new TerminalService();
