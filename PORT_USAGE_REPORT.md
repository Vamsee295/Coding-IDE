# Port Usage & Connectivity Report

This report verifies that the OLLAMA AI IDE functions autonomously using the target React -> Node.js -> Python architecture, with no inbound or outbound attempts to connect to Spring Boot.

## Active Service Ports

| Service | Port | Protocol | Purpose | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| **Vite Frontend** | `5173` | HTTP | Serves the React UI during development. | **Active** |
| **Node.js Server** | `8082` | HTTP / WS | PTY Terminal, LSP proxy, Git operations, File System access. | **Active** |
| **Python Backend** | `5001` | HTTP | FAISS vector indexing, OCR screen capture, Ollama API proxy. | **Active** |
| **Ollama Host** | `11434` | HTTP | Local LLM hosting. | **Active** |
| **Spring Boot** | `8081` | HTTP / WS | Legacy Java backend (Auth, Cloud Projects, Java FS). | **INACTIVE** |

## Connection Verification
An audit of the frontend `config.ts`, `fsService.ts`, and `agentService.ts` proves that no component attempts to fetch or open a WebSocket to `localhost:8081`.
The network traffic flow is exclusively confined to `5173`, `8082`, `5001`, and `11434`.
