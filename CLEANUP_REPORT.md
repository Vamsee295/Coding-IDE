# Cleanup & Migration Report

This report outlines the strategy for eliminating duplicate implementations across the OLLAMA AI stack, focusing on the deprecation of the Spring Boot backend and the transition to the target architecture: **React + Tauri → Node.js Core → Python AI Engine**.

## 1. Actively Used Spring Boot Features

Based on the dependency map, only a handful of Spring Boot features are currently active and being called by the React frontend:

- **File System Controller (`/api/fs/*`)**: Called by `fsService.ts` for reading, writing, and searching files.
- **Ollama Proxy (`/api/ai/models`, `/pull`, `/stream`)**: Called by `SettingsView.tsx` and `Home.tsx` to list available tags and stream legacy chat completions.
- **Authentication (`/register`, `/login`, `/me`)**: Unnecessary for a local IDE, but the endpoints are currently active if the user hits those UI flows.
- **Project Management (`/api/projects/*`)**: Used to store cloud project metadata in the H2/MySQL database.

## 2. Spring Boot Features Duplicated by Node.js

Node.js has already duplicated and improved upon several core IDE features, rendering the Spring Boot equivalents redundant:

| Feature | Spring Boot Implementation | Node.js Implementation | Winner |
| :--- | :--- | :--- | :--- |
| **Terminal & PTY** | `TerminalWebSocketHandler` | `socketManager.js` (`node-pty`) | **Node.js** (Active) |
| **Workspace Management** | `WorkspaceController` | `/workspace/set` (`api.js`) | **Node.js** (Active) |
| **File Watching** | Native Java IO | `indexerService.js` (`chokidar`) | **Node.js** (Active) |
| **Chat History** | `ChatHistoryController` | `/api/chat/history/*` (`api.js`) | **Node.js** (Active) |
| **AI Orchestration** | `AgentService.java` | `/ai/agent` (`api.js`) | **Node.js** (Active) |
| **LSP Proxying** | *None* | `lspService.js` | **Node.js** (Active) |

## 3. Spring Boot Features Duplicated by Python

Python handles specialized AI tasks that Spring Boot initially attempted to orchestrate or proxy:

| Feature | Spring Boot Implementation | Python Implementation | Winner |
| :--- | :--- | :--- | :--- |
| **Vector Indexing (RAG)** | `ContextService.java` | `faiss_service.py` | **Python** (Active) |
| **Ollama Proxies** | `OllamaProxyController` | *Needs implementation* | **Python** (Target) |
| **OCR Analysis** | *None* | `screen_service.py` | **Python** (Active) |

---

## 4. What Can Be Safely Removed TODAY

The following Spring Boot code is 100% dead weight or redundant and can be deleted immediately without breaking the application:

1. **`TerminalWebSocketHandler.java` & `WebSocketConfig.java`**: The frontend connects to `ws://localhost:8082` (Node.js).
2. **`WorkspaceController.java` & `EventController.java`**: Node.js handles workspaces.
3. **`ChatHistoryController.java` & `ChatHistoryService.java`**: The frontend already saves chat history via the Node.js server.
4. **The entire `com.example.ide.ai` package** (except maybe the proxy controller): `AgentService`, `ContextService`, and `ToolExecutor` are duplicated by Node.js and Python.
5. **Auth & Project DB Entities**: If we commit to the local-first architecture today, `AuthController` and `IdeController` can be removed along with their JPA repositories.

## 5. What Must Be Migrated First (Before Deleting Spring Boot)

If you delete the entire `backend/` folder right now, the IDE will break in two specific ways. These must be migrated first:

1. **File System Operations (`fsService.ts`)**:
   - *Current:* Calls `http://localhost:8081/api/fs/*` (Spring Boot).
   - *Migration:* Refactor `fsService.ts` to call either Node.js endpoints (which need to be added to `api.js`) OR use native Tauri `fs` APIs.
2. **AI Model Settings (`SettingsView.tsx`)**:
   - *Current:* Calls `http://localhost:8081/api/ai/models` and `/pull`.
   - *Migration:* Refactor the frontend to either query the local Ollama instance directly (`http://localhost:11434`) or proxy these through the Python AI Engine.

---

## 6. Migration Roadmap

To reach the target architecture (**React + Tauri → Node.js Core → Python AI Engine**), execute these steps in order:

### Phase 1: Spring Boot Lobotomy (Immediate)
- **Task:** Delete dead code from Spring Boot.
- **Action:** Remove `TerminalWebSocketHandler`, `ChatHistoryController`, `WorkspaceController`, and the `ai` package (except `OllamaProxy`).
- **Result:** Reduces JVM overhead and removes confusing duplicate logic.

### Phase 2: File System & Local State Migration (Node.js/Tauri)
- **Task:** Disconnect the UI from Spring Boot's filesystem.
- **Action:** Rewrite `frontend/src/services/fsService.ts` to use Tauri native APIs (preferred) or Node.js endpoints.
- **Action:** Remove any remaining UI gates requiring User Login (Auth) or Cloud Projects.
- **Result:** Spring Boot's `FileSystemController`, `AuthController`, and `IdeController` can now be safely deleted.

### Phase 3: AI Engine Consolidation (Python)
- **Task:** Establish Python as the sole AI authority.
- **Action:** Move the AI Agent orchestration (`/ai/agent`) from the Node.js `api.js` into the Python Flask app.
- **Action:** Route all Ollama requests (completions, model pulling) through Python. Node.js should no longer talk to Ollama directly.
- **Result:** Node.js focuses solely on Terminal, Git, and LSP. Python owns the LLM context and execution.

### Phase 4: The Final Purge
- **Task:** Delete Spring Boot entirely.
- **Action:** Delete the `backend/` directory.
- **Action:** Update frontend configuration (`config.ts`) to point strictly to Node.js (8082) and Python (5001).
- **Result:** A clean, local-first architecture matching: **React + Tauri → Node.js Core → Python AI Engine**.
