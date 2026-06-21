
## Duplicate Implementation & Dead Code Analysis

This section answers high-priority questions regarding duplication and active usage of the stack components.

### 1. Is python-backend currently used?
**YES.** The `terminal-server` directly communicates with it on `http://localhost:5001`. Specifically, `indexerService.js` indexes files into it, and `api.js` queries it for context and screen analysis.

### 2. Is Spring TerminalWebSocketHandler still active?
**NO.** The Java class `TerminalWebSocketHandler` exists and is registered in the Spring configuration, but the frontend explicitly connects to the Node.js terminal server (`ws://localhost:8082`) for all terminal events. This makes the Java implementation **Dead Code**.

### 3. Has terminal-server fully replaced the Java terminal?
**YES.** The entire suite of terminal, workspace, Git, file watching, and Language Server Protocol (LSP) functionality has been offloaded to the Node.js `terminal-server`. The Java backend's `FileSystemController` and `WorkspaceController` are largely bypassed in favor of native FS APIs and the Node.js server.

### 4. Are there multiple Ollama integration paths?
**YES.** There is significant duplication in Ollama integration:
- **Java Backend**: Contains `OllamaService.java` and `OllamaProxyController.java` with routes for `/generate`, `/models`, `/pull`, `/stream`.
- **Frontend Native**: Connects directly to Ollama in some files (e.g. `SettingsView.tsx` fetching `http://localhost:11434/api/tags`).
- **Terminal Server**: Implements AI completion (`/ai/complete`), search context, and AI agent routes (`/ai/agent`).

### 5. Are there duplicate AI implementations?
**YES.** The `backend` Java code has an entire `ai` package (`AgentService`, `ContextService`, `ToolExecutor`), while the `terminal-server` and frontend (e.g., `agentService.ts`, `aiOrchestrator.ts`) also implement agentic AI loops. The terminal-server seems to be the active one.

### 6. Are there duplicate file-system implementations?
**YES.**
- **Frontend**: Uses the browser's native File System Access API (`fsService.ts` / `fileSystemHelper.ts`).
- **Java Backend**: Implements a `FileSystemController`.
- **Terminal Server**: Implements file watching (`chokidar`) and serves files for LSP.

### 7. Are there duplicate WebSocket implementations?
**YES.**
- **Java Backend**: Configures WebSockets (`ws://localhost:8081/ws/terminal`).
- **Terminal Server**: Uses `socket.io` and pure `ws` on port 8082 for terminal and debug streams.
The frontend strictly uses the Node.js terminal-server.

### Dead Code Summary
#### Level 1 (Unused Files/Classes)
- `backend/src/main/java/com/example/ide/websocket/TerminalWebSocketHandler.java`
- Most of the Java `FileSystemController` and `WorkspaceController` are bypassed.
- Java `OllamaProxyController` and AI services appear partially abandoned in favor of the Node.js server.
- Several frontend UI components and utilities are unused (as outputted by `knip`).

#### Level 2 (Feature Remnants)
- Legacy AI Pull API calls in frontend pointing to the Java backend instead of Ollama directly or the Node server.
- Tauri CLI and `wrangler` config in the frontend suggest abandoned desktop and edge deployment experiments.
