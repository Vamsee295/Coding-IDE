import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal as TerminalIcon, X, Plus, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";

const BACKEND_WS_URL = "ws://localhost:8080/terminal";

interface TerminalTab {
  id: string;
  name: string;
  isActive: boolean;
}

interface TabSession {
  terminal: Terminal;
  fitAddon: FitAddon;
  socket: WebSocket | null;
  inputBuffer: string;
  history: string[];
  historyIndex: number;
  cwd: string;
}

interface TerminalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
}

export default function TerminalPanel({
  isVisible,
  onClose,
  height,
  onHeightChange,
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "terminal-1", name: "Shell 1", isActive: true },
  ]);

  const sessions = useRef<Map<string, TabSession>>(new Map());
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // ---------- Helpers ----------

  const promptString = (cwd: string) =>
    `\r\n\u001B[1;32mstackflow\u001B[0m:\u001B[1;34m${cwd || "~"}\u001B[0m$ `;

  const writePrompt = (session: TabSession) => {
    session.terminal.write(promptString(session.cwd));
  };

  const connectWebSocket = useCallback((_tabId: string, session: TabSession) => {
    const ws = new WebSocket(BACKEND_WS_URL);
    session.socket = ws;

    ws.onopen = () => {
      // Backend sends welcome message itself
    };

    ws.onmessage = (event: MessageEvent) => {
      const data = event.data as string;
      session.terminal.write(data);
    };

    ws.onerror = () => {
      session.terminal.write(
        "\r\n\u001B[1;31m[WebSocket Error]\u001B[0m Cannot connect to backend at " +
        BACKEND_WS_URL +
        "\r\nMake sure the Spring Boot server is running.\r\n"
      );
      writePrompt(session);
    };

    ws.onclose = () => {
      session.terminal.write("\r\n\u001B[90m[Session closed]\u001B[0m\r\n");
    };
  }, []);

  const createSession = useCallback(
    (tabId: string, container: HTMLDivElement): TabSession => {
      const term = new Terminal({
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        cursorStyle: "bar",
        theme: {
          background: "#0f111a",
          foreground: "#cdd6f4",
          cursor: "#cdd6f4",
          selectionBackground: "#313244",
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
        allowTransparency: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(container);

      requestAnimationFrame(() => {
        try { fitAddon.fit(); } catch (e) { /* ignore */ }
      });

      const session: TabSession = {
        terminal: term,
        fitAddon,
        socket: null,
        inputBuffer: "",
        history: [],
        historyIndex: -1,
        cwd: "~",
      };

      // Input handling
      term.onData((data: string) => {
        const code = data.charCodeAt(0);

        if (code === 13) {
          // Enter → send command
          const command = session.inputBuffer.trim();
          term.write("\r\n");

          if (command) {
            session.history.unshift(command);
            if (session.history.length > 200) session.history.pop();
            session.historyIndex = -1;

            if (session.socket && session.socket.readyState === WebSocket.OPEN) {
              session.socket.send(command);

              // If it was a cd command, update cwd display after short delay
              if (command.toLowerCase().startsWith("cd")) {
                const parts = command.split(/\s+/, 2);
                if (parts.length === 2) {
                  const target = parts[1];
                  if (target === ".." || target === "../") {
                    const segments = session.cwd.replace(/\\/g, "/").split("/");
                    segments.pop();
                    session.cwd = segments.join("/") || "~";
                  } else if (target === "~") {
                    session.cwd = "~";
                  } else {
                    session.cwd = target;
                  }
                }
              }
            } else {
              term.write("\u001B[1;31m[Not connected]\u001B[0m Backend server is not running.\r\n");
            }
            // Prompt is written after server responds; write it after a tick
            // (server sends output first, then we write prompt on ws message end)
            writePrompt(session);
          } else {
            writePrompt(session);
          }
          session.inputBuffer = "";
        } else if (code === 127) {
          // Backspace
          if (session.inputBuffer.length > 0) {
            session.inputBuffer = session.inputBuffer.slice(0, -1);
            term.write("\b \b");
          }
        } else if (data === "\u001B[A") {
          // Arrow up — history
          const nextIdx = Math.min(
            session.historyIndex + 1,
            session.history.length - 1
          );
          if (nextIdx >= 0 && session.history[nextIdx]) {
            // Clear current input
            term.write("\b \b".repeat(session.inputBuffer.length));
            session.inputBuffer = session.history[nextIdx];
            session.historyIndex = nextIdx;
            term.write(session.inputBuffer);
          }
        } else if (data === "\u001B[B") {
          // Arrow down — history
          const nextIdx = session.historyIndex - 1;
          term.write("\b \b".repeat(session.inputBuffer.length));
          if (nextIdx >= 0 && session.history[nextIdx]) {
            session.inputBuffer = session.history[nextIdx];
            session.historyIndex = nextIdx;
          } else {
            session.inputBuffer = "";
            session.historyIndex = -1;
          }
          term.write(session.inputBuffer);
        } else if (data === "\u001B[C" || data === "\u001B[D") {
          // Arrow left/right — ignore for simplicity
        } else if (code >= 32) {
          // Printable character
          session.inputBuffer += data;
          term.write(data);
        }
      });

      sessions.current.set(tabId, session);
      connectWebSocket(tabId, session);
      return session;
    },
    [connectWebSocket]
  );

  const destroySession = useCallback((tabId: string) => {
    const session = sessions.current.get(tabId);
    if (session) {
      session.socket?.close();
      session.terminal.dispose();
      sessions.current.delete(tabId);
    }
  }, []);

  // ---------- Tab management ----------

  const activeTabId = tabs.find((t) => t.isActive)?.id;

  const handleNewTab = () => {
    const newId = `terminal-${Date.now()}`;
    const newName = `Shell ${tabs.length + 1}`;
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, isActive: false })),
      { id: newId, name: newName, isActive: true },
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
    // Refit the selected tab's terminal
    setTimeout(() => {
      const session = sessions.current.get(tabId);
      if (session) {
        try { session.fitAddon.fit(); } catch (e) { /* ignore */ }
        session.terminal.focus();
      }
    }, 50);
  };

  // ---------- Resize drag ----------

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = resizeStartY.current - e.clientY;
      const newHeight = Math.max(150, Math.min(700, resizeStartHeight.current + delta));
      onHeightChange(newHeight);
    };
    const handleMouseUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onHeightChange]);

  // ---------- xterm mount / switch ----------

  useEffect(() => {
    if (!isVisible || !terminalContainerRef.current || !activeTabId) return;

    // Clear the container and mount the active session's terminal
    const container = terminalContainerRef.current;

    // Detach all terminals (we re-open in the container)
    // xterm.js doesn't support re-parenting easily; we use display:none trick via session elements
    let session = sessions.current.get(activeTabId);
    if (!session) {
      session = createSession(activeTabId, container);
    } else {
      // Re-fit on switch/resize
      try { session.fitAddon.fit(); } catch (_) { }
    }

    session.terminal.focus();

    // Refit when height changes
    const raf = requestAnimationFrame(() => {
      sessions.current.forEach((s) => {
        try { s.fitAddon.fit(); } catch (_) { }
      });
    });

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, activeTabId, height]);

  // Cleanup all sessions on unmount
  useEffect(() => {
    return () => {
      sessions.current.forEach((_, id) => destroySession(id));
    };
  }, [destroySession]);

  const handleClearTerminal = () => {
    if (activeTabId) {
      const session = sessions.current.get(activeTabId);
      session?.terminal.clear();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="bg-ide-bg border-t border-ide-border flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-ide-border hover:bg-indigo-500 cursor-row-resize transition-colors"
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
              <TerminalIcon className="w-3.5 h-3.5" />
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
            title="New Terminal"
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

      {/* xterm.js container */}
      <div
        ref={terminalContainerRef}
        className="flex-1 min-h-0 overflow-hidden"
        style={{ padding: "4px" }}
      />
    </div>
  );
}
