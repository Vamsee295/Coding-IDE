# Phase 2 Implementation Plan

The file system (`fsService.ts`) and AI proxy endpoints (`SettingsView.tsx`, `Home.tsx`) were successfully migrated to Node.js and Python in Phase 1.

The remaining runtime dependencies on Spring Boot (`http://localhost:8081`) are solely related to **Authentication** and **Cloud Projects**, which are obsolete in the new local-first desktop IDE architecture.

## 1. Files to Modify

| File | Action | Purpose |
| :--- | :--- | :--- |
| `frontend/src/services/api.ts` | **Delete/Gut** | This file connects to Spring Boot `/api/projects` and `/api/auth`. It is completely unnecessary for a local IDE. |
| `frontend/src/react-app/pages/Home.tsx` | **Refactor** | Remove any `getProjects()` calls or UI elements that depend on Cloud Projects loading. The IDE should default to the native folder picker. |
| `frontend/src/services/agentService.ts` | **Refactor** | Remove the fallback URL `|| 'http://localhost:8081'`. |
| `frontend/src/react-app/lib/config.ts` | **Refactor** | Delete `API_BASE_URL` entirely. |
| `frontend/src/services/workspaceService.ts` | **Refactor** | Remove the unused `BASE` variable pointing to `CONFIG.API_BASE_URL/workspace`. |

## 2. Endpoints to Replace
- `/api/projects/*`: **Delete**. Replaced by native OS folder picker.
- `/api/auth/*`: **Delete**. Replaced by local-first architecture (no auth needed).
- `/workspace`: **Delete**. Already replaced by Node.js in Phase 1.

## 3. Risks
- **UI Breakage:** If `Home.tsx` strictly requires a Cloud Project ID to mount the IDE workspace, removing `api.ts` could cause a white screen.
- **State Management Issues:** Redux/Zustand stores might expect user profiles or project lists.

## 4. Rollback Strategy
If the IDE fails to mount without Cloud Projects, the changes to `Home.tsx` and `api.ts` will be reverted via `git restore`.
