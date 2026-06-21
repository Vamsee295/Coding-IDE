## Terminal Server Analysis

The Node.js `terminal-server` serves as the primary gateway for host interactions in the IDE, completely bypassing the Java backend for terminal and system access.

### Endpoints
- **System**: `/health`, `/user-home`, `/pick-folder`, `/clone`, `/ports`
- **Workspace**: `/workspace/set`, `/workspace/get`
- **Git**: `/git/status`, `/git/init`, `/git/stage`, `/git/unstage`, `/git/commit`
- **AI**: `/ai/complete`, `/ai/search-context`, `/ai/reindex`, `/ai/vector-search`, `/ai/analyze-screen`, `/ai/agent`
- **Debug**: `/debug/eval`
- **VSCode Extensions**: `/vscode-extensions`, `/vscode-extensions/imported`, `/vscode-extensions/:id/details`, `/vscode-extensions/icon/:id`, `/vscode-extensions/import` (POST/DELETE)

### Sockets
Handles WebSockets (Socket.IO and pure WS) via port 8082 for the Terminal and Language Server Protocol (LSP).

### Dependencies
- Express, Socket.IO, `node-pty` (core terminal execution component).
- `chokidar`, `diff`, `uuid`, `vscode-ws-jsonrpc`, `typescript-language-server`
- All specified dependencies in `package.json` appear to be utilized or standard for this feature set.

### Usage
- The frontend connects specifically to this node server running on port 8082 for terminal connections (via `ws://localhost:8082`).
- As determined, it has fully replaced the Java `TerminalWebSocketHandler`.
