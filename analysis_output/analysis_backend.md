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
