/**
 * debugService.ts
 * 
 * Frontend DAP (Debug Adapter Protocol) client.
 * Connects to the terminal-server /debug namespace via socket.io
 * and provides a clean API for the IDE debugger UI.
 */

import { io, Socket } from 'socket.io-client';

import { CONFIG } from '@/react-app/lib/config';

const BACKEND_WS_URL = CONFIG.TERMINAL_WS_URL;

export type DebugEvent =
    | { type: 'stopped'; reason: string; threadId?: number; line?: number; filePath?: string }
    | { type: 'continued' }
    | { type: 'output'; category: string; output: string }
    | { type: 'terminated' }
    | { type: 'initialized' }
    | { type: 'error'; message: string };

type DebugEventListener = (event: DebugEvent) => void;

class DebugService {
    private socket: Socket | null = null;
    private listeners: DebugEventListener[] = [];
    private _sessionId: string | null = null;
    private isActive = false;

    /** Subscribe to debug events */
    onEvent(listener: DebugEventListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emit(event: DebugEvent) {
        this.listeners.forEach(l => l(event));
    }

    /** Start a debug session */
    async launch(options: { language: string; filePath: string; args?: string[] }) {
        if (this.socket) this.disconnect();

        // We use a separate socket.io namespace for debug
        this.socket = io(`${BACKEND_WS_URL}/debug`, {
            transports: ['websocket'],
            reconnection: false,
        });

        this.socket.on('connect', () => {
            console.log('[DebugService] Connected to debug adapter relay');
            this.socket?.emit('debug:launch', options);
        });

        this.socket.on('debug:event', (event: DebugEvent) => {
            this.emit(event);
        });

        this.socket.on('debug:initialized', ({ sessionId }: { sessionId: string }) => {
            this._sessionId = sessionId;
            this.isActive = true;
            this.emit({ type: 'initialized' });
        });

        this.socket.on('connect_error', (err: Error) => {
            this.emit({ type: 'error', message: `DAP connection failed: ${err.message}` });
        });

        this.socket.on('disconnect', () => {
            this.isActive = false;
            this.emit({ type: 'terminated' });
        });
    }

    /** Set breakpoints for a file */
    setBreakpoints(filePath: string, lines: number[]) {
        if (!this.socket || !this.isActive) return;
        this.socket.emit('debug:breakpoints', { filePath, lines });
    }

    /** Continue execution */
    continue() {
        if (!this.socket || !this.isActive) return;
        this.socket.emit('debug:continue');
    }

    /** Step Over (F10) */
    stepOver() {
        if (!this.socket || !this.isActive) return;
        this.socket.emit('debug:stepOver');
    }

    /** Step Into (F11) */
    stepInto() {
        if (!this.socket || !this.isActive) return;
        this.socket.emit('debug:stepInto');
    }

    /** Step Out (Shift+F11) */
    stepOut() {
        if (!this.socket || !this.isActive) return;
        this.socket.emit('debug:stepOut');
    }

    /** Pause execution */
    pause() {
        if (!this.socket || !this.isActive) return;
        this.socket.emit('debug:pause');
    }

    /** Stop and disconnect */
    disconnect() {
        if (this.socket) {
            this.socket.emit('debug:stop');
            this.socket.disconnect();
            this.socket = null;
        }
        this.isActive = false;
        this._sessionId = null;
    }

    get active() { return this.isActive; }
}

export const debugService = new DebugService();
