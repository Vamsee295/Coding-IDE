import * as monaco from 'monaco-editor';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { normalizeUrl } from 'vscode-ws-jsonrpc/lib/utils';
import { CONFIG } from '../react-app/lib/config';

let languageClient: MonacoLanguageClient | null = null;
let webSocket: WebSocket | null = null;

// Extracted from CONFIG, change http:// to ws://
const getLspUrl = () => {
    try {
        const url = new URL(CONFIG.TERMINAL_API_URL || 'http://localhost:8082');
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = '/lsp';
        return url.toString();
    } catch (e) {
        return 'ws://localhost:8082/lsp';
    }
};

/**
 * Connects the Monaco Editor to the TypeScript Language Server over WebSockets
 */
export const connectLanguageServer = (editor: monaco.editor.IStandaloneCodeEditor, languageId: string) => {
    // Only TS/JS supported by our backend right now
    if (languageId !== 'typescript' && languageId !== 'javascript') {
        return;
    }

    // Disconnect existing
    if (languageClient) {
        languageClient.dispose();
        languageClient = null;
    }
    if (webSocket) {
        webSocket.close();
        webSocket = null;
    }

    const url = getLspUrl();
    webSocket = new WebSocket(url);

    webSocket.onopen = () => {
        console.log(`[LSP] Connected to Language Server at ${url}`);
        
        const socket = toSocket(webSocket as any);
        const reader = new WebSocketMessageReader(socket);
        const writer = new WebSocketMessageWriter(socket);

        languageClient = createLanguageClient({
            reader,
            writer
        });

        languageClient.start().then(() => {
            console.log('[LSP] Language Client started successfully');
        }).catch(e => {
            console.error('[LSP] Failed to start language client:', e);
        });
    };

    webSocket.onerror = (error) => {
        console.error('[LSP] WebSocket connection error:', error);
    };
};

export const disconnectLanguageServer = () => {
    if (languageClient) {
        languageClient.dispose();
        languageClient = null;
    }
    if (webSocket) {
        webSocket.close();
        webSocket = null;
    }
    console.log('[LSP] Disconnected');
};

function createLanguageClient(connection: any): MonacoLanguageClient {
    return new MonacoLanguageClient({
        name: 'TypeScript Language Client',
        clientOptions: {
            documentSelector: ['typescript', 'javascript'],
            errorHandler: {
                error: () => ({ action: 1 }),
                closed: () => ({ action: 1 })
            }
        },
        connectionProvider: {
            get: () => {
                return Promise.resolve(connection);
            }
        }
    });
}
