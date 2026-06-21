/**
 * Application configuration
 * Native fallback support using Vite's import.meta.env 
 */

export const CONFIG = {
  TERMINAL_WS_URL: import.meta.env.VITE_TERMINAL_WS_URL || 'ws://localhost:8082',
  TERMINAL_SERVER_URL: 'http://localhost:8082',
  TERMINAL_API_URL: import.meta.env.VITE_TERMINAL_API_URL || 'http://localhost:8082',
  PYTHON_API_URL: 'http://localhost:5001',
  OLLAMA_DEFAULT_ENDPOINT: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
};

export default CONFIG;
