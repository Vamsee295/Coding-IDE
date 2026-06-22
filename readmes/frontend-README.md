# StackFlow IDE — Frontend

The frontend of StackFlow IDE is a modern, high-performance web-based desktop editor interface built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**. It provides a fully-fledged IDE interface containing a multi-tab Monaco editor, xterm.js terminals, workspace file explorer, and a unified AI assistant chat.

## 🛠️ Technology Stack

- **Framework**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Terminal Rendering**: [xterm.js](https://xtermjs.org/)
- **Code Editor**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
- **Styling**: Tailwind CSS + Vanilla CSS
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🔌 Connection & Architecture

The frontend communicates with a decoupled dual-service backend:
1. **Node.js Core Service (`terminal-server`)**: Runs on `http://localhost:8082`.
   - The frontend reads/writes files via HTTP REST endpoints at `/fs/*`.
   - The terminal component connects via Socket.io/WebSockets to stream shell input/output dynamically.
   - Provides LSP (Language Server Protocol) support for code completion and syntax analysis.
2. **Python AI Engine (`python-backend`)**: Runs on `http://localhost:5001`.
   - Proxies requests to local Ollama instance (`http://localhost:11434`) for model listing, pulling, and chat streaming.
   - Coordinates FAISS semantic indexing and screenshot analysis.

These configurations are defined in the environment file:
- [`.env.development`](../frontend/.env.development)
  ```env
  VITE_API_BASE_URL=http://localhost:8081/api
  VITE_TERMINAL_API_URL=http://localhost:8082
  VITE_TERMINAL_WS_URL=http://localhost:8082
  VITE_OLLAMA_BASE_URL=http://localhost:11434
  ```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+
- **pnpm** (preferred) or **npm**

### 2. Installation
Navigate to the `frontend` folder and install dependencies:
```bash
cd frontend
pnpm install
# or
npm install
```

### 3. Running in Development Mode
Start the Vite dev server locally:
```bash
cd frontend
pnpm dev
# or
npm run dev
```
By default, the UI will be accessible at [http://localhost:5173](http://localhost:5173).

### 4. Production Build
To compile and bundle the frontend assets for production deployment:
```bash
cd frontend
pnpm build
# or
npm run build
```
The output directory will be `dist/`.
