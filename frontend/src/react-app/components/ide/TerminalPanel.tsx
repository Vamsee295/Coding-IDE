import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal as TerminalIcon, X, Plus, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";

const BACKEND_WS_URL = "ws://localhost:8081/api/terminal";

interface TerminalTab {
  id: string;
  name: string;
  isActive: boolean;
}

// One persistent shell session per tab
interface TabSession {
  terminal: Terminal;
  fitAddon: FitAddon;
  socket: WebSocket | null;
  inputBuffer: string;   // local line buffer (chars typed since last Enter)
  history: string[];     // command history
  historyIndex: number;  // current history position
}

interface TerminalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  cwd?: string;
}

export default function TerminalPanel({
  isVisible,
  onClose,
  height,
  onHeightChange,
  cwd,
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "terminal-1", name: "PowerShell", isActive: true },
  ]);

  const sessions = useRef<Map<string, TabSession>>(new Map());
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // ─── WebSocket ──────────────────────────────────────────────────────────

  const connectWebSocket = useCallback((_tabId: string, session: TabSession, currentCwd?: string) => {
    let wsUrl = BACKEND_WS_URL;
    if (currentCwd) {
      wsUrl += `?cwd=${encodeURIComponent(currentCwd)}`;
    }
    const ws = new WebSocket(wsUrl);
    session.socket = ws;

    ws.onmessage = (event: MessageEvent) => {
      // All shell output (including the PS prompt) arrives here — write directly
      session.terminal.write(event.data as string);
    };

    ws.onerror = () => {
      session.terminal.write(
        "\r\n\u001B[1;31m[WebSocket Error]\u001B[0m Cannot connect to backend at " +
        BACKEND_WS_URL +
        "\r\nMake sure Spring Boot is running.\r\n"
      );
    };

    ws.onclose = () => {
      session.terminal.write("\r\n\u001B[90m[Session closed]\u001B[0m\r\n");
    };
  }, []);

  // ─── Session creation ────────────────────────────────────────────────────

  const createSession = useCallback(
    (tabId: string, container: HTMLDivElement): TabSession => {
      const term = new Terminal({
        fontFamily: '"Cascadia Code", "Cascadia Mono", "Fira Code", "JetBrains Mono", monospace',
        fontSize: 13,
        lineHeight: 1.45,
        cursorBlink: true,
        cursorStyle: "bar",
        allowTransparency: true,
        scrollback: 10000,
        theme: {
          background: "#0f111a",
          foreground: "#cdd6f4",
          cursor: "#cdd6f4",
          selectionBackground: "#45475a",
          black: "#45475a",
          red: "#f38ba8",
          green: "#a6e3a1",
          yellow: "#f9e2af",
          blue: "#89b4fa",
          magenta: "#cba6f7",
          cyan: "#89dceb",
          white: "#bac2de",
          brightBlack: "#585b70",
          brightRed: "#f38ba8",
          brightGreen: "#a6e3a1",
          brightYellow: "#f9e2af",
          brightBlue: "#89b4fa",
          brightMagenta: "#cba6f7",
          brightCyan: "#89dceb",
          brightWhite: "#a6adc8",
        },
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(container);

      requestAnimationFrame(() => {
        try { fitAddon.fit(); } catch (_) { }
      });

      const session: TabSession = {
        terminal: term,
        fitAddon,
        socket: null,
        inputBuffer: "",
        history: [],
        historyIndex: -1,
      };

      // ── Key / character input handling ──────────────────────────────────
      term.onData((data: string) => {
        const code = data.charCodeAt(0);

        if (code === 13) {
          // ↵ Enter — echo newline locally, send command to shell
          const command = session.inputBuffer;
          term.write("\r\n");

          if (command.trim()) {
            session.history.unshift(command);
            if (session.history.length > 500) session.history.pop();
          }
          session.historyIndex = -1;
          session.inputBuffer = "";

          if (session.socket?.readyState === WebSocket.OPEN) {
            session.socket.send(command);
          } else {
            term.write(
              "\u001B[1;31m[Not connected]\u001B[0m Backend server is not running.\r\n"
            );
          }

        } else if (code === 127) {
          // ⌫ Backspace
          if (session.inputBuffer.length > 0) {
            session.inputBuffer = session.inputBuffer.slice(0, -1);
            term.write("\b \b");
          }

        } else if (data === "\u001B[A") {
          // ↑ Arrow — history prev
          const next = Math.min(session.historyIndex + 1, session.history.length - 1);
          if (session.history[next] !== undefined) {
            // Erase current input
            term.write("\b \b".repeat(session.inputBuffer.length));
            session.inputBuffer = session.history[next];
            session.historyIndex = next;
            term.write(session.inputBuffer);
          }

        } else if (data === "\u001B[B") {
          // ↓ Arrow — history next
          const prev = session.historyIndex - 1;
          term.write("\b \b".repeat(session.inputBuffer.length));
          if (prev >= 0 && session.history[prev] !== undefined) {
            session.inputBuffer = session.history[prev];
            session.historyIndex = prev;
          } else {
            session.inputBuffer = "";
            session.historyIndex = -1;
          }
          term.write(session.inputBuffer);

        } else if (data === "\u001B[C" || data === "\u001B[D") {
          // ← → Arrow — ignore (cursor movement not implemented)
        } else if (data === "\u0003") {
          // Ctrl+C — send interrupt signal
          if (session.socket?.readyState === WebSocket.OPEN) {
            session.socket.send("\u0003"); // will be sent to shell
          }
          term.write("^C\r\n");
          session.inputBuffer = "";
          session.historyIndex = -1;

        } else if (code >= 32) {
          // Printable character — echo locally + buffer
          session.inputBuffer += data;
          term.write(data);
        }
      });

      sessions.current.set(tabId, session);
      connectWebSocket(tabId, session, cwd);
      return session;
    },
    [connectWebSocket, cwd]
  );

  const destroySession = useCallback((tabId: string) => {
    const session = sessions.current.get(tabId);
    if (session) {
      session.socket?.close();
      session.terminal.dispose();
      sessions.current.delete(tabId);
    }
  }, []);

  // ─── Tab management ─────────────────────────────────────────────────────

  const activeTabId = tabs.find((t) => t.isActive)?.id;

  const handleNewTab = () => {
    const newId = `terminal-${Date.now()}`;
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, isActive: false })),
      { id: newId, name: "PowerShell", isActive: true },
    ]);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    destroySession(tabId);
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (filtered.length > 0 && prev.find((t) => t.id === tabId)?.isActive) {
        filtered[filtered.length - 1].isActive = true;
      }
      return filtered;
    });
  };

  const handleSelectTab = (tabId: string) => {
    setTabs((prev) => prev.map((t) => ({ ...t, isActive: t.id === tabId })));
    setTimeout(() => {
      const s = sessions.current.get(tabId);
      if (s) {
        try { s.fitAddon.fit(); } catch (_) { }
        s.terminal.focus();
      }
    }, 30);
  };

  const handleClearTerminal = () => {
    if (activeTabId) sessions.current.get(activeTabId)?.terminal.clear();
  };

  // ─── Resize drag ─────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = resizeStartY.current - e.clientY;
      onHeightChange(Math.max(150, Math.min(700, resizeStartHeight.current + delta)));
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [onHeightChange]);

  // ─── xterm.js mount / tab switch ────────────────────────────────────────

  useEffect(() => {
    if (!isVisible || !terminalContainerRef.current || !activeTabId) return;

    const container = terminalContainerRef.current;
    let session = sessions.current.get(activeTabId);

    if (!session) {
      session = createSession(activeTabId, container);
    } else {
      try { session.fitAddon.fit(); } catch (_) { }
    }
    session.terminal.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, activeTabId, height]);

  // Refit all on height change
  useEffect(() => {
    sessions.current.forEach((s) => {
      try { s.fitAddon.fit(); } catch (_) { }
    });
  }, [height]);

  // Cleanup all sessions on unmount
  useEffect(() => {
    return () => { sessions.current.forEach((_, id) => destroySession(id)); };
  }, [destroySession]);

  if (!isVisible) return null;

  return (
    <div
      className="bg-ide-bg border-t border-ide-border flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-ide-border hover:bg-indigo-500 cursor-row-resize transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "h-7 flex items-center gap-2 px-3 rounded-t text-xs transition-colors cursor-pointer group",
                tab.isActive
                  ? "bg-ide-bg text-ide-text-primary"
                  : "text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
              )}
              onClick={() => handleSelectTab(tab.id)}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-ide-border opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewTab}
            className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
            title="New Terminal Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearTerminal}
            className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
            title="Hide Terminal"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* xterm.js renders here */}
      <div
        ref={terminalContainerRef}
        className="flex-1 min-h-0 overflow-hidden"
        style={{ padding: "4px 4px 0 4px" }}
      />
    </div>
  );
}
