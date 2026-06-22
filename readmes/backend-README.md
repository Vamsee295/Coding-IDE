# StackFlow IDE — Backend Services

The backend of StackFlow IDE has transitioned from the legacy Spring Boot monolithic architecture (previously stored in the legacy `backend` directory, now retired) to a decoupled, lightweight dual-service architecture. 

It is divided into two separate microservices:
1. **Core Service (Node.js Express)**: Located in the [`terminal-server`](../terminal-server) directory.
2. **AI & Context Engine (Python Flask)**: Located in the [`python-backend`](../python-backend) directory.

---

## 🛠️ Service Breakdown

### 1. Node.js Core Service (`terminal-server`)
- **Port**: `8082` (HTTP / WS)
- **Role**: Execution host and workspace administrator.
- **Key Responsibilities**:
  - **Terminal Execution**: Spawns and manages native OS pseudo-terminal (PTY) sessions using `node-pty` and communicates with the frontend via Socket.io.
  - **File System API**: Handles local workspace management operations (reading, writing, deleting, and listening for file changes using `chokidar`).
  - **Language Server Protocol (LSP)**: Manages code intelligence features such as auto-completions, hover hints, and language indexing.
  - **Git Integration**: Executes native Git operations on the host workspace.

### 2. Python AI Engine (`python-backend`)
- **Port**: `5001` (HTTP)
- **Role**: Artificial Intelligence processing, vector search, and context management.
- **Key Responsibilities**:
  - **Ollama Proxy**: Proxies prompt and stream generation requests to the local Ollama instance (`http://localhost:11434`).
  - **Semantic Context Search**: Runs a local FAISS vector database to embed, index, and retrieve workspace documents for RAG (Retrieval-Augmented Generation).
  - **Screen OCR Analysis**: Performs screenshot capture and text extraction using Tesseract OCR (`pytesseract`) to allow AI chat reference to active workspace views.

---

## 🔌 Connection & Wiring

- **Frontend to Core Service**: The React frontend sends file CRUD requests to `http://localhost:8082/fs/*` and connects to the WebSocket stream at `ws://localhost:8082` for real-time terminal shell input/output.
- **Frontend to AI Engine**: React routes streaming chat queries, model pulls, and screen captures through the Python engine at `http://localhost:5001`.
- **AI Engine to Ollama**: The Python server queries and streams tokens from the local Ollama instance listening at `http://localhost:11434`.

```text
+----------------------+             (Socket.io / HTTP)             +-----------------------+
|                      | -----------------------------------------> |  Core Node.js Server  |
|                      |                                            |      (Port 8082)      |
|                      |                                            +-----------------------+
|  React UI (Port 5173) |
|                      |                                            +-----------------------+
|                      | -----------------------------------------> |   Python AI Engine    |
|                      |                 (HTTP)                     |      (Port 5001)      |
+----------------------+                                            +-----------+-----------+
                                                                                |
                                                                                | (HTTP Proxy)
                                                                                v
                                                                    +-----------------------+
                                                                    |     Local Ollama      |
                                                                    |     (Port 11434)      |
                                                                    +-----------------------+
```

---

## 🏁 How to Run

Both services must be active simultaneously for the full capabilities of the IDE.

### Running the Node.js Core Service (`terminal-server`)
1. Navigate to the terminal-server directory:
   ```bash
   cd terminal-server
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

### Running the Python AI Engine (`python-backend`)
1. Navigate to the python-backend directory:
   ```bash
   cd python-backend
   ```
2. Install dependencies (it is recommended to use a virtual environment):
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Flask application:
   ```bash
   python app.py
   ```
