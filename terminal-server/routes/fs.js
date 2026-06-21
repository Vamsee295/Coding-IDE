const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const router = express.Router();

const isPathAllowed = (targetPath) => {
    // Ideally we check against workspace roots, but as a local desktop IDE
    // we ensure path is valid and absolute if required.
    return true; // Simplified for desktop local-first environment
};

router.get('/exists', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Path is required');
    try {
        const stats = fs.statSync(targetPath);
        res.json({ exists: true, isDirectory: stats.isDirectory(), name: path.basename(targetPath) });
    } catch (e) {
        res.json({ exists: false });
    }
});

router.get('/list', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Path is required');

    try {
        const items = fs.readdirSync(targetPath, { withFileTypes: true });
        const list = items.map(item => ({
            name: item.name,
            path: path.join(targetPath, item.name),
            isDirectory: item.isDirectory()
        }));
        res.json({
            items: list.map(item => ({
                name: item.name,
                path: item.path,
                type: item.isDirectory ? "folder" : "file"
            })),
            truncated: false,
            totalCount: list.length
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/read', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Path is required');
    try {
        const content = fs.readFileSync(targetPath, 'utf-8');
        res.send(content);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

router.post('/write', (req, res) => {
    const { path: targetPath, content } = req.body;
    if (!targetPath) return res.status(400).send('Path is required');
    try {
        fs.writeFileSync(targetPath, content, 'utf-8');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/createFolder', (req, res) => {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).send('Path is required');
    try {
        fs.mkdirSync(targetPath, { recursive: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/delete', (req, res) => {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Path is required');
    try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/rename', (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).send('Paths are required');
    try {
        fs.renameSync(oldPath, newPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/search', async (req, res) => {
    const { query, rootPath, regex } = req.query;
    if (!query || !rootPath) return res.status(400).send('Query and rootPath are required');

    try {
        const results = [];
        const isRegex = regex === 'true';
        let searchPattern;

        try {
            searchPattern = isRegex ? new RegExp(query, 'g') : query;
        } catch (err) {
            return res.status(400).send('Invalid regex pattern');
        }

        const walkDir = async (dir) => {
            let files;
            try {
                files = await fs.promises.readdir(dir, { withFileTypes: true });
            } catch (err) {
                return;
            }

            for (const file of files) {
                const resPath = path.join(dir, file.name);

                // Skip common large/binary directories to avoid hanging the process
                if (['node_modules', '.git', 'dist', 'build'].includes(file.name)) continue;

                if (file.isDirectory()) {
                    await walkDir(resPath);
                } else if (file.isFile()) {
                    try {
                        const content = await fs.promises.readFile(resPath, 'utf-8');
                        const lines = content.split('\n');

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            let isMatch = false;

                            if (isRegex) {
                                isMatch = searchPattern.test(line);
                                // reset regex index
                                searchPattern.lastIndex = 0;
                            } else {
                                isMatch = line.includes(searchPattern);
                            }

                            if (isMatch) {
                                results.push({
                                    path: resPath,
                                    line: i + 1,
                                    content: line.trim()
                                });
                            }
                        }
                    } catch (err) {
                        // ignore unreadable or binary files safely
                    }
                }
            }
        };

        await walkDir(rootPath);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
