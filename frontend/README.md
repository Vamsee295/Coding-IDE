# StackFlow-IDE — Frontend

The frontend of StackFlow-IDE is a React-based application built with Vite and TypeScript. It provides a rich, interactive interface for code editing, terminal usage, and AI integration.

## 🛠️ Technology Stack

- **Framework**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Terminal**: [xterm.js](https://xtermjs.org/)
- **Styling**: Vanilla CSS + [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## ✨ Key Components

### Terminal UI (`TerminalPanel.tsx`)
- Uses **xterm.js** for high-performance terminal rendering.
- Connects to the backend via **WebSockets** at `ws://localhost:8080/terminal`.
- Supports multi-tab terminal sessions.
- Features command history and local input buffering for a smooth experience.

### Folder Access (`fileSystemHelper.ts`)
- Utilizes the **File System Access API** (`window.showDirectoryPicker`) for direct local folder access.
- Implements a fallback using `<input type="file" webkitdirectory />` for browsers without native API support.

### AI Integration
- Direct connection to a local **Ollama** server.
- Handles chat history and streaming responses.

## 🚀 Getting Started

### Installation

```bash
pnpm install
# or
npm install
```

### Development

```bash
pnpm dev
```

### Production Build

```bash
npm run build
```

## ⚙️ Configuration

- **Ollama URL**: Configured in `TerminalPanel.tsx` (Note: In a real production app, this would be an environment variable).
- **Backend WebSocket**: Points to `ws://localhost:8080/terminal`.
