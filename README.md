# 💻 StackFlow IDE

StackFlow IDE is a modern, high-performance, web-based Integrated Development Environment (IDE). Designed for local-first development, it offers a rich desktop-like experience directly in the browser, featuring a multi-tab code editor, a fully functional real-time terminal, local workspace file management, and a context-aware AI assistant.

---

## 🏗️ Architecture Overview

The system utilizes a decoupled three-tier architecture that runs entirely on your local machine:

```text
               +----------------------------------------+
               |          React Frontend (Vite)         |
               |             (Port 5173)                |
               +----------------------------------------+
                  /                                  \
   (HTTP/WS)     /                                    \  (HTTP REST)
                v                                      v
  +---------------------------+          +---------------------------+
  |    Core Node.js Server    |          |     Python AI Engine      |
  | (terminal-server, 8082)   |          |   (python-backend, 5001)  |
  +---------------------------+          +---------------------------+
                |                                      |
         (Native OS PTY)                               v
                |                        +---------------------------+
                v                        |    Local Ollama Instance  |
        [Local File System]              |        (Port 11434)        |
                                         +---------------------------+
```

1. **Frontend (React, TS, Vite)**: The user interface containing a multi-tab Monaco editor, xterm.js terminal widgets, workspace file explorer, and the AI panel.
2. **Core Service (Node.js Express)**: The execution host. Manages native OS pseudo-terminals (`node-pty`), provides workspace file API endpoints, registers language server protocols (LSP) for code completion, and handles Git operations.
3. **AI & Context Engine (Python Flask)**: The intelligence broker. Integrates with the local Ollama instance, implements document embeddings with FAISS vector database for Retrieval-Augmented Generation (RAG), and handles workspace screen OCR using Tesseract for visual-context referencing.
4. **AI Provider (Ollama)**: Local LLM runtime hosting models (e.g., Llama-3, Qwen, Codegemma) for zero-latency, private code generation.

---

## 🔄 Complete Project Workflow

StackFlow IDE features three main asynchronous workflows that drive its functionality:

### 1. The Terminal Loop
```text
[User Keystroke] ---> [xterm.js (Frontend)] --(WebSocket)--> [Socket.io Server (Node.js)]
                                                                     |
                                                                     v
[User Shell Output] <-- [xterm.js (Frontend)] <-- (WS Stream) -- [node-pty (OS PTY)]
```
- **Execution**: Every keystroke in the terminal is sent over WebSockets to the Node.js Core Service.
- **Processing**: The Node.js server pipes the stream into a native OS pseudo-terminal session (`node-pty`).
- **Response**: The PTY outputs standard stream characters back over the WebSocket channel, which `xterm.js` renders instantly in the UI.

### 2. The File System Sync
- **Access**: File operations are triggered via REST API endpoints on the Node.js service (e.g., `/fs/read`, `/fs/write`).
- **File Watching**: A chokidar watcher on the Node.js server listens to filesystem modifications.
- **Refinement**: Any modifications or edits made externally or by the IDE are broadcasted to the frontend to update the directory tree and editor tabs in real-time.

### 3. Context-Aware AI Chat (RAG & OCR)
- **Prompt Submission**: The developer submits a prompt in the sidebar.
- **Context Retrieval**: The Python AI Engine queries the local FAISS vector store to find relevant codebase chunks.
- **OCR Reference**: If requested, a screenshot of the IDE is taken, run through Tesseract OCR, and the active editor text is injected into the prompt.
- **LLM Execution**: The consolidated prompt is proxied to Ollama (`localhost:11434`), and the resulting tokens are streamed back to the React UI.

---

## 📁 Repository Directory Structure

```text
StackFlow-IDE/
├── frontend/             # React application (UI, Monaco Editor, state management)
├── terminal-server/      # Node.js service (Terminal PTY, Git integrations, File System API)
├── python-backend/       # Python Flask service (Ollama Proxy, FAISS Vector DB, OCR Services)
├── readmes/              # Centralized sub-system documentation folder
│   ├── frontend-README.md
│   └── backend-README.md
├── backend/              # [RETIRED] Legacy Spring Boot monolithic backend codebase
└── README.md             # Project roadmap, workflow overview, and startup guide
```

---

## 🏁 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ and `pnpm` (or `npm`)
- **Python**: 3.10+ (with `pip`)
- **Tesseract OCR**: Installed on your OS PATH (required for AI screen capture features)
- **Ollama**: Installed and running locally

### 2. Startup Instructions

For the IDE to function fully, all three services must run concurrently:

#### Step A: Run local Ollama Models
Ensure your local Ollama service is running and pull your preferred coding model:
```bash
ollama run llama3
```

#### Step B: Start the Core Service (`terminal-server`)
```bash
cd terminal-server
npm install
npm start
```
*Runs on [http://localhost:8082](http://localhost:8082)*

#### Step C: Start the Python AI Engine (`python-backend`)
```bash
cd python-backend
pip install -r requirements.txt
python app.py
```
*Runs on [http://localhost:5001](http://localhost:5001)*

#### Step D: Start the React Frontend (`frontend`)
```bash
cd frontend
pnpm install
pnpm dev
```
*Runs on [http://localhost:5173](http://localhost:5173)*

---

## 📄 Sub-Module Documentation

For specific configurations, API routes, and setup instructions of the sub-systems, refer to:
- 🎨 **[Frontend Detailed Guide](./readmes/frontend-README.md)**
- ⚙️ **[Backend & Core Services Detailed Guide](./readmes/backend-README.md)**

---

> [!WARNING]
> The terminal emulator executes commands directly on your local host system shell. Do not deploy StackFlow IDE on public web servers or expose port `8082` without proper sandboxing and security configurations.
