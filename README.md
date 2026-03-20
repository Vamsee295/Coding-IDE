# OLLAMA AI

OLLAMA AI is a modern, web-based Integrated Development Environment (IDE) built with a React frontend and a Spring Boot backend. It features a real-time terminal, local file system access, and integrated AI chat powered by Ollama.

## 🚀 Key Features

- **Interactive Terminal**: A fully functional xterm.js-based terminal connected via WebSockets to the host system shell.
- **Local Folder Access**: Open and manage your local projects directly in the browser using the File System Access API with a robust directory-picker fallback.
- **AI-Powered Chat**: Integrated chat interface connecting to your local Ollama instance for coding assistance.
- **Beautiful UI**: Premium dark-themed IDE interface with multi-tab terminal support and integrated file explorer.

## 🛠️ Architecture

- **Frontend**: React, Vite, TypeScript, xterm.js, Tailwind CSS.
- **Backend**: Spring Boot, Java 21, MySQL, WebSocket.
- **AI**: Local Ollama instance (`http://localhost:11434`).

## 🏁 Quick Start

### Prerequisites

- **Node.js**: v18+
- **Java**: 21+
- **MySQL**: 8.0+
- **Ollama**: (Optional) For AI features.

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Configure your database in `src/main/resources/application.properties`.
3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   pnpm install
   # or npm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

## ⚠️ Security Note

The current terminal implementation is designed for **local development use only**. It grants the web interface direct access to execute commands on the host system shell. **Do not expose this application to the public internet without proper sandboxing or containerization.**
