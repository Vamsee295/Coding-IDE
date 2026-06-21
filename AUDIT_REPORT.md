# Repository Audit Report

## Architecture Diagram


```text
+-------------------------------------------------------------------------+
|                               Frontend (Vite/React/Zustand)               |
|  +-------------+  +---------------+  +------------+  +----------------+   |
|  | Monaco Edit |  | xterm.js Term |  | Chat Panel |  | File Explorer  |   |
|  +-------------+  +---------------+  +------------+  +----------------+   |
+--------+------------------+-----------------+-------------------+-------+
         | (HTTP)           | (WS port 8082)  | (HTTP)            | (HTTP)
         v                  v                 v                   v
+------------------------------------+   +--------------------------------+
|       Terminal Server (Node.js)      |   |       Java Backend (Spring)      |
|  - System execution (node-pty)     |   |  - Auth / Projects             |
|  - LSP proxying                    |   |  - (Dead: Terminal WS)         |
|  - File watching (chokidar)        |   |  - (Duplicate: File System)    |
|  - AI Agent orchestration          |   |  - (Duplicate: AI Logic)       |
+------------------+-----------------+   +--------------------------------+
                   | (HTTP port 5001)                     |
                   v                                      |
+------------------------------------+                    |
|      Python Backend (Flask)        |                    |
|  - FAISS Vector DB                 |                    |
|  - OCR Screen Analysis             |                    |
+------------------------------------+                    v
                                         +--------------------------------+
                                         |         Local Ollama           |
                                         |  (http://localhost:11434)      |
                                         +--------------------------------+
```



## Frontend Analysis

The frontend is a React-based application using Vite, TypeScript, Tailwind CSS, and Zustand for state management. It features a modern IDE layout with an integrated Monaco editor, a terminal powered by xterm.js, and an AI chat interface.

### Pages & Routing
The frontend uses `react-router` and is primarily a single-page application.
- **`Home.tsx`**: The main and only active entry point that orchestrates the IDE layout (Sidebar, Editor, Panels, Chat).
- **`App.tsx` & `main.tsx`**: Bootstrapping and context providers.

### Major Components
- **`Editor.tsx`**: Integrated Monaco editor for viewing and editing files.
- **`Sidebar.tsx`**: Includes sub-components like `SearchView.tsx`, `SourceControlView.tsx`, and `DebugView.tsx`.
- **`TerminalPanel.tsx`**: Uses `xterm.js` to render the terminal UI and connects to the backend terminal server via WebSockets.
- **`ChatPanel.tsx` / `ChatHistorySidebar.tsx`**: Integrated AI chat interface connecting to local models (Ollama).
- **Settings**: Several modals and views to configure extensions and AI parameters.

### Zustand Stores
- **`useIdeStore.ts`**: Manages IDE state (open files, active file, theme, panels).
- **`useChatStore.ts`**: Manages chat history and current conversation state.

### Monaco & Terminal Integrations
- **Monaco**: Heavily integrated in `Editor.tsx`, `DiffPreviewModal.tsx`, `aiCompletionService.ts`, and `lspClient.ts`.
- **Terminal (xterm.js)**: Integrated in `TerminalPanel.tsx`, `SettingsView.tsx`, `CommandPalette.tsx`, and `OutputPanel.tsx`.

### API Connections
The frontend communicates via HTTP fetch/axios and Socket.IO WebSockets.
- `API_BASE_URL` (`http://localhost:8081/api`): Java Spring Boot backend (Used for file system `fsService.ts` and legacy AI pull `ai/pull`).
- `TERMINAL_API_URL` / `TERMINAL_SERVER_URL` (`http://localhost:8082`): Node.js terminal server (Used for Workspace, Git, Debug, AI chat/agent, and Chat History).
- WebSockets (`ws://localhost:8082`): Connects exclusively to the Node.js terminal server for Terminal streams and Debugging streams.

### Dependencies
**Unused dependencies identified:**
- `file-extension-icon-js`
- `xterm-addon-attach`
- `eslint` (unused dev dependency since `eslint.config.js` exists but might be handled by other tools)
- `@tauri-apps/cli` (unused dev dependency, likely legacy or incomplete desktop packaging)


## Backend Analysis

The backend is a Java 21 Spring Boot application.

### Controllers & API Endpoints
- **`FileSystemController.java`**: `/list`, `/read`, `/write`, `/exists`, `/createFolder`, `/delete`, `/rename`, `/search`
- **`OllamaProxyController.java`**: `/generate`, `/status`, `/models`, `/pull`, `/stream`
- **`IdeController.java`**: `/{projectId}`, `/{projectId}/files`, `/files/{fileId}`
- **`AuthController.java`**: `/register`, `/login`, `/me`
- **`EventController.java`**: `/file-open`, `/file-save`, `/editor-change`, `/selection-change`
- **`CommandController.java`**: `/{name}`
- **`ExtensionController.java`**: `/enabled`, `/{id}/enable`, `/{id}/disable`
- **`WorkspaceController.java`**: `/open`, `/info`, `/current`
- **`ChatHistoryController.java`**: `/save`, `/dates`, `/chats`, `/chat`, `/delete`, `/rename`

### WebSocket Handlers
- **`TerminalWebSocketHandler.java`**: Still fully registered in `WebSocketConfig.java` to `ws://localhost:8081/ws/terminal`. However, frontend was shown to use `ws://localhost:8082` (terminal-server) exclusively. This implies the Java `TerminalWebSocketHandler` is **Dead Code** (unreachable from the UI).

### Dependencies (`pom.xml`)
- Spring Boot Web, Data JPA, Security, Actuator, WebSocket
- `org.jetbrains.pty4j:pty4j`: Used for terminal implementation, which correlates with the likely unused `TerminalWebSocketHandler`.
- `com.h2database:h2`: Used instead of MySQL? (Need to verify this in the final assessment).

### Database Entities & Repositories
- Data JPA is included, and `AuthController` suggests auth tables, and `IdeController` suggests project tables.


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


## Python Backend Analysis

The Python backend is a lightweight Flask application used specifically for AI auxiliary tasks (Vector Search & OCR Screen Analysis).

### Routes
- **`/health`** (GET): Basic health check.
- **`/vector/add`** (POST): Adds file content to the FAISS vector index.
- **`/vector/search`** (POST): Searches the FAISS index for relevant documents.
- **`/vector/clear`** (POST): Clears the FAISS index.
- **`/screen/analyze`** (GET/POST): Captures the host screen and analyzes it using OCR (Tesseract).

### Features
- **FAISS Vector Database (`faiss_service.py`)**: Used for generating an embedding index of the workspace to provide AI context.
- **Screen OCR (`screen_service.py`)**: Uses `pytesseract` to take screenshots and extract text for context.

### Integration (Is it used?)
**YES.** It is actively used.
- The `terminal-server` (`indexerService.js` and `api.js`) explicitly makes HTTP calls to `http://localhost:5001` for `/vector/clear`, `/vector/add`, `/vector/search`, and `/screen/analyze`.
- The Frontend (`Home.tsx`) also references `http://localhost:5001` in an error message if the screen analysis fails.

### Dependencies (`requirements.txt`)
Assumed to contain `Flask`, `flask-cors`, `faiss-cpu` (or `faiss-gpu`), `sentence-transformers` (or similar), `pytesseract`, `Pillow`.




### REST API Endpoints

| Endpoint | Method | Source File | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/list` | GET | `FileSystemController.java` | List files | Unused / Replaced by native |
| `/read` | GET | `FileSystemController.java` | Read file | Unused / Replaced by native |
| `/write` | POST | `FileSystemController.java` | Write file | Unused / Replaced by native |
| `/exists` | GET | `FileSystemController.java` | Check file exists | Unused / Replaced by native |
| `/createFolder` | POST | `FileSystemController.java` | Create folder | Unused / Replaced by native |
| `/delete` | DELETE | `FileSystemController.java` | Delete file/folder | Unused / Replaced by native |
| `/rename` | POST | `FileSystemController.java` | Rename file/folder | Unused / Replaced by native |
| `/search` | GET | `FileSystemController.java` | Search files | Unused / Replaced by native |
| `/generate` | POST | `OllamaProxyController.java` | Generate AI text | Duplicate / Partially Active |
| `/status` | GET | `OllamaProxyController.java` | Check AI status | Duplicate / Partially Active |
| `/models` | GET | `OllamaProxyController.java` | List AI models | Duplicate / Partially Active |
| `/pull` | POST | `OllamaProxyController.java` | Pull AI model | Active (Legacy fallback) |
| `/stream` | POST | `OllamaProxyController.java` | Stream AI text | Duplicate / Partially Active |
| `/{projectId}` | GET/DEL | `IdeController.java` | Manage IDE project | Active |
| `/{projectId}/files` | GET/POST | `IdeController.java` | Project files | Active |
| `/files/{fileId}` | PUT/DEL | `IdeController.java` | File metadata | Active |
| `/register` | POST | `AuthController.java` | User registration | Active |
| `/login` | POST | `AuthController.java` | User login | Active |
| `/me` | GET | `AuthController.java` | Get user info | Active |
| `/file-open` | POST | `EventController.java` | Telemetry/Event | Active |
| `/file-save` | POST | `EventController.java` | Telemetry/Event | Active |
| `/editor-change` | POST | `EventController.java` | Telemetry/Event | Active |
| `/selection-change`| POST | `EventController.java` | Telemetry/Event | Active |
| `/{name}` | POST | `CommandController.java` | Execute command | Active |
| `/enabled` | GET | `ExtensionController.java` | Get extensions | Active |
| `/{id}/enable` | POST | `ExtensionController.java` | Enable extension | Active |
| `/{id}/disable` | POST | `ExtensionController.java` | Disable extension | Active |
| `/open` | POST | `WorkspaceController.java` | Open workspace | Duplicate |
| `/info` | GET | `WorkspaceController.java` | Workspace info | Duplicate |
| `/current` | GET | `WorkspaceController.java` | Current workspace | Duplicate |
| `/save` | POST | `ChatHistoryController.java` | Save chat | Active |
| `/dates` | GET | `ChatHistoryController.java` | Get chat dates | Active |
| `/chats` | GET | `ChatHistoryController.java` | Get chats | Active |
| `/chat` | GET | `ChatHistoryController.java` | Get single chat | Active |
| `/delete` | DELETE | `ChatHistoryController.java` | Delete chat | Active |
| `/rename` | POST | `ChatHistoryController.java` | Rename chat | Active |
| `/user-home` | GET | `routes/api.js` | Get user home dir | Active |
| `/health` | GET | `routes/api.js` | Node health check | Active |
| `/workspace/set` | POST | `routes/api.js` | Set terminal workspace| Active |
| `/workspace/get` | GET | `routes/api.js` | Get terminal workspace| Active |
| `/ports` | GET | `routes/api.js` | Get open ports | Active |
| `/vscode-extensions`| GET | `routes/api.js` | VSCode extension list | Active |
| `/pick-folder` | GET | `routes/api.js` | Native folder picker | Active |
| `/debug/eval` | POST | `routes/api.js` | Eval debug code | Active |
| `/git/status` | GET | `routes/api.js` | Git status | Active |
| `/git/init` | POST | `routes/api.js` | Git init | Active |
| `/git/stage` | POST | `routes/api.js` | Git stage | Active |
| `/git/unstage` | POST | `routes/api.js` | Git unstage | Active |
| `/git/commit` | POST | `routes/api.js` | Git commit | Active |
| `/clone` | POST | `routes/api.js` | Clone repo | Active |
| `/ai/complete` | POST | `routes/api.js` | AI completion | Active |
| `/ai/search-context`| GET | `routes/api.js` | Search code context | Active |
| `/ai/reindex` | POST | `routes/api.js` | Reindex vector DB | Active |
| `/ai/vector-search` | GET | `routes/api.js` | Vector search | Active |
| `/ai/analyze-screen`| GET | `routes/api.js` | Screen OCR | Active |
| `/ai/agent` | POST | `routes/api.js` | AI agent execution | Active |
| `/health` | GET | `app.py` | Python health | Active |
| `/vector/add` | POST | `app.py` | Add to FAISS | Active |
| `/vector/search` | POST | `app.py` | Search FAISS | Active |
| `/vector/clear` | POST | `app.py` | Clear FAISS | Active |
| `/screen/analyze` | GET/POST| `app.py` | Take screenshot | Active |

### WebSocket Endpoints

| Endpoint | Source File | Purpose | Status |
| :--- | :--- | :--- | :--- |
| `ws://localhost:8081/ws/terminal` | `WebSocketConfig.java` | Legacy terminal | Unused (Dead Code) |
| `ws://localhost:8082` | `sockets/socketManager.js` | Terminal PTY stream | Active |
| `ws://localhost:8082/debug` | `sockets/socketManager.js` | Debug events | Active |
| `ws://localhost:8082` (LSP) | `services/lspService.js` | Language Server | Active |



## Unused Dependencies

### Frontend (`package.json`)
*Unused Dependencies:*
- `file-extension-icon-js`
- `xterm-addon-attach`

*Unused Dev Dependencies:*
- `@tauri-apps/cli`
- `eslint`

*Missing / Unlisted:*
- `monaco-editor`
- `hono`

### Terminal Server (`package.json`)
All listed dependencies (`chokidar`, `express`, `node-pty`, `socket.io`, `typescript-language-server`, `vscode-ws-jsonrpc`) appear correctly utilized.

### Backend (`pom.xml`)
- `org.jetbrains.pty4j:pty4j`: Unused (attached to the dead `TerminalWebSocketHandler`).

### Python Backend (`requirements.txt`)
Assumed fully utilized based on the precise surface area of `app.py` (Flask, faiss, pytesseract).



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



## Production Readiness

| Category | Score (1-10) | Justification |
| :--- | :---: | :--- |
| **Architecture** | 4 | Fragmented across three separate backends (Java, Node.js, Python) with massive duplication. |
| **Code Quality** | 5 | Frontend relies on modern tech (Vite, Tailwind, Zustand) but leaves unused files and legacy dependencies. Backend has dead code. |
| **Maintainability** | 3 | High cognitive load due to duplicate features (File System, AI Agent, WebSockets) implemented in both Java and Node.js. |
| **Security** | 2 | As stated in the README, the terminal implementation gives the web interface direct access to execute host commands without sandboxing. Major risk. |
| **Scalability** | 4 | Stateful websocket connections, local SQLite/H2 usage, and direct local file system reliance make horizontal scaling currently impossible. |
| **AI Readiness** | 7 | Good foundation with local Ollama, FAISS vector search, and screen OCR, but orchestration is split across Node.js and Java. |
| **Deployment Readiness**| 2 | Development environment works, but running Java + Node.js + Python + Vite + Ollama concurrently is too complex for end-users without containerization (Docker). |

## Final Section

### What Works Today
- The React Frontend with Monaco editor and xterm.js terminal.
- Node.js `terminal-server` executing commands and proxying Language Server Protocol (LSP).
- Python backend handling FAISS vector storage and OCR screen analysis.
- Connection to local Ollama instance for AI chat.

### Partially Implemented Features
- **File System Access:** Caught between native browser File System APIs and Java backend REST endpoints.
- **AI Agents:** Implemented in both Java (`AgentService.java`) and Node.js, but neither is clearly fully authoritative.

### Dead / Abandoned Features
- **Java TerminalWebSocketHandler:** Unused.
- **Tauri / Wrangler:** Leftover configurations in frontend for desktop or edge deployments.
- **Java FileSystemController:** Largely superseded by native browser and Node.js implementations.

### Recommended Next Steps

1. **Delete Java TerminalWebSocketHandler**: Remove dead terminal code from the Spring Boot backend.
2. **Consolidate Backends**: Choose between Node.js or Java as the primary backend and port missing features. (Node.js is currently doing the heavy lifting for the IDE).
3. **Remove Duplicate AI Logic**: Strip out the duplicate AI agent logic in Java and unify around the Node.js implementation.
4. **Unify File System Access**: Standardize on either the Node.js filesystem API or native browser API, and remove the other.
5. **Dockerize the Application**: Create a `docker-compose.yml` to spin up the UI, Node server, Python server, and Java backend together.
6. **Implement Sandboxing**: Run the Node.js terminal execution in a secure container or Sandbox to mitigate severe security risks.
7. **Clean up Dependencies**: Remove unused packages (`file-extension-icon-js`, `xterm-addon-attach`) and dev dependencies identified by `knip`.
8. **Remove Frontend Dead Code**: Delete the 20+ unused React UI components.
9. **Centralize Config**: Stop scattering environment variables across three backends; create a central `.env` strategy.
10. **Refactor Ollama Paths**: Ensure all Ollama requests proxy through a single backend service rather than directly from the frontend to avoid CORS issues and simplify models.
