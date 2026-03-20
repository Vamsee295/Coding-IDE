const path = require('path');
const fs = require('fs');

/**
 * Service to manage the global workspace root in the Node.js process.
 */
class WorkspaceService {
    constructor() {
        this.workspaceRoot = null;
    }

    setWorkspaceRoot(rootPath) {
        if (!rootPath) {
            this.workspaceRoot = null;
            return;
        }

        const normalized = path.resolve(rootPath);
        if (fs.existsSync(normalized) && fs.statSync(normalized).isDirectory()) {
            this.workspaceRoot = normalized;
            console.log(`[WorkspaceService] Root set to: ${this.workspaceRoot}`);
        } else {
            console.error(`[WorkspaceService] Invalid workspace path: ${rootPath}`);
        }
    }

    getWorkspaceRoot() {
        return this.workspaceRoot;
    }

    /**
     * Helper to verify if a path is inside the workspace.
     */
    isPathAllowed(targetPath) {
        if (!this.workspaceRoot) return true; // Fail-open for now? Or fail-closed? Better fail-closed if set.
        
        try {
            const absoluteTarget = path.resolve(targetPath);
            return absoluteTarget.startsWith(this.workspaceRoot);
        } catch (e) {
            return false;
        }
    }
}

module.exports = new WorkspaceService();
