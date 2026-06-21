# Remaining Spring Boot Dependencies

After completing Phase 1 of the migration, the following dependencies on the Spring Boot backend (`http://localhost:8081`) still exist in the frontend codebase.

These dependencies must be removed in Phase 2 before the `backend/` directory can be safely deleted.

## 1. Cloud Projects & Authentication (`frontend/src/services/api.ts`)
The `api.ts` service still configures its Axios `baseURL` to `CONFIG.API_BASE_URL` (8081).
It exports the following functions that hit Spring Boot:
- `getProjects()` -> `/api/projects`
- `createProject()` -> `/api/projects`
- `deleteProject()` -> `/api/projects/{id}`
- `getProjectFiles()` -> `/api/projects/{id}/files`

**Action Required:**
- Since the target architecture is a local-first desktop IDE, the concept of "Cloud Projects" managed by a database is obsolete.
- Remove `api.ts` completely.
- Remove any UI components (e.g., Login/Registration screens, Project Selectors) that call these functions.

## 2. Legacy Workspace API (`frontend/src/services/workspaceService.ts`)
There is a vestigial variable in `workspaceService.ts`:
```typescript
const BASE = `${CONFIG.API_BASE_URL}/workspace`;
```
However, inspecting `workspaceService.ts`, the actual workspace methods (`setWorkspace`, `getWorkspaceInfo`) are hitting `CONFIG.TERMINAL_API_URL` (Node.js). The `BASE` variable pointing to Spring Boot is likely unused dead code.

**Action Required:**
- Delete the unused `BASE` variable from `workspaceService.ts`.

## 3. Fallback URL in Agent Service (`frontend/src/services/agentService.ts`)
There is a fallback string pointing to 8081:
```typescript
const BACKEND_URL = CONFIG.TERMINAL_SERVER_URL || 'http://localhost:8081';
```

**Action Required:**
- Remove the `|| 'http://localhost:8081'` fallback.

## 4. Configuration Variable (`frontend/src/react-app/lib/config.ts`)
The base variable still exists in the configuration:
```typescript
API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api',
```

**Action Required:**
- Once Phase 2 is complete, this variable should be deleted from `config.ts`.
