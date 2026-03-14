const express = require('express');
const os = require('os');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { spawn, exec, execFile } = require('child_process');
const outputBuffer = require('../services/outputBuffer');
const terminalService = require('../services/terminalService');

const router = express.Router();

// ── GET USER HOME ────────────────────────────────────────────────────────
router.get('/user-home', (req, res) => {
    res.json({ path: os.homedir() });
});

// ── GET HEALTH ───────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', terminals: terminalService.getActiveTerminalCount() });
});

// ── PORTS ────────────────────────────────────────────────────────────────
router.get('/ports', (req, res) => {
    const isWin = os.platform() === 'win32';
    const cmd = isWin ? 'netstat -ano -p TCP' : 'ss -tlnp';

    exec(cmd, { timeout: 8000 }, (err, stdout) => {
        if (err && !stdout) return res.json({ ports: [] });

        const ports = [];
        const seen = new Set();

        if (isWin) {
            const lines = stdout.split('\n');
            lines.forEach(line => {
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

        const knownPorts = { 3000: 'React', 3001: 'React', 4000: 'GraphQL', 5000: 'Dev Server', 5173: 'Vite', 8080: 'Spring Boot', 8081: 'Spring Boot API', 8082: 'Terminal Server', 8083: 'Dev Server', 9000: 'Dev Server' };
        ports.sort((a, b) => a.port - b.port);
        ports.forEach(p => { if (knownPorts[p.port]) p.label = knownPorts[p.port]; });

        res.json({ ports });
    });
});

// ── VS CODE EXTENSIONS ───────────────────────────────────────────────────
const IMPORTED_EXTENSIONS_FILE = path.join(__dirname, '../imported-extensions.json');

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

router.get('/vscode-extensions', (_req, res) => {
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

router.get('/vscode-extensions/imported', (_req, res) => {
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
                        enabled: true,
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

router.get('/vscode-extensions/:id/details', (req, res) => {
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

router.get('/vscode-extensions/icon/:id', (req, res) => {
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

router.post('/vscode-extensions/import', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

    const existing = loadImportedExtensionIds();
    const merged = [...new Set([...existing, ...ids])];
    saveImportedExtensionIds(merged);

    outputBuffer.pushLog('IDE', 'info', `Imported ${ids.length} VS Code extension(s)`);
    res.json({ imported: merged, count: merged.length });
});

router.delete('/vscode-extensions/import', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

    const existing = loadImportedExtensionIds();
    const filtered = existing.filter(id => !ids.includes(id));
    saveImportedExtensionIds(filtered);

    res.json({ imported: filtered, count: filtered.length });
});

// ── NATIVE FOLDER PICKER ─────────────────────────────────────────────────
router.get('/pick-folder', (req, res) => {
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

// ── DEBUG CONSOLE EVAL ───────────────────────────────────────────────────
const evalContexts = {};

router.post('/debug/eval', (req, res) => {
    const { expression, contextId = 'default' } = req.body;
    if (!expression) return res.status(400).json({ error: 'expression required' });

    if (!evalContexts[contextId]) {
        evalContexts[contextId] = vm.createContext({
            console, setTimeout, setInterval, process, Buffer,
            clearTimeout, clearInterval, require, __dirname,
            __filename, exports, module: {}
        });
    }

    try {
        const result = vm.runInContext(expression, evalContexts[contextId], { timeout: 2000 });
        let formattedResult = result;
        if (typeof result === 'object' && result !== null) {
            try { formattedResult = JSON.stringify(result, null, 2); }
            catch (e) { formattedResult = String(result); }
        } else if (result !== undefined) {
            formattedResult = String(result);
        } else {
            formattedResult = 'undefined';
        }
        res.json({ result: formattedResult });
    } catch (err) {
        res.json({ error: err.toString() });
    }
});

// ── GIT ENDPOINTS ────────────────────────────────────────────────────────
function runGit(argsArray, cwd) {
    return new Promise((resolve, reject) => {
        execFile('git', argsArray, { cwd, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) return reject(stderr || err.message);
            resolve(stdout.trim());
        });
    });
}

router.get('/git/status', async (req, res) => {
    const { path: repoPath } = req.query;
    if (!repoPath) return res.status(400).json({ error: 'path required' });
    try {
        const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath).catch(() => 'main');
        const porcelain = await runGit(['status', '--porcelain'], repoPath);
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

router.post('/git/init', async (req, res) => {
    const { path: repoPath } = req.body;
    if (!repoPath) return res.status(400).json({ error: 'path required' });
    try {
        await runGit(['init'], repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

router.post('/git/stage', async (req, res) => {
    const { path: repoPath, files } = req.body;
    if (!repoPath || !files) return res.status(400).json({ error: 'path and files required' });
    try {
        await runGit(['add', ...files], repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

router.post('/git/unstage', async (req, res) => {
    const { path: repoPath, files } = req.body;
    if (!repoPath || !files) return res.status(400).json({ error: 'path and files required' });
    try {
        await runGit(['reset', 'HEAD', ...files], repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

router.post('/git/commit', async (req, res) => {
    const { path: repoPath, message } = req.body;
    if (!repoPath || !message) return res.status(400).json({ error: 'path and message required' });
    try {
        await runGit(['commit', '-m', message], repoPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

module.exports = router;
