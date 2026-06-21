# Runtime Dependency Map

This map outlines the real runtime dependencies and communication flow across all services in the current architecture.

## 1. Frontend (React + Tauri) Dependencies

The Frontend orchestrates the UI and is the primary client. It communicates with multiple backends.

| Target Service | Endpoint / Protocol | Caller in Frontend | Purpose | Status in Target Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js (8082)** | `ws://localhost:8082` | `TerminalPanel.tsx` | Main PTY terminal stream | **Keep** |
| **Node.js (8082)** | `ws://localhost:8082/debug` | `debugService.ts` | Debugging events | **Keep** |
| **Node.js (8082)** | `ws://localhost:8082` (LSP) | `lspClient.ts` | Language Server Protocol proxy | **Keep** |
| **Node.js (8082)** | `HTTP /api/chat/history/*` | `useChatStore.ts`, `ChatHistorySidebar.tsx` | Chat history persistence | **Keep / Move to local SQLite** |
| **Node.js (8082)** | `HTTP /git/*` | `SourceControlView.tsx` | Git operations | **Keep** |
| **Node.js (8082)** | `HTTP /workspace/*` | `workspaceService.ts` | Set/Get workspace root | **Keep** |
| **Node.js (8082)** | `HTTP /ai/agent`, `/ai/complete` | `agentService.ts`, `aiCompletionService.ts` | AI task orchestration | **Move to Python** |
| **Node.js (8082)** | `HTTP /ai/reindex`, `/ai/analyze-screen` | `workspaceService.ts`, `Home.tsx` | Trigger vector indexing & OCR | **Move to Python** |
| **Spring Boot (8081)** | `HTTP /api/fs/*` | `fsService.ts` | Legacy File System operations | **Replace** (Native/Node.js) |
| **Spring Boot (8081)** | `HTTP /api/ai/models`, `/pull`, `/stream` | `SettingsView.tsx`, `Home.tsx` | Legacy AI model management | **Replace** (Python/Ollama) |
| **Spring Boot (8081)** | `HTTP /api/projects`, `/api/auth` | `api.ts` | User Auth & Cloud Projects | **Remove** (Local-first) |
| **Spring Boot (8081)** | `ws://localhost:8081/ws/terminal` | (Unused) | Legacy Terminal | **Remove** |
| **Ollama (11434)** | `HTTP /api/tags` | `SettingsView.tsx` | Fetch local Ollama tags | **Move to Python** |

## 2. Node.js Terminal Server (8082) Dependencies

The Node.js server acts as the primary host integration layer.

| Target Service | Endpoint / Lib | Caller in Node.js | Purpose |
| :--- | :--- | :--- | :--- |
| **Host OS** | `node-pty`, `child_process` | `socketManager.js`, `api.js` | Spawning shells, running git, debug eval |
| **Host FS** | `chokidar`, `fs` | `indexerService.js` | File watching, Workspace indexing |
| **Python (5001)** | `HTTP /vector/clear`, `/add`, `/search` | `indexerService.js`, `api.js` | FAISS Vector DB operations |
| **Python (5001)** | `HTTP /screen/analyze` | `api.js` | Triggering OCR screen analysis |
| **Ollama (11434)**| `HTTP /api/generate`, `/api/chat` | `api.js` (AI routes) | Generating AI completions & Agent loops |

## 3. Python AI Backend (5001) Dependencies

The Python server acts as a microservice strictly for auxiliary AI tasks.

| Target Service | Lib | Purpose |
| :--- | :--- | :--- |
| **Host FS** | `os` | Reading files provided by Node.js for indexing |
| **Host Display** | `Pillow`, `pytesseract` | Taking screenshots and running OCR |
| **Vector Index** | `faiss-cpu`, `sentence-transformers` | Generating embeddings and storing them in memory/disk |

## 4. Spring Boot Backend (8081) Dependencies

The Java backend currently handles state and legacy operations.

| Target Service | Resource | Purpose |
| :--- | :--- | :--- |
| **Database** | H2 / SQLite / MySQL | Persisting Users, Cloud Projects, Files metadata |
| **Host FS** | Java IO | Modifying files via `FileSystemController` |
| **Ollama (11434)** | HTTP Client | Proxying legacy AI requests (`/generate`, `/stream`) |

## 5. System Data Flow Summary

- **Terminal & System**: React UI -> WS -> Node.js -> Host OS. *(Spring Boot is bypassed).*
- **AI RAG Pipeline**: React UI -> Node.js -> Python -> FAISS. Node.js then calls Ollama. *(Node currently orchestrates AI, but target architecture calls for Python to orchestrate).*
- **Authentication**: React UI -> Spring Boot -> DB. *(Not needed in target architecture).*
- **File System**: React UI uses both Native Browser API (`fileSystemHelper.ts`) AND Spring Boot (`fsService.ts`). Node.js watches FS (`chokidar`). *(Fragmented, Spring Boot is redundant).*
