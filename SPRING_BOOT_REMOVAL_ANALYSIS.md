# Spring Boot Removal Feasibility Analysis

## 1. Feature Ownership Matrix

| Feature | Spring Boot (8081) | Node.js (8082) | Python (5001) | Target Owner | Current Reality |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Terminal / PTY** | Deprecated (`TerminalWS`) | **Active** (`node-pty`) | None | Node.js | Node.js fully owns this. |
| **Workspace / Git** | Deprecated (`WorkspaceController`) | **Active** (`api.js`) | None | Node.js | Node.js handles Git and dir paths. |
| **LSP Proxy** | None | **Active** (`lspService.js`) | None | Node.js | Node.js owns Language Server. |
| **AI Orchestration** | Deprecated (`AgentService.java`) | **Active** (`api.js`) | None | Python | Node.js orchestrates; Python should. |
| **Vector DB (FAISS)** | None | Orchestrator | **Active** | Python | Python owns FAISS. |
| **OCR (Screen)** | None | Orchestrator | **Active** | Python | Python owns OCR. |
| **Ollama Connectivity**| Partially Active (`OllamaProxy`) | **Active** (`api.js`) | None | Python | Split. Target is Python. |
| **File Operations** | Partially Active (`FileSystemController`) | Watcher (`chokidar`) | None | Node.js / React | Fragmented. Native UI + Spring. |
| **Authentication** | **Active** (`AuthController`) | None | None | Remove | Spring Boot owns Auth + DB. |
| **Cloud Projects** | **Active** (`IdeController`) | None | None | Remove | Spring Boot owns Projects + DB. |
| **Chat History** | **Active** (`ChatHistoryController`) | **Active** (`api.js`) | None | React/Node | Duplicated, but UI uses Node.js. |

## 2. Spring Boot Endpoint Audit

Based on the repository analysis:

### Controllers & REST Endpoints
* **`AuthController.java` (`/register`, `/login`, `/me`)**:
  * **Status:** **Unused/Deprecated in Target Architecture**.
  * **Evidence:** The target architecture is a local-first desktop IDE (Cursor/VS Code style). Authentication is not a required feature and can be removed.
* **`IdeController.java` (`/{projectId}`, `/files`)**:
  * **Status:** **Unused/Deprecated in Target Architecture**.
  * **Evidence:** Designed for a cloud-hosted "Project" model persisting to a database. Local-first IDEs manage local folders via native file system APIs.
* **`FileSystemController.java` (`/list`, `/read`, `/write`, `/delete`)**:
  * **Status:** **Partially Used -> Deprecated**.
  * **Evidence:** The frontend `fsService.ts` calls these, but Vite/Tauri/Node.js are perfectly capable of local file system access. Spring Boot is redundant here.
* **`OllamaProxyController.java` (`/generate`, `/stream`, `/pull`)**:
  * **Status:** **Partially Used -> Deprecated**.
  * **Evidence:** Node.js implements its own AI routes, and the target architecture dictates Python should orchestrate Ollama.
* **`ChatHistoryController.java` (`/save`, `/chats`)**:
  * **Status:** **Unused**.
  * **Evidence:** The frontend `useChatStore.ts` explicitly calls the Node.js server (`http://localhost:8082/api/chat/history/*`) for saving chats, bypassing Java completely.
* **`WorkspaceController.java` & `EventController.java`**:
  * **Status:** **Unused/Deprecated**.
  * **Evidence:** Node.js handles Workspace configuration now.

### WebSocket Endpoints
* **`TerminalWebSocketHandler.java` (`ws://localhost:8081/ws/terminal`)**:
  * **Status:** **Unused**.
  * **Evidence:** Frontend `TerminalPanel.tsx` explicitly connects to `ws://localhost:8082`.

### Services, Repositories, Entities
* Services (`AgentService`, `OllamaService`, `ToolExecutor`, `EventBus`, `ExtensionManager`) are largely disconnected from the active UI flows, existing as parallel, unused implementations.
* JPA Repositories (Auth/Projects) exist solely to support the Controllers being deprecated above.

## 3. Migration Feasibility

If Spring Boot is removed, here is how remaining responsibilities should be migrated:

| Spring Boot Responsibility | Target Migration Location | Feasibility | Effort Level |
| :--- | :--- | :--- | :--- |
| **Authentication & User Management** | **Remove Entirely** | High | Very Low (Just delete UI login gates) |
| **Cloud Project Management** | **Node.js / React (Local Folders)** | High | Low (Native FS picker already exists) |
| **File System API (`/fs/*`)** | **Node.js** | High | Low (Map Axios calls in `fsService.ts` to Node.js FS module or use Tauri APIs) |
| **Legacy AI Proxies (`/pull`, `/models`)** | **Python AI Service** | High | Low (Port 2 REST endpoints to Flask) |
| **Telemetry / Events** | **Remove or Node.js** | High | Low (Not critical for local execution) |
| **Settings / Extensions Persistence** | **Tauri Local Storage / SQLite** | High | Medium (Change React contexts to save to `localStorage` or local JSON) |

## 4. Risk Assessment

| Risk Area | Risk Level | Mitigation Strategy |
| :--- | :---: | :--- |
| **Data Loss (Projects/Files)** | **Low Risk** | Local IDEs modify files directly on the disk. The concept of "database projects" is irrelevant. Files live safely on the user's hard drive. |
| **Loss of Chat History** | **Low Risk** | `useChatStore.ts` already queries the Node.js server to save history to local disk. Spring Boot isn't even handling this. |
| **Broken Workspace Management** | **Low Risk** | Node.js already handles workspace paths (`/workspace/set`). |
| **Missing FS API Functionality** | **Medium Risk** | If `fsService.ts` relies exclusively on port 8081, deleting Spring Boot breaks the file explorer. **Mitigation:** Update `fsService.ts` to call Node.js or Tauri native file APIs before deleting Spring Boot. |
| **Missing AI Functionality** | **Medium Risk** | `SettingsView.tsx` uses 8081 to fetch Ollama tags. **Mitigation:** Reroute these 2-3 endpoints directly to Ollama or the Python backend. |

## 5. Final Recommendation

**Recommendation: C. Remove Spring Boot completely.**

### Justification
1. **Redundancy:** The repository evidence proves that the core capabilities of the IDE (Terminal Execution, LSP, Git, Workspace definition, Chat History, and AI orchestration) have *already* been rewritten and offloaded to the Node.js terminal server and Python backend.
2. **Architectural Mismatch:** Spring Boot is enforcing a "Cloud / SaaS" architecture (Users, Cloud Projects, Relational Databases) on an application that is explicitly requested to be a "Local-First Desktop IDE".
3. **Dead Code:** Entire packages (`com.example.ide.websocket`, `com.example.ide.ai`) are running parallel to active Node.js/Python implementations but are bypassed by the React frontend.
4. **Feasibility:** The only remaining functional ties to Spring Boot are the legacy File System API (`fsService.ts`) and a couple of Ollama proxy endpoints. Re-routing these to Node.js/Python (or native Tauri APIs) is a low-effort, high-reward migration that eliminates an entire heavy JVM service, an unnecessary database, and significant cognitive overhead from the tech stack.

Spring Boot is currently acting as dead weight in this repository. It can and should be safely removed.
