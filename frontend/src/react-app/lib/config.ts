import { invoke } from '@tauri-apps/api/core';
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

export async function initializeDynamicConfig() {
  try {
    const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
    if (isTauri) {
      let ports: [number | null, number | null] = [null, null];
      let attempts = 0;
      while ((ports[0] === null || ports[1] === null) && attempts < 100) {
          ports = await invoke('get_backend_ports') as [number | null, number | null];
          if (ports[0] !== null && ports[1] !== null) break;
          await new Promise(r => setTimeout(r, 100));
          attempts++;
      }
      if (ports[0]) {
        CONFIG.TERMINAL_WS_URL = `ws://localhost:${ports[0]}`;
        CONFIG.TERMINAL_SERVER_URL = `http://localhost:${ports[0]}`;
        CONFIG.TERMINAL_API_URL = `http://localhost:${ports[0]}`;
      }
      if (ports[1]) {
        CONFIG.PYTHON_API_URL = `http://localhost:${ports[1]}`;
        CONFIG.PYTHON_BACKEND_URL = `http://localhost:${ports[1]}`;
      }
    }
  } catch (e) { console.warn(e); }
}
