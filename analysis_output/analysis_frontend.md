
## Frontend Analysis

The frontend is a React-based application using Vite, TypeScript, Tailwind CSS, and Zustand for state management. It features a modern IDE layout with an integrated Monaco editor, a terminal powered by xterm.js, and an AI chat interface.

### Pages & Routing
The frontend uses `react-router` and is primarily a single-page application.
- **`Home.tsx`**: The main and only active entry point that orchestrates the IDE layout (Sidebar, Editor, Panels, Chat).
- **`App.tsx` & `main.tsx`**: Bootstrapping and context providers.

### Major Components
- **`Editor.tsx`**: Integrated Monaco editor for viewing and editing files.
- **`Sidebar.tsx`**: Includes sub-components like `SearchView.tsx`, `SourceControlView.tsx`, and `DebugView.tsx`.
- **`TerminalPanel.tsx`**: Uses `xterm.js` to render the terminal UI and connects to the backend terminal server via WebSockets.
- **`ChatPanel.tsx` / `ChatHistorySidebar.tsx`**: Integrated AI chat interface connecting to local models (Ollama).
- **Settings**: Several modals and views to configure extensions and AI parameters.

### Zustand Stores
- **`useIdeStore.ts`**: Manages IDE state (open files, active file, theme, panels).
- **`useChatStore.ts`**: Manages chat history and current conversation state.

### Monaco & Terminal Integrations
- **Monaco**: Heavily integrated in `Editor.tsx`, `DiffPreviewModal.tsx`, `aiCompletionService.ts`, and `lspClient.ts`.
- **Terminal (xterm.js)**: Integrated in `TerminalPanel.tsx`, `SettingsView.tsx`, `CommandPalette.tsx`, and `OutputPanel.tsx`.

### API Connections
The frontend communicates via HTTP fetch/axios and Socket.IO WebSockets.
- `API_BASE_URL` (`http://localhost:8081/api`): Java Spring Boot backend (Used for file system `fsService.ts` and legacy AI pull `ai/pull`).
- `TERMINAL_API_URL` / `TERMINAL_SERVER_URL` (`http://localhost:8082`): Node.js terminal server (Used for Workspace, Git, Debug, AI chat/agent, and Chat History).
- WebSockets (`ws://localhost:8082`): Connects exclusively to the Node.js terminal server for Terminal streams and Debugging streams.

### Dependencies
**Unused dependencies identified:**
- `file-extension-icon-js`
- `xterm-addon-attach`
- `eslint` (unused dev dependency since `eslint.config.js` exists but might be handled by other tools)
- `@tauri-apps/cli` (unused dev dependency, likely legacy or incomplete desktop packaging)
