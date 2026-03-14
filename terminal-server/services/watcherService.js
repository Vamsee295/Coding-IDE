const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const outputBuffer = require('./outputBuffer');

class WatcherService {
    constructor() {
        this.watchers = {}; // socketId -> { watcher, rootPath }
    }

    stopWatcher(socketId) {
        const entry = this.watchers[socketId];
        if (!entry) return;
        entry.watcher.close();
        delete this.watchers[socketId];
        console.log(`[FileWatcher] Stopped watching for socket ${socketId}`);
    }

    startWatcher(socketId, rootPath, socket) {
        if (!rootPath || !fs.existsSync(rootPath)) return;

        // Stop any existing watcher for this socket
        this.stopWatcher(socketId);

        console.log(`[FileWatcher] Watching: ${rootPath}`);
        outputBuffer.pushLog('FileWatcher', 'info', `Watching workspace: ${rootPath}`);

        const watcher = chokidar.watch(rootPath, {
            ignored: [
                /(^|[\/\\])\../, // dotfiles
                '**/node_modules/**',
                '**/target/**',
                '**/build/**',
                '**/dist/**',
                '**/.git/**',
            ],
            persistent: true,
            ignoreInitial: true,
            depth: 10,
            awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
        });

        // Debounce: batch events in 200ms windows
        let pendingEvents = [];
        let flushTimeout = null;

        const flushEvents = () => {
            if (pendingEvents.length === 0) return;
            const batch = [...pendingEvents];
            pendingEvents = [];
            socket.emit('fs-change', { events: batch });
        };

        const queueEvent = (type, filePath) => {
            const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');
            pendingEvents.push({ type, path: filePath, relativePath, timestamp: Date.now() });
            if (flushTimeout) clearTimeout(flushTimeout);
            flushTimeout = setTimeout(flushEvents, 200);
        };

        watcher
            .on('add', (p) => queueEvent('add', p))
            .on('change', (p) => queueEvent('change', p))
            .on('unlink', (p) => queueEvent('unlink', p))
            .on('addDir', (p) => queueEvent('addDir', p))
            .on('unlinkDir', (p) => queueEvent('unlinkDir', p));

        this.watchers[socketId] = { watcher, rootPath };
    }
    
    stopAllWatchers() {
        Object.keys(this.watchers).forEach(id => this.stopWatcher(id));
    }
}

// Export as a singleton
module.exports = new WatcherService();
