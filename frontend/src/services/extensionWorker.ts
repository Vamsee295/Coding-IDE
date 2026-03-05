/**
 * extensionWorker.ts
 * 
 * Web Worker sandbox for running extension scripts in isolation.
 * 
 * Usage (from main thread):
 *   const worker = new ExtensionWorker(extensionId, scriptCode);
 *   worker.onMessage(msg => { ... }); // receive messages from extension
 *   worker.send('event', { ... });    // send events to extension
 *   worker.terminate();               // kill the worker
 */

const WORKER_BOOTSTRAP = `
// Extension Worker Sandbox
// Provides a safe API for extensions to interact with the IDE.

const ideApi = {
    registerCommand: (commandId, title) => {
        postMessage({ type: 'registerCommand', commandId, title });
    },
    showMessage: (message, level = 'info') => {
        postMessage({ type: 'showMessage', message, level });
    },
    writeFile: (path, content) => {
        postMessage({ type: 'writeFile', path, content });
    },
    readFile: (path) => {
        postMessage({ type: 'readFile', path });
        // Return a Promise that resolves when the main thread responds
        return new Promise(resolve => {
            self._pendingReads = self._pendingReads || {};
            const id = Date.now().toString();
            self._pendingReads[id] = resolve;
            postMessage({ type: 'readFileRequest', path, id });
        });
    },
    executeCommand: (commandId, ...args) => {
        postMessage({ type: 'executeCommand', commandId, args });
    }
};

self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    
    // Handle responses to readFile requests
    if (type === 'readFileResponse' && self._pendingReads) {
        const { id, content } = data || {};
        if (self._pendingReads[id]) {
            self._pendingReads[id](content);
            delete self._pendingReads[id];
        }
        return;
    }
    
    // Forward events to the extension's activate handler
    if (typeof self._extensionActivate === 'function') {
        self._extensionActivate({ type, data });
    }
});

// Export the ide API for extension scripts to use
self.ide = ideApi;
`;

type WorkerMessage = {
    type: string;
    [key: string]: any;
};

type MessageListener = (msg: WorkerMessage) => void;

export class ExtensionWorker {
    private worker: Worker;
    private listeners: MessageListener[] = [];
    private extensionId: string;

    constructor(extensionId: string, scriptCode: string) {
        this.extensionId = extensionId;

        // Combine bootstrap + extension script
        const fullScript = WORKER_BOOTSTRAP + '\n\n' + scriptCode;
        const blob = new Blob([fullScript], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        this.worker = new Worker(url);

        this.worker.onmessage = (event) => {
            const msg = event.data as WorkerMessage;
            this.listeners.forEach(l => l(msg));
        };

        this.worker.onerror = (err) => {
            console.error(`[ExtensionWorker:${this.extensionId}] Error:`, err.message);
            this.listeners.forEach(l => l({ type: 'error', message: err.message }));
        };

        // Revoke the blob URL after it's loaded
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /** Subscribe to messages from the extension worker */
    onMessage(listener: MessageListener) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    /** Send a message to the extension worker */
    send(type: string, data?: any) {
        this.worker.postMessage({ type, data });
    }

    /** Terminate the worker */
    terminate() {
        this.worker.terminate();
        console.log(`[ExtensionWorker:${this.extensionId}] Terminated`);
    }
}
