# Spring Boot Archive & Deletion Plan

Before executing the final deletion of the `backend/` directory, review this plan to ensure no historical or reference code is lost.

## 1. Files Safe to Delete
The entirety of the Spring Boot application logic can be safely purged:
- `backend/src/main/java/com/example/ide/controllers/*` (Auth, FS, IDE, Workspace, Ollama proxies)
- `backend/src/main/java/com/example/ide/websocket/*` (Terminal WS handler)
- `backend/src/main/java/com/example/ide/entities/*` (JPA definitions for Cloud Projects/Users)
- `backend/src/main/java/com/example/ide/config/*` (Spring Security, WebSocket Configs)
- `backend/pom.xml` & `mvnw` scripts

## 2. Code Worth Preserving (For Reference)
If you wish to retain historical context on how the original Java Agent Loop was constructed before it was moved to Python/Node:
- **Location:** `backend/src/main/java/com/example/ide/ai/`
- **Action:** You may want to copy `AgentService.java` or `ToolExecutor.java` into a `.archive/` directory at the root of the repo before deleting the `backend/` folder. They contain early attempts at Java-based autonomous tool execution.

## 3. Rollback Strategy
If catastrophic failure occurs post-deletion:
1. Revert the Git commit that deletes the `backend/` folder.
2. Revert the Frontend `config.ts` to reinstate `API_BASE_URL: ...:8081`.
3. Re-enable the Cloud UI components in `Home.tsx`.

## Execution Command
When ready, run:
```bash
rm -rf backend/
```
