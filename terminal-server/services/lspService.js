const { spawn } = require('child_process');
const ws = require('ws');
const rpc = require('vscode-ws-jsonrpc');
const server = require('vscode-ws-jsonrpc/server');
const outputBuffer = require('./outputBuffer');

function setupLsp(serverHttp) {
    const wss = new ws.Server({
        noServer: true,
        perMessageDeflate: false
    });

    serverHttp.on('upgrade', (request, socket, head) => {
        if (request.url === '/lsp') {
            wss.handleUpgrade(request, socket, head, webSocket => {
                const socket = {
                    send: content => webSocket.send(content, error => {
                        if (error) { throw error; }
                    }),
                    onMessage: cb => webSocket.on('message', cb),
                    onError: cb => webSocket.on('error', cb),
                    onClose: cb => webSocket.on('close', cb),
                    dispose: () => webSocket.close()
                };

                // Accept the incoming frontend connection
                if (webSocket.readyState === webSocket.OPEN) {
                    launchLanguageServer(socket);
                } else {
                    webSocket.on('open', () => launchLanguageServer(socket));
                }
            });
        }
    });

    function launchLanguageServer(socket) {
        const reader = new rpc.WebSocketMessageReader(socket);
        const writer = new rpc.WebSocketMessageWriter(socket);
        
        // Spawn typescript-language-server
        const lspProcess = spawn(
            'node',
            [
                require.resolve('typescript-language-server/lib/cli.mjs'),
                '--stdio',
                '--tsserver-path',
                require.resolve('typescript/lib/tsserver.js')
            ],
            { env: process.env }
        );

        outputBuffer.pushLog('LSP', 'info', `TypeScript Language Server spawned (PID: ${lspProcess.pid})`);

        const serverConnection = server.createConnection(reader, writer, () => lspProcess.kill());
        const lspConnection = server.createProcessStreamConnection(lspProcess);

        server.forward(serverConnection, lspConnection, message => {
            if (rpc.isRequestMessage(message)) {
                if (message.method === 'initialize') {
                    // Inject root properties if the client didn't provide them
                    if (message.params && !message.params.rootUri && !message.params.rootPath) {
                        message.params.rootUri = null;
                        message.params.workspaceFolders = null;
                    }
                }
            }
            return message;
        });

        lspProcess.on('exit', code => {
            outputBuffer.pushLog('LSP', 'info', `LSP Process excited with code ${code}`);
        });
    }

    console.log('[Server] LSP WebSocket registered on /lsp');
}

module.exports = setupLsp;
