const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ── Terminal Sessions ──────────────────────────────────────────────────────────
const terminals = {};

function killTerminal(terminalId) {
    const entry = terminals[terminalId];
    if (!entry) return;
    try { entry.ptyProcess.kill(); } catch (e) { }
    delete terminals[terminalId];
    console.log(`[TerminalService] Terminal ${terminalId} disposed.`);
}

// ── Output Log Buffer (for Output tab) ────────────────────────────────────────
const outputBuffer = [];
const MAX_OUTPUT_LINES = 1000;

function pushOutputLog(source, level, message) {
    const entry = { source, level, message, timestamp: new Date().toISOString() };
    outputBuffer.push(entry);
    if (outputBuffer.length > MAX_OUTPUT_LINES) outputBuffer.shift();
    io.emit('output-log', entry);
}

// ── Socket.io Events ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[Server] Socket connected: ${socket.id}`);
    pushOutputLog('IDE', 'info', `Editor session connected (${socket.id.slice(0, 8)})`);

    // ── TERMINAL: Create ──────────────────────────────────────────────────────
    socket.on('create-terminal', ({ cwd, name, profile } = {}) => {
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

        console.log(`[TerminalService] Creating ${terminalId} in ${workingDir} (${profile || 'PowerShell'})`);
        pushOutputLog('Terminal', 'info', `New terminal created: ${name || profile || 'PowerShell'} in ${workingDir}`);

        try {
            const ptyProcess = pty.spawn(shell, shellArgs, {
                name: 'xterm-256color',
                cwd: workingDir,
                env: process.env,
                cols: 120, rows: 30,
            });

            terminals[terminalId] = { ptyProcess, cwd: workingDir, socketId: socket.id };

            ptyProcess.onData((data) => socket.emit('terminal-output', { terminalId, data }));

            ptyProcess.onExit(({ exitCode }) => {
                pushOutputLog('Terminal', 'info', `Terminal exited with code ${exitCode}`);
                socket.emit('terminal-output', {
                    terminalId,
                    data: `\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`,
                });
                delete terminals[terminalId];
            });

            socket.emit('terminal-created', { terminalId, cwd: workingDir, name: name || 'PowerShell' });
        } catch (err) {
            console.error(`[TerminalService] Failed to spawn PTY:`, err);
            socket.emit('terminal-output', {
                terminalId,
                data: `\r\n\x1b[1;31m[Error]\x1b[0m Failed to start terminal: ${err.message}\r\n`,
            });
        }
    });

    socket.on('terminal-input', ({ terminalId, data }) => {
        const entry = terminals[terminalId];
        if (entry && entry.socketId === socket.id) entry.ptyProcess.write(data);
    });

    socket.on('resize', ({ terminalId, cols, rows }) => {
        const entry = terminals[terminalId];
        if (entry && entry.socketId === socket.id && cols && rows) {
            try { entry.ptyProcess.resize(cols, rows); } catch (e) { }
        }
    });

    socket.on('kill-terminal', ({ terminalId }) => {
        const entry = terminals[terminalId];
        if (entry && entry.socketId === socket.id) killTerminal(terminalId);
    });

    // ── OUTPUT: send buffer to newly connected client ──────────────────────────
    socket.on('subscribe-output', () => {
        socket.emit('output-history', outputBuffer.slice(-200));
    });

    // ── DIAGNOSTICS (Problems Tab) ─────────────────────────────────────────────
    socket.on('run-diagnostics', ({ cwd }) => {
        if (!cwd) return socket.emit('lint-diagnostics', { problems: [], error: 'No cwd provided' });

        pushOutputLog('ESLint', 'info', `Running diagnostics on: ${cwd}`);

        // Try TypeScript diagnostics via tsc --noEmit
        const tscConfig = path.join(cwd, 'tsconfig.json');
        const hasTsc = fs.existsSync(tscConfig);

        // Try ESLint
        const eslintBin = path.join(cwd, 'node_modules', '.bin', os.platform() === 'win32' ? 'eslint.cmd' : 'eslint');
        const hasEslint = fs.existsSync(eslintBin);

        const problems = [];
        let pending = 0;

        const done = () => {
            pending--;
            if (pending <= 0) {
                socket.emit('lint-diagnostics', { problems });
                pushOutputLog('ESLint', 'info', `Diagnostics complete: ${problems.length} issues found`);
            }
        };

        if (!hasEslint && !hasTsc) {
            return socket.emit('lint-diagnostics', { problems: [], info: 'No ESLint or TSConfig found in project root.' });
        }

        if (hasEslint) {
            pending++;
            exec(`"${eslintBin}" --ext .ts,.tsx,.js,.jsx . --format json --max-warnings=100`, { cwd, timeout: 30000 }, (err, stdout) => {
                try {
                    const results = JSON.parse(stdout || '[]');
                    results.forEach(fileResult => {
                        const relPath = path.relative(cwd, fileResult.filePath).replace(/\\/g, '/');
                        fileResult.messages.forEach(msg => {
                            problems.push({
                                id: uuidv4(),
                                file: relPath,
                                line: msg.line || 0,
                                col: msg.column || 0,
                                message: msg.message,
                                severity: msg.severity === 2 ? 'error' : 'warning',
                                source: 'ESLint',
                                rule: msg.ruleId || '',
                            });
                        });
                    });
                } catch (_) { }
                done();
            });
        }

        if (hasTsc) {
            pending++;
            const tscBin = path.join(cwd, 'node_modules', '.bin', os.platform() === 'win32' ? 'tsc.cmd' : 'tsc');
            const globalTsc = 'tsc';
            const tscExe = fs.existsSync(tscBin) ? `"${tscBin}"` : globalTsc;

            exec(`${tscExe} --noEmit --pretty false 2>&1`, { cwd, timeout: 30000 }, (err, stdout, stderr) => {
                const output = stdout || stderr || '';
                const lines = output.split('\n');
                lines.forEach(line => {
                    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS(\d+):\s*(.+)$/);
                    if (match) {
                        const [, filePath, lineNum, col, sev, code, msg] = match;
                        problems.push({
                            id: uuidv4(),
                            file: path.relative(cwd, filePath).replace(/\\/g, '/'),
                            line: parseInt(lineNum),
                            col: parseInt(col),
                            message: msg.trim(),
                            severity: sev,
                            source: 'TypeScript',
                            rule: `TS${code}`,
                        });
                    }
                });
                done();
            });
        }
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[Server] Socket disconnected: ${socket.id}`);
        Object.keys(terminals).forEach(id => {
            if (terminals[id].socketId === socket.id) killTerminal(id);
        });
    });
});

// ── REST: Ports Endpoint ───────────────────────────────────────────────────────
app.get('/ports', (req, res) => {
    const isWin = os.platform() === 'win32';
    const cmd = isWin
        ? 'netstat -ano -p TCP'
        : 'ss -tlnp';

    exec(cmd, { timeout: 8000 }, (err, stdout) => {
        if (err && !stdout) return res.json({ ports: [] });

        const ports = [];
        const seen = new Set();

        if (isWin) {
            const lines = stdout.split('\n');
            lines.forEach(line => {
                // LISTENING lines: TCP    0.0.0.0:3000    ... LISTENING   1234
                const m = line.match(/TCP\s+[\d.:*]+:(\d+)\s+[\d.:*]+\s+LISTENING\s+(\d+)/i);
                if (m) {
                    const port = parseInt(m[1]);
                    const pid = m[2];
                    if (!seen.has(port) && port >= 1024 && port <= 65535) {
                        seen.add(port);
                        ports.push({ port, pid, state: 'LISTENING', url: `http://localhost:${port}` });
                    }
                }
            });
        } else {
            const lines = stdout.split('\n');
            lines.forEach(line => {
                const m = line.match(/:(\d+)\s+/);
                if (m) {
                    const port = parseInt(m[1]);
                    if (!seen.has(port) && port >= 1024) {
                        seen.add(port);
                        ports.push({ port, pid: null, state: 'LISTEN', url: `http://localhost:${port}` });
                    }
                }
            });
        }

        // Sort and annotate known dev ports
        const knownPorts = { 3000: 'React', 3001: 'React', 4000: 'GraphQL', 5000: 'Dev Server', 5173: 'Vite', 8080: 'Spring Boot', 8081: 'Spring Boot API', 8082: 'Terminal Server', 8083: 'Dev Server', 9000: 'Dev Server' };
        ports.sort((a, b) => a.port - b.port);
        ports.forEach(p => { if (knownPorts[p.port]) p.label = knownPorts[p.port]; });

        res.json({ ports });
    });
});

// ── REST: VS Code Extension Scanner ───────────────────────────────────────────
const IMPORTED_EXTENSIONS_FILE = path.join(__dirname, 'imported-extensions.json');

function loadImportedExtensionIds() {
    try {
        if (fs.existsSync(IMPORTED_EXTENSIONS_FILE)) {
            return JSON.parse(fs.readFileSync(IMPORTED_EXTENSIONS_FILE, 'utf-8'));
        }
    } catch (_) { }
    return [];
}

function saveImportedExtensionIds(ids) {
    try { fs.writeFileSync(IMPORTED_EXTENSIONS_FILE, JSON.stringify(ids, null, 2)); }
    catch (_) { }
}

app.get('/vscode-extensions', (_req, res) => {
    const userHome = os.homedir();
    const vscodeDirs = [
        path.join(userHome, '.vscode', 'extensions'),
        path.join(userHome, '.vscode-insiders', 'extensions'),
    ];

    const extensionsDir = vscodeDirs.find(d => fs.existsSync(d));
    if (!extensionsDir) {
        return res.json({ extensions: [], info: 'No VS Code extensions directory found.', path: vscodeDirs[0] });
    }

    const importedIds = loadImportedExtensionIds();
    const extensions = [];

    try {
        const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const pkgPath = path.join(extensionsDir, entry.name, 'package.json');
            if (!fs.existsSync(pkgPath)) continue;

            try {
                const raw = fs.readFileSync(pkgPath, 'utf-8');
                const pkg = JSON.parse(raw);

                const id = pkg.name ? `${pkg.publisher || 'unknown'}.${pkg.name}` : entry.name;
                const iconPath = pkg.icon ? path.join(extensionsDir, entry.name, pkg.icon) : null;
                let iconBase64 = null;
                if (iconPath && fs.existsSync(iconPath)) {
                    try {
                        const iconBuf = fs.readFileSync(iconPath);
                        const ext = path.extname(iconPath).replace('.', '');
                        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                        iconBase64 = `data:${mime};base64,${iconBuf.toString('base64')}`;
                    } catch (_) { }
                }

                extensions.push({
                    id,
                    name: pkg.displayName || pkg.name || entry.name,
                    publisher: pkg.publisher || 'Unknown',
                    version: pkg.version || '0.0.0',
                    description: pkg.description || '',
                    categories: pkg.categories || [],
                    icon: iconBase64,
                    folderName: entry.name,
                    imported: importedIds.includes(id),
                });
            } catch (_) { /* skip unparseable extensions */ }
        }
    } catch (err) {
        return res.status(500).json({ extensions: [], error: err.message });
    }

    extensions.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ extensions, path: extensionsDir, total: extensions.length });
});

app.get('/vscode-extensions/imported', (_req, res) => {
    const userHome = os.homedir();
    const vscodeDirs = [
        path.join(userHome, '.vscode', 'extensions'),
        path.join(userHome, '.vscode-insiders', 'extensions'),
    ];
    const extensionsDir = vscodeDirs.find(d => fs.existsSync(d));
    if (!extensionsDir) return res.json({ extensions: [] });

    const importedIds = loadImportedExtensionIds();
    const extensions = [];

    try {
        const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const pkgPath = path.join(extensionsDir, entry.name, 'package.json');
            if (!fs.existsSync(pkgPath)) continue;

            try {
                const raw = fs.readFileSync(pkgPath, 'utf-8');
                const pkg = JSON.parse(raw);
                const id = pkg.name ? `${pkg.publisher || 'unknown'}.${pkg.name}` : entry.name;

                if (importedIds.includes(id)) {
                    const iconPath = pkg.icon ? path.join(extensionsDir, entry.name, pkg.icon) : null;
                    let iconBase64 = null;
                    if (iconPath && fs.existsSync(iconPath)) {
                        try {
                            const iconBuf = fs.readFileSync(iconPath);
                            const ext = path.extname(iconPath).replace('.', '');
                            const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                            iconBase64 = `data:${mime};base64,${iconBuf.toString('base64')}`;
                        } catch (_) { }
                    }

                    extensions.push({
                        id,
                        name: pkg.displayName || pkg.name || entry.name,
                        publisher: pkg.publisher || 'Unknown',
                        version: pkg.version || '0.0.0',
                        description: pkg.description || '',
                        category: pkg.categories ? pkg.categories[0] : 'Other',
                        icon: iconBase64,
                        enabled: true, // Default to enabled once imported
                        source: 'vscode-import'
                    });
                }
            } catch (_) { }
        }
    } catch (err) {
        return res.status(500).json({ extensions: [], error: err.message });
    }
    res.json(extensions);
});

app.get('/vscode-extensions/:id/details', (req, res) => {
    const { id } = req.params;
    const userHome = os.homedir();
    const vscodeDirs = [
        path.join(userHome, '.vscode', 'extensions'),
        path.join(userHome, '.vscode-insiders', 'extensions'),
    ];
    const extensionsDir = vscodeDirs.find(d => fs.existsSync(d));
    if (!extensionsDir) return res.status(404).json({ error: 'Extensions directory not found' });

    try {
        const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const pkgPath = path.join(extensionsDir, entry.name, 'package.json');
            if (!fs.existsSync(pkgPath)) continue;

            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const extId = pkg.name ? `${pkg.publisher || 'unknown'}.${pkg.name}` : entry.name;

            if (extId === id) {
                const extPath = path.join(extensionsDir, entry.name);
                const readmePath = ['README.md', 'readme.md', 'README.txt'].map(f => path.join(extPath, f)).find(f => fs.existsSync(f));
                const changelogPath = ['CHANGELOG.md', 'changelog.md', 'CHANGELOG.txt'].map(f => path.join(extPath, f)).find(f => fs.existsSync(f));

                return res.json({
                    id,
                    packageJson: pkg,
                    readme: readmePath ? fs.readFileSync(readmePath, 'utf-8') : '',
                    changelog: changelogPath ? fs.readFileSync(changelogPath, 'utf-8') : ''
                });
            }
        }
        res.status(404).json({ error: 'Extension not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/vscode-extensions/icon/:id', (req, res) => {
    const { id } = req.params;
    const userHome = os.homedir();
    const vscodeDirs = [
        path.join(userHome, '.vscode', 'extensions'),
        path.join(userHome, '.vscode-insiders', 'extensions'),
    ];
    const extensionsDir = vscodeDirs.find(d => fs.existsSync(d));
    if (!extensionsDir) return res.status(404).end();

    try {
        const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const pkgPath = path.join(extensionsDir, entry.name, 'package.json');
            if (!fs.existsSync(pkgPath)) continue;

            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const extId = pkg.name ? `${pkg.publisher || 'unknown'}.${pkg.name}` : entry.name;

            if (extId === id && pkg.icon) {
                const iconPath = path.join(extensionsDir, entry.name, pkg.icon);
                if (fs.existsSync(iconPath)) {
                    return res.sendFile(iconPath);
                }
            }
        }
        res.status(404).end();
    } catch (err) {
        res.status(500).end();
    }
});

app.post('/vscode-extensions/import', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

    const existing = loadImportedExtensionIds();
    const merged = [...new Set([...existing, ...ids])];
    saveImportedExtensionIds(merged);

    pushOutputLog('IDE', 'info', `Imported ${ids.length} VS Code extension(s)`);
    res.json({ imported: merged, count: merged.length });
});

app.delete('/vscode-extensions/import', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

    const existing = loadImportedExtensionIds();
    const filtered = existing.filter(id => !ids.includes(id));
    saveImportedExtensionIds(filtered);

    res.json({ imported: filtered, count: filtered.length });
});

// ── REST: Health ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', terminals: Object.keys(terminals).length }));

// ── REST: Native folder picker ─────────────────────────────────────────────────
app.get('/pick-folder', (req, res) => {
    if (os.platform() !== 'win32') return res.status(500).json({ error: 'Only supported on Windows' });

    const ps1Script = `
        Add-Type -AssemblyName System.windows.forms;
        $f = New-Object System.Windows.Forms.FolderBrowserDialog;
        $f.Description = "Select Workspace Folder";
        $f.ShowNewFolderButton = $true;
        $result = $f.ShowDialog();
        if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }
    `;
    const ps = spawn('powershell', ['-NoProfile', '-STA', '-Command', ps1Script]);
    let pathChunk = '';
    ps.stdout.on('data', d => { pathChunk += d.toString(); });
    ps.on('close', () => {
        const selectedPath = pathChunk.trim();
        res.json({ path: selectedPath || null });
    });
});

// ── REST: Get User Home ────────────────────────────────────────────────────────
app.get('/user-home', (req, res) => {
    res.json({ path: os.homedir() });
});

// ── Git Endpoints ──────────────────────────────────────────────────────────────

function runGit(args, cwd) {
    return new Promise((resolve, reject) => {
        exec(`git ${args}`, { cwd, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) return reject(stderr || err.message);
            resolve(stdout.trim());
        });
    });
}

app.get('/git/status', async (req, res) => {
    const { path: repoPath } = req.query;
    if (!repoPath) return res.status(400).json({ error: 'path required' });
    try {
        const branch = await runGit('rev-parse --abbrev-ref HEAD', repoPath).catch(() => 'main');
        const porcelain = await runGit('status --porcelain', repoPath);
        const changes = [];
        if (porcelain) {
            porcelain.split('\n').forEach(line => {
                if (!line.trim()) return;
                const staged = line[0] !== ' ' && line[0] !== '?';
                const statusChar = staged ? line[0] : line[1];
                let status = 'modified';
                if (statusChar === 'A' || statusChar === '?') status = 'untracked';
                else if (statusChar === 'D') status = 'deleted';
                else if (statusChar === 'M') status = 'modified';
                const filePath = line.slice(3).trim();
                const fileName = filePath.split('/').pop() || filePath;
                changes.push({ path: filePath, fileName, status, staged });
            });
        }
        res.json({ branch, changes });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/git/init', async (req, res) => {
    const { path: repoPath } = req.body;
    if (!repoPath) return res.status(400).json({ error: 'path required' });
    try {
        await runGit('init', repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/git/stage', async (req, res) => {
    const { path: repoPath, files } = req.body;
    if (!repoPath || !files) return res.status(400).json({ error: 'path and files required' });
    try {
        await runGit(`add ${files.map(f => `"${f}"`).join(' ')}`, repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/git/unstage', async (req, res) => {
    const { path: repoPath, files } = req.body;
    if (!repoPath || !files) return res.status(400).json({ error: 'path and files required' });
    try {
        await runGit(`reset HEAD ${files.map(f => `"${f}"`).join(' ')}`, repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/git/commit', async (req, res) => {
    const { path: repoPath, message } = req.body;
    if (!repoPath || !message) return res.status(400).json({ error: 'path and message required' });
    try {
        await runGit(`commit -m "${message.replace(/"/g, '\\"')}"`, repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

const PORT = 8082;
server.listen(PORT, () => console.log(`[Server] Panel Service running on port ${PORT}`));
