# StackFlow IDE - Architecture V2

StackFlow is a local-first, AI-powered desktop IDE. Following the retirement of the legacy Spring Boot backend, the architecture has been vastly simplified into three dedicated layers.

## System Diagram

```text
+-------------------------------------------------------------------------+
|                    1. UI Layer (React + Tauri / Vite)                     |
|  - Desktop Window Management                                            |
|  - Monaco Code Editor                                                   |
|  - xterm.js Terminal Renderer                                           |
|  - UI State (Zustand)                                                   |
+--------+------------------+-----------------+-------------------+-------+
         | (HTTP / WS)      | (WS)            | (HTTP)            |
         v                  v                 v                   |
+------------------------------------+   +------------------------v-------+
|  2. Core Service (Node.js Express)   |   |   3. AI Engine (Python Flask)  |
|  - Terminal execution (node-pty)   |   |  - Vector DB (FAISS)           |
|  - Language Server Protocol (LSP)  |   |  - Embedding Generation        |
|  - File System API & Watcher       |   |  - Screen OCR (pytesseract)    |
|  - Git Intelligence                |   |  - RAG Orchestration           |
|  - Local Workspace Management      |   |  - Ollama Proxy                |
+------------------------------------+   +------------------------+-------+
                                                                  | (HTTP)
                                                                  v
                                         +--------------------------------+
                                         |         Local Ollama           |
                                         |  - Local LLM inference         |
                                         |  - Code completion generation  |
                                         +--------------------------------+
```

## Port Bindings & Responsibilities

| Service | Port | Protocol | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Vite / Tauri UI** | `5173` | HTTP | Client presentation. |
| **Node.js Core** | `8082` | HTTP / WS | Execution host. Accesses local disk and spawns PTY processes. |
| **Python Engine** | `5001` | HTTP | AI context processing and orchestration. |
| **Ollama** | `11434` | HTTP | Model inference engine. |

## Data Flow Examples

### Executing a Command
1. User types `npm install` in the React terminal (`xterm.js`).
2. React sends Keystroke over WebSocket -> `ws://localhost:8082`.
3. Node.js writes to the `node-pty` pseudo-terminal.
4. OS executes `npm install`.
5. `node-pty` reads stdout and streams back over WebSocket to React.

### File Editing
1. User opens a file in the Monaco Editor.
2. React fetches file contents via `http://localhost:8082/fs/read`.
3. Node.js reads the file from the disk using `fs.readFile` and returns the text.

### Asking AI for Code Help
1. User asks "Explain this code" in the Chat UI.
2. React sends the prompt and the file context to Python `http://localhost:5001/ai/stream`.
3. Python (`app.py`) queries FAISS for additional context if necessary.
4. Python packages the prompt and streams the request to Ollama (`http://localhost:11434/api/generate`).
5. Ollama generates tokens, Python yields them back to React.
