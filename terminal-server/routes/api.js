const express = require('express');
const os = require('os');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { spawn, exec, execFile } = require('child_process');
const outputBuffer = require('../services/outputBuffer');
const terminalService = require('../services/terminalService');
const workspaceService = require('../services/workspaceService');
const indexerService = require('../services/indexerService');

const router = express.Router();

// ── GET USER HOME ────────────────────────────────────────────────────────
router.get('/user-home', (req, res) => {
    res.json({ path: os.homedir() });
});

// ── GET HEALTH ───────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', terminals: terminalService.getActiveTerminalCount() });
});

// ── WORKSPACE ────────────────────────────────────────────────────────────
router.post('/workspace/set', (req, res) => {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'path required' });
    workspaceService.setWorkspaceRoot(path);
    res.json({ status: 'ok', workspaceRoot: workspaceService.getWorkspaceRoot() });
});

router.get('/workspace/get', (req, res) => {
    res.json({ workspaceRoot: workspaceService.getWorkspaceRoot() });
});

const isPathAllowedMiddleware = (req, res, next) => {
    const targetPath = req.query.path || req.body.path || req.query.rootPath;
    if (targetPath && !workspaceService.isPathAllowed(targetPath)) {
        return res.status(403).json({ error: 'Access denied: path is outside workspace root.' });
    }
    next();
};

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

    // Using Shell.Application for a more modern native folder picker on Windows
    const ps1Script = `
        $shell = New-Object -ComObject Shell.Application
        $folder = $shell.BrowseForFolder(0, "Select Project Folder", 0x00000040, 17)
        if ($folder) { Write-Output $folder.Self.Path }
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

// ── GIT CLONE ────────────────────────────────────────────────────────────
router.post('/clone', (req, res) => {
    const { repoUrl } = req.body;
    if (!repoUrl || typeof repoUrl !== 'string') {
        return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Sanitise: only allow http/https/git/ssh URLs
    const allowedPattern = /^(https?:\/\/|git@|ssh:\/\/)/i;
    if (!allowedPattern.test(repoUrl.trim())) {
        return res.status(400).json({ error: 'Invalid repository URL. Must start with https://, http://, git@, or ssh://' });
    }

    const cloneBaseDir = path.join(os.homedir(), 'cloned-repos');
    try {
        fs.mkdirSync(cloneBaseDir, { recursive: true });
    } catch (e) {
        return res.status(500).json({ error: `Failed to create clone directory: ${e.message}` });
    }

    // Derive expected folder name from URL (strip .git suffix)
    const repoName = repoUrl.trim().split('/').pop()?.replace(/\.git$/i, '') || 'repo';
    const repoPath = path.join(cloneBaseDir, repoName);

    // Increase timeout for large repos (5 minutes)
    exec(`git clone "${repoUrl.trim()}"`, { cwd: cloneBaseDir, timeout: 300000, maxBuffer: 5 * 1024 * 1024 }, (err, _stdout, stderr) => {
        if (err) {
            return res.status(500).json({ error: stderr?.trim() || err.message || 'git clone failed' });
        }
        res.json({ path: repoPath, message: `Cloned successfully into ${repoPath}` });
    });
});

// ── AI COMPLETION (OLLAMA PROXY) ─────────────────────────────────────────
router.post('/ai/complete', isPathAllowedMiddleware, async (req, res) => {
    const { prompt, suffix, model, path: filePath } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Use environment variable for Ollama or default to localhost
    const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const aiModel = model || 'qwen2.5-coder:1.5b';

    try {
        // Advanced models usually support FIM tags natively through specific APIs, 
        // but for a generic proxy we will use the standard /api/generate endpoint.
        // Some models (like codellama or qwen coder) automatically use suffix if we pass it,
        // or we can construct a typical FIM prompt format if we know the exact model.
        // We'll pass the prompt plainly for now, which gives excellent forward-completion.
        // To use true FIM with Ollama, you pass `suffix` to `/api/generate` and Ollama handles the template.
        
        const ollamaPayload = {
            model: aiModel,
            prompt: prompt,
            suffix: suffix || undefined,
            stream: false,
            options: {
                // keep responses short and fast for inline completions
                num_predict: 64,  
                temperature: 0.2, 
                top_p: 0.9,
                stop: ["\n\n", "```", "<|endoftext|>"] 
            }
        };

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ollamaPayload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        res.json({ completion: data.response });

    } catch (err) {
        console.error('[AI Completion Error]', err.message);
        res.status(500).json({ error: 'Failed to generate completion' });
    }
});

// ── AI CONTEXT BUILDER ──────────────────────────────────────────────────
router.get('/ai/search-context', async (req, res) => {
    const { query, limit } = req.query;
    if (!query) return res.status(400).json({ error: 'query required' });
    
    const countLimit = parseInt(limit || '3');
    try {
        const results = await indexerService.getRelevantFiles(query, countLimit);
        res.json({ results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ai/reindex', async (_req, res) => {
    indexerService.indexWorkspace(); // Runs in background
    res.json({ message: 'Indexing started' });
});

// ── VECTOR SEARCH BRIDGE ───────────────────────────────────────────────
router.get('/ai/vector-search', async (req, res) => {
    const { query, limit } = req.query;
    if (!query) return res.status(400).json({ error: 'query required' });

    try {
        const response = await fetch('http://localhost:5001/vector/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit: parseInt(limit || '5') })
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Vector search failed: ' + e.message });
    }
});

// ── SCREEN ANALYZE BRIDGE ───────────────────────────────────────────────
router.get('/ai/analyze-screen', async (req, res) => {
    try {
        const response = await fetch('http://localhost:5001/screen/analyze');
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Screen analysis failed: ' + e.message });
    }
});

// ── AUTONOMOUS AGENT ENDPOINT ───────────────────────────────────────────
// Streams NDJSON events: { type, ... }
// Event types: step_start | tool_call | tool_result | response | done | error

const BLOCKED_COMMANDS = [
    'rm -rf', 'del /f /s /q', 'format', 'mkfs', 'shutdown', 'reboot',
    'DROP TABLE', 'DROP DATABASE', ':(){:|:&};:', 'dd if='
];

function isSafeCommand(cmd) {
    const lower = cmd.toLowerCase();
    return !BLOCKED_COMMANDS.some(blocked => lower.includes(blocked.toLowerCase()));
}

function isSafePath(targetPath, workspaceRoot) {
    if (!workspaceRoot) return true; // No workspace set — allow all
    const resolved = path.resolve(targetPath);
    const wsResolved = path.resolve(workspaceRoot);
    return resolved.startsWith(wsResolved);
}

const diff = require('diff');

// Extract JSON action blocks from LLM text
function parseAgentActions(text) {
    const actions = [];
    const blockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
    let block;
    let foundJson = false;
    
    while ((block = blockRegex.exec(text)) !== null) {
        foundJson = true;
        try {
            const parsed = JSON.parse(block[1]);
            // Format can be {"mode": "agent", "actions": [{...}]}
            if (parsed && Array.isArray(parsed.actions)) {
                actions.push(...parsed.actions);
            }
        } catch (e) {
            console.error("Failed to parse agent JSON block:", e);
        }
    }

    // Fallback: If no markdown block, try parsing the whole thing if it looks like JSON
    if (!foundJson && text.trim().startsWith('{') && text.trim().endsWith('}')) {
       try {
            const parsed = JSON.parse(text.trim());
            if (parsed && Array.isArray(parsed.actions)) {
                actions.push(...parsed.actions);
            }
        } catch (e) {}
    }

    return actions;
}

async function executeTool(action, workspaceRoot, cwd) {
    const resolvedPath = (p) => {
        if (path.isAbsolute(p)) return p;
        return cwd ? path.join(cwd, p) : path.join(workspaceRoot || process.cwd(), p);
    };

    switch (action.type) {
        case 'read_file':
        case 'readFile': {
            const fp = resolvedPath(action.path);
            if (!isSafePath(fp, workspaceRoot)) throw new Error(`Access denied: ${fp}`);
            return fs.readFileSync(fp, 'utf-8');
        }
        case 'write_file':
        case 'writeFile':
        case 'create_file':
        case 'createFile': {
            const fp = resolvedPath(action.path);
            if (!isSafePath(fp, workspaceRoot)) throw new Error(`Access denied: ${fp}`);
            fs.mkdirSync(path.dirname(fp), { recursive: true });
            fs.writeFileSync(fp, action.content, 'utf-8');
            return `File written: ${fp}`;
        }
        case 'applyDiff': {
            const fp = resolvedPath(action.path);
            if (!isSafePath(fp, workspaceRoot)) throw new Error(`Access denied: ${fp}`);
            if (!fs.existsSync(fp)) throw new Error(`File not found: ${fp}`);
            
            const original = fs.readFileSync(fp, 'utf-8');
            // We expect unified diff format
            const patched = diff.applyPatch(original, action.diff);
            if (patched === false) {
                throw new Error("Failed to apply diff cleanly. The file may have changed or the diff is invalid.");
            }
            fs.writeFileSync(fp, patched, 'utf-8');
            return `Diff applied successfully: ${fp}`;
        }
        case 'delete_file':
        case 'deleteFile': {
            const fp = resolvedPath(action.path);
            if (!isSafePath(fp, workspaceRoot)) throw new Error(`Access denied: ${fp}`);
            fs.unlinkSync(fp);
            return `File deleted: ${fp}`;
        }
        case 'run_command':
        case 'runCommand': {
            if (!isSafeCommand(action.command)) throw new Error(`Blocked dangerous command: ${action.command}`);
            return new Promise((resolve, reject) => {
                exec(action.command, { cwd: cwd || workspaceRoot || process.cwd(), timeout: 30000, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve((stdout + (stderr ? `\nSTDERR: ${stderr}` : '')).trim());
                });
            });
        }
        default:
            return null;
    }
}

router.post('/ai/agent', async (req, res) => {
    const { prompt, projectContext, workspaceRoot, ollamaEndpoint, model, maxIterations } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const OLLAMA_URL = ollamaEndpoint || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const MODEL = model || 'qwen2.5-coder:7b';
    const MAX_ITER = Math.min(parseInt(maxIterations || '8'), 12);

    // SSE / NDJSON streaming setup
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    const emit = (obj) => {
        try { res.write(JSON.stringify(obj) + '\n'); } catch (_) {}
    };

    const SYSTEM_PROMPT = `You are a Cursor-like AI integrated inside a code editor.

You operate in 3 modes:
1. Chat -> Explain and answer
2. Edit -> Modify selected code
3. Agent -> Perform multi-step actions on the project

You have access to tools via structured JSON outut.
Tools:
- readFile (path)
- applyDiff (path, diff) -> diff must be a standard Unified Diff format
- createFile (path, content)
- writeFile (path, content) -> completely overrides a file
- runCommand (command)

IMPORTANT RULES:
- Always read relevant files before editing. NEVER edit blind.
- Never rewrite an entire file using writeFile unless you are creating it from scratch.
- ALWAYS prefer applyDiff for modifying existing files. It is faster and safer.
- Work step-by-step.
- Validate changes by running tests or commands if applicable.

OUTPUT FORMAT (STRICT JSON IN MARKDOWN BLOCK):
You MUST respond with a single JSON block wrapped in \`\`\`json. Do NOT include any text outside this block if you are taking actions.

\`\`\`json
{
  "mode": "agent",
  "plan": "short explanation of what you will do in this step",
  "actions": [
    {
      "type": "readFile",
      "path": "src/App.tsx"
    },
    {
      "type": "applyDiff",
      "path": "src/App.tsx",
      "diff": "--- a/src/App.tsx\\n+++ b/src/App.tsx\\n@@ -1,3 +1,4 @@\\n+import { NewComponent } from './NewComponent';\\n..."
    }
  ],
  "finalMessage": "Optional user-facing message. Leave empty if you need another iteration."
}
\`\`\`

If you are completely finished with the user's task, include an action with type "task_complete" or emit a finalMessage summarizing the result.`;

    let conversationHistory = `${SYSTEM_PROMPT}\n\nProject Context:\n${projectContext || 'No project context provided.'}\n\nUser Task: ${prompt}`;

    try {
        for (let iteration = 0; iteration < MAX_ITER; iteration++) {
            emit({ type: 'step_start', iteration: iteration + 1, maxIterations: MAX_ITER });

            // Call Ollama
            let fullResponse = '';
            try {
                const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: MODEL, prompt: conversationHistory, stream: true }),
                });

                if (!ollamaRes.ok) throw new Error(`Ollama error: ${ollamaRes.status}`);

                const reader = ollamaRes.body;
                let buffer = '';
                for await (const chunk of reader) {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.response) {
                                fullResponse += parsed.response;
                                emit({ type: 'token', content: parsed.response });
                            }
                        } catch (_) {}
                    }
                }
            } catch (ollamaErr) {
                emit({ type: 'error', message: `Failed to reach Ollama: ${ollamaErr.message}` });
                break;
            }

            // Parse AI actions
            const actions = parseAgentActions(fullResponse);
            
            // Check if AI included a finalMessage in the JSON block
            let finalMsg = '';
            try {
               const blockMatch = /```json\s*(\{[\s\S]*?\})\s*```/g.exec(fullResponse);
               if (blockMatch) {
                   const parsed = JSON.parse(blockMatch[1]);
                   if (parsed.finalMessage) finalMsg = parsed.finalMessage;
               } else if (fullResponse.trim().startsWith('{')) {
                   const parsed = JSON.parse(fullResponse.trim());
                   if (parsed.finalMessage) finalMsg = parsed.finalMessage;
               }
            } catch (e) {}

            if (actions.length === 0 || actions.some(a => a.type === 'task_complete')) {
                // AI is done — emit the response and finish
                emit({ type: 'response', content: finalMsg || fullResponse });
                emit({ type: 'done', iterations: iteration + 1 });
                return res.end();
            }

            // Execute each tool action
            let toolResultsBlock = '\n\nTool Results:\n';
            for (const action of actions) {
                if (action.type === 'task_complete') {
                    emit({ type: 'response', content: finalMsg || fullResponse });
                    emit({ type: 'done', iterations: iteration + 1 });
                    return res.end();
                }

                emit({ type: 'tool_call', action });

                try {
                    const result = await executeTool(action, workspaceRoot, workspaceRoot);
                    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                    emit({ type: 'tool_result', action, result: resultStr, success: true });
                    toolResultsBlock += `[${action.type}${action.path ? ` → ${action.path}` : ''}]\n${resultStr}\n\n`;
                } catch (toolErr) {
                    emit({ type: 'tool_result', action, result: toolErr.message, success: false });
                    toolResultsBlock += `[${action.type} ERROR: ${toolErr.message}]\n\n`;
                }
            }

            // Append response + results to conversation for next iteration
            conversationHistory += `\n\nAssistant: ${fullResponse}\n${toolResultsBlock}\nContinue the task. Output your next step as strict JSON. If complete, include "type": "task_complete" in actions or provide a finalMessage.`;
        }

        // Max iterations reached
        emit({ type: 'done', iterations: MAX_ITER, warning: 'Max iterations reached' });
        res.end();
    } catch (err) {
        emit({ type: 'error', message: err.message });
        res.end();
    }
});

module.exports = router;
