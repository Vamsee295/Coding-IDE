# Archived Spring Boot Backend Notes

This document serves as a historical record of the original Java-based Spring Boot backend that powered the IDE in its initial iterations.

## Original Purpose
The Spring Boot backend was designed as a traditional, monolithic web server to provide:
1. **Cloud Persistence**: Using H2/MySQL databases to store user accounts (`AuthController`) and Cloud Projects metadata (`IdeController`).
2. **File System Abstraction**: Exposing the host file system to the web frontend via REST (`FileSystemController`).
3. **Pty Terminal access**: Utilizing `pty4j` and Spring WebSockets to provide an interactive shell to the browser (`TerminalWebSocketHandler`).
4. **AI Proxies**: A layer between the frontend and a local Ollama instance (`OllamaProxyController`).
5. **Early Agent Experiments**: Experimental logic for autonomous tool execution (`AgentService`, `ToolExecutor`).

## Major Controllers
- `FileSystemController.java`: `/api/fs/*` (Replaced by Node.js native `fs`)
- `AuthController.java`: `/api/auth/*` (Removed - local IDEs don't need user login)
- `IdeController.java`: `/api/projects/*` (Removed - replaced by native OS folder picker)
- `OllamaProxyController.java`: `/api/ai/*` (Replaced by Python Flask backend)
- `WorkspaceController.java` & `EventController.java` (Replaced by Node.js Terminal Server)

## Major Services
- `AgentService.java`: Legacy AI orchestration loops.
- `ContextService.java`: Legacy contextual gathering.
- `EventBus.java`: Internal server-side pub/sub.

## Historical Architecture Diagram
```text
+-------------------------------------------------------------------------+
|                               React Frontend                            |
+--------+------------------+-----------------+-------------------+-------+
         | (HTTP)           | (WS)            | (HTTP)            | (HTTP)
         v                  v                 v                   v
+-------------------------------------------------------------------------+
|                         Java Spring Boot Backend                        |
|  - FileSystemController                                                 |
|  - TerminalWebSocketHandler                                             |
|  - AuthController (Database)                                            |
|  - OllamaProxyController                                                |
+------------------+-----------------+------------------------------------+
                   | (HTTP)          | (JDBC)
                   v                 v
+------------------------+      +---------+
|     Local Ollama       |      |  H2 DB  |
+------------------------+      +---------+
```

## Reason for Retirement
The architecture evolved toward a **Local-First Desktop IDE** (similar to Cursor or VS Code).
In a local environment:
- **Redundancy:** Node.js (`node-pty`, `chokidar`) is much better suited for high-performance terminal execution and language server proxying than Java `pty4j`.
- **Simplification:** Python (`faiss`, `pytesseract`) is the industry standard for AI orchestration and embeddings, removing the need for Java wrappers.
- **Overhead:** Removing the JVM significantly reduces startup time, memory footprint, and architectural complexity for end-users deploying the IDE locally.
- **Obsolete Features:** The entire database and user authentication layer was deemed unnecessary.
