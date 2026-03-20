const fs = require('fs');
const path = require('path');
const workspaceService = require('./workspaceService');

/**
 * Basic File Indexer for AI Context.
 * Scans the workspace and provides a way to find relevant code snippets.
 */
class IndexerService {
    constructor() {
        this.index = []; // Array of { name, path, extension, lastModified }
        this.isIndexing = false;
    }

    async indexWorkspace() {
        const root = workspaceService.getWorkspaceRoot();
        if (!root) return;

        console.log(`[IndexerService] Indexing workspace: ${root}`);
        this.isIndexing = true;
        this.index = [];

        try {
            // Clear existing vector index before re-indexing
            await fetch('http://localhost:5001/vector/clear', { method: 'POST' }).catch(() => { });
            
            await this.scanDir(root);
            console.log(`[IndexerService] Indexed ${this.index.length} files.`);
        } catch (err) {
            console.error(`[IndexerService] Indexing failed:`, err);
        } finally {
            this.isIndexing = false;
        }
    }

    async scanDir(dir) {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            // Skip common ignored directories
            if (entry.isDirectory()) {
                const name = entry.name.toLowerCase();
                if (['node_modules', '.git', 'target', 'build', 'dist', '.next', 'out'].includes(name) || name.startsWith('.')) {
                    continue;
                }
                await this.scanDir(fullPath);
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                // Only index text-based code files
                const codeExts = ['.js', '.ts', '.tsx', '.jsx', '.java', '.py', '.css', '.html', '.md', '.json', '.txt', '.go', '.rs', '.cpp', '.h'];
                
                if (codeExts.includes(ext)) {
                    const fileData = {
                        name: entry.name,
                        path: fullPath,
                        extension: ext,
                        lastModified: (await fs.promises.stat(fullPath)).mtimeMs
                    };
                    this.index.push(fileData);

                    // Add to Vector DB for semantic search
                    try {
                        const content = await fs.promises.readFile(fullPath, 'utf-8');
                        if (content.length < 50000) { // Safety: don't embed massive files
                            await fetch('http://localhost:5001/vector/add', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path: fullPath, content })
                            });
                        }
                    } catch (e) {
                        console.error(`[IndexerService] Failed to embed ${fullPath}:`, e.message);
                    }
                }
            }
        }
    }

    /**
     * Find relevant files based on a query (filename match or extension)
     */
    async getRelevantFiles(query, limit = 5) {
        if (!query) return [];
        
        const lowerQuery = query.toLowerCase();
        
        // Simple scoring: filename contains query > path contains query
        const results = this.index
            .map(file => {
                let score = 0;
                if (file.name.toLowerCase().includes(lowerQuery)) score += 10;
                if (file.path.toLowerCase().includes(lowerQuery)) score += 5;
                return { ...file, score };
            })
            .filter(f => f.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // Read content for the top matches
        const filesWithContent = await Promise.all(results.map(async f => {
            try {
                const content = await fs.promises.readFile(f.path, 'utf-8');
                return {
                    path: f.path,
                    name: f.name,
                    content: content.length > 2000 ? content.substring(0, 2000) + '... (truncated)' : content
                };
            } catch (e) {
                return null;
            }
        }));

        return filesWithContent.filter(Boolean);
    }
}

module.exports = new IndexerService();
