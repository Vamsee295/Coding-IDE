# Migration Plan

This plan maps out the step-by-step removal of all remaining runtime dependencies on the Spring Boot backend (`http://localhost:8081`).

## 1. Frontend Call Audit

The following calls to `API_BASE_URL` (Spring Boot) currently exist in the frontend:

| Source File | Endpoint | Purpose | Target Migration |
| :--- | :--- | :--- | :--- |
| `fsService.ts` | `/fs/exists` | Check file existence | Node.js |
| `fsService.ts` | `/fs/list` | List directory contents | Node.js |
| `fsService.ts` | `/fs/read` | Read file contents | Node.js |
| `fsService.ts` | `/fs/write` | Write file contents | Node.js |
| `fsService.ts` | `/fs/createFolder`| Create directory | Node.js |
| `fsService.ts` | `/fs/delete` | Delete file/folder | Node.js |
| `fsService.ts` | `/fs/rename` | Rename file/folder | Node.js |
| `fsService.ts` | `/fs/search` | Grep/search files | Node.js |
| `SettingsView.tsx` | `/ai/models` | List AI models | Python |
| `SettingsView.tsx` | `/ai/pull` | Pull AI model | Python |
| `Home.tsx` | `/ai/stream` | Stream AI chat | Python |
| `api.ts` | `/projects/*` | Cloud Projects API | Remove |
| `api.ts` | `/auth/*` | User Auth API | Remove |

*(Note: Tauri APIs require enabling specific security scopes in `tauri.conf.json`. Since the Node.js server already runs locally and has full disk access via `fs`, migrating `fsService` to Node.js is the safest and most consistent path without altering desktop build configs.)*

## 2. Migration Order

To minimize breakage, the migration is split into targeted phases:

### Phase 1 (Current Phase): Disconnect Core Capabilities
1. **File System:** Implement `/fs/*` routes in Node.js `terminal-server` and redirect `fsService.ts` to `TERMINAL_API_URL/fs`.
2. **AI Settings:** Implement `/ai/models`, `/ai/pull`, and `/ai/stream` proxies in Python `app.py` and redirect the frontend calls to `http://localhost:5001`.

### Phase 2: Rip Out the "Cloud"
1. **Auth & Projects:** Remove `api.ts` calls to `/auth` and `/projects`.
2. **UI Cleanup:** Remove Login screens, Registration forms, and the Cloud Project selector from the React application.

### Phase 3: The Deletion
1. **Remove Backend:** Safely delete the `backend/` folder once `REMAINING_SPRING_DEPENDENCIES.md` is completely empty.
