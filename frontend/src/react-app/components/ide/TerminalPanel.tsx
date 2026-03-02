import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Terminal as TerminalIcon, X, Plus, ChevronDown, Trash2, Play, Download } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { useExtensions } from "@/react-app/contexts/ExtensionContext";

const BACKEND_WS_URL = "http://localhost:8082";
const BACKEND_API_URL = "http://localhost:8081/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TerminalTab {
  id: string;          // local tab id (used as React key)
  terminalId: string;  // backend PTY id (empty until "terminal-created" arrives)
  name: string;
  cwd: string;
  isActive: boolean;
}

interface TabSession {
  terminal: Terminal;
  fitAddon: FitAddon;
}

export interface TerminalPanelHandle {
  /** Open a brand-new terminal tab rooted at `path`. */
  openTerminalForWorkspace: (path: string) => void;
  /** Run a direct command string in the active terminal. */
  executeCommand: (command: string) => void;
}

interface TerminalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  /** Initial workspace path — used only for the very first terminal. */
  initialCwd?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TerminalPanel
// ─────────────────────────────────────────────────────────────────────────────

const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanelInner({
  isVisible,
  onClose,
  height,
  onHeightChange,
  initialCwd,
}, ref) {
  const { isExtensionEnabled } = useExtensions();

  const runnerEnabled = isExtensionEnabled("auto-runner");
  const langManagerEnabled = isExtensionEnabled("language-manager");

  const AVAILABLE_QUICK_COMMANDS = [
    { label: "▶  Run Project", command: "autoRun", icon: <Play className="w-3.5 h-3.5" />, enabled: runnerEnabled },
    { label: "📦 Install Dependencies", command: "autoRun", icon: <Download className="w-3.5 h-3.5" />, enabled: runnerEnabled },
    { label: "⬇  Install Node.js", command: "installNode", icon: null, enabled: langManagerEnabled },
    { label: "⬇  Install Python 3", command: "installPython", icon: null, enabled: langManagerEnabled },
    { label: "⬇  Install Java 21", command: "installJava", icon: null, enabled: langManagerEnabled },
    { label: "⬇  Install Maven", command: "installMaven", icon: null, enabled: langManagerEnabled },
  ].filter(cmd => cmd.enabled);

  // ── State ─────────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [showQuickCommands, setShowQuickCommands] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  /** xterm sessions keyed by tab.id (local) */
  const sessions = useRef<Map<string, TabSession>>(new Map());
  /** Backend PTY terminalId keyed by tab.id (local) */
  const terminalIds = useRef<Map<string, string>>(new Map());

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  /** Single shared Socket.io connection */
  const socketRef = useRef<Socket | null>(null);

  /** Callbacks awaiting a `terminal-created` response — keyed by pending tabId */
  const pendingCreations = useRef<Map<string, (terminalId: string) => void>>(new Map());

  // ── Socket Setup (one connection shared across all tabs) ──────────────────

  useEffect(() => {
    const socket = io(BACKEND_WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[TerminalPanel] Socket connected:", socket.id);
    });

    // Route output to the correct xterm instance
    socket.on("terminal-output", ({ terminalId, data }: { terminalId: string; data: string | ArrayBuffer }) => {
      // Find the tab that owns this terminalId
      let ownerTabId: string | undefined;
      terminalIds.current.forEach((tid, tabId) => {
        if (tid === terminalId) ownerTabId = tabId;
      });
      if (!ownerTabId) return;
      const session = sessions.current.get(ownerTabId);
      if (!session) return;
      if (typeof data === "string") {
        session.terminal.write(data);
      } else if (data instanceof ArrayBuffer) {
        session.terminal.write(new Uint8Array(data));
      }
    });

    // Backend confirmed PTY creation — resolve the pending callback
    socket.on("terminal-created", ({ terminalId }: { terminalId: string }) => {
      console.log("[TerminalPanel] terminal-created:", terminalId);
      // Find which local tab was waiting for this — match via pendingCreations
      // We use a simple FIFO model: first pending creation gets the first response
      const firstKey = [...pendingCreations.current.keys()][0];
      if (firstKey) {
        const resolve = pendingCreations.current.get(firstKey)!;
        pendingCreations.current.delete(firstKey);
        resolve(terminalId);
      }
    });

    socket.on("connect_error", (err) => {
      console.error("[TerminalPanel] Connection error:", err.message);
    });

    socket.on("disconnect", () => {
      console.log("[TerminalPanel] Socket disconnected.");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── xterm Session Helpers ─────────────────────────────────────────────────

  const createXtermSession = useCallback((container: HTMLDivElement): TabSession => {
    const term = new Terminal({
      fontFamily: '"Cascadia Code", "Cascadia Mono", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.45,
      cursorBlink: true,
      cursorStyle: "bar",
      allowTransparency: true,
      scrollback: 10000,
      convertEol: false,
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
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(container);
    requestAnimationFrame(() => { try { fitAddon.fit(); } catch (_) { } });

    return { terminal: term, fitAddon };
  }, []);

  /** Create backend PTY + xterm session for a tab. */
  const spawnTerminalForTab = useCallback((tabId: string, cwd: string, container: HTMLDivElement) => {
    const session = createXtermSession(container);
    sessions.current.set(tabId, session);

    // Route keystrokes → backend PTY (by terminalId)
    session.terminal.onData((data) => {
      const terminalId = terminalIds.current.get(tabId);
      if (terminalId && socketRef.current?.connected) {
        socketRef.current.emit("terminal-input", { terminalId, data });
      }
    });

    // Route resize → backend PTY
    session.terminal.onResize(({ cols, rows }) => {
      const terminalId = terminalIds.current.get(tabId);
      if (terminalId && socketRef.current?.connected) {
        socketRef.current.emit("resize", { terminalId, cols, rows });
      }
    });

    // Ask backend to spawn a real PTY in `cwd`
    const emitCreate = () => {
      if (!socketRef.current?.connected) {
        // Retry once the socket connects
        socketRef.current?.once("connect", () => emitCreate());
        return;
      }

      // Register a resolver that will be called when backend confirms creation
      pendingCreations.current.set(tabId, (terminalId: string) => {
        terminalIds.current.set(tabId, terminalId);
        // Now that we have the real terminalId, emit the initial resize
        try {
          session.fitAddon.fit();
          socketRef.current?.emit("resize", {
            terminalId,
            cols: session.terminal.cols,
            rows: session.terminal.rows,
          });
        } catch (_) { }
      });

      const folderName = cwd.split(/[/\\]/).filter(Boolean).pop() || "Terminal";
      socketRef.current.emit("create-terminal", { cwd, name: folderName });
    };

    emitCreate();
    return session;
  }, [createXtermSession]);

  const destroySession = useCallback((tabId: string) => {
    const terminalId = terminalIds.current.get(tabId);
    if (terminalId && socketRef.current?.connected) {
      socketRef.current.emit("kill-terminal", { terminalId });
    }
    terminalIds.current.delete(tabId);
    pendingCreations.current.delete(tabId);
    const session = sessions.current.get(tabId);
    if (session) {
      session.terminal.dispose();
      sessions.current.delete(tabId);
    }
  }, []);

  // ── Public API (imperative handle) ────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    openTerminalForWorkspace: (path: string) => {
      if (!path) return;
      const folderName = path.split(/[/\\]/).filter(Boolean).pop() || "Terminal";
      const newId = `terminal-${Date.now()}`;
      const newTab: TerminalTab = {
        id: newId,
        terminalId: "",
        name: folderName,
        cwd: path,
        isActive: true,
      };
      setTabs(prev => [...prev.map(t => ({ ...t, isActive: false })), newTab]);
    },
    executeCommand: (command: string) => {
      const activeTabId = tabs.find(t => t.isActive)?.id;
      if (!activeTabId) return;
      const terminalId = terminalIds.current.get(activeTabId);
      if (terminalId && socketRef.current?.connected) {
        socketRef.current.emit("terminal-input", { terminalId, data: command + "\n" });
      }
    }
  }), [tabs]);

  // ── First terminal on mount (for initial project) ─────────────────────────

  const initialBootRef = useRef(false);
  useEffect(() => {
    if (initialBootRef.current || !initialCwd || tabs.length > 0) return;
    initialBootRef.current = true;
    const folderName = initialCwd.split(/[/\\]/).filter(Boolean).pop() || "PowerShell";
    const newId = `terminal-initial-${Date.now()}`;
    setTabs([{ id: newId, terminalId: "", name: folderName, cwd: initialCwd, isActive: true }]);
  }, [initialCwd, tabs.length]);

  // ── Mount xterm when a new tab becomes active ─────────────────────────────

  const activeTabId = tabs.find(t => t.isActive)?.id;

  useEffect(() => {
    if (!isVisible || !terminalContainerRef.current || !activeTabId) return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    const container = terminalContainerRef.current;

    if (!sessions.current.has(activeTabId)) {
      // Brand new tab — spawn PTY + xterm
      spawnTerminalForTab(activeTabId, activeTab.cwd, container);
    } else {
      // Existing session — just re-fit
      try { sessions.current.get(activeTabId)!.fitAddon.fit(); } catch (_) { }
    }
    sessions.current.get(activeTabId)?.terminal.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, activeTabId, height, tabs.length]);

  useEffect(() => { sessions.current.forEach(s => { try { s.fitAddon.fit(); } catch (_) { } }); }, [height]);
  useEffect(() => { return () => { sessions.current.forEach((_, id) => destroySession(id)); }; }, [destroySession]);

  // ── Quick Commands ────────────────────────────────────────────────────────

  const executeQuickCommand = async (commandName: string) => {
    setShowQuickCommands(false);
    const activeTab = tabs.find(t => t.isActive);
    try {
      await axios.post(`${BACKEND_API_URL}/commands/${commandName}`, {
        cwd: activeTab?.cwd || "",
      });
    } catch {
      // streaming output arrives via WebSocket
    }
  };

  // ── Tab Management ────────────────────────────────────────────────────────

  const handleNewTab = () => {
    const activeCwd = tabs.find(t => t.isActive)?.cwd || "";
    const folderName = activeCwd.split(/[/\\]/).filter(Boolean).pop() || "PowerShell";
    const newId = `terminal-${Date.now()}`;
    setTabs(prev => [
      ...prev.map(t => ({ ...t, isActive: false })),
      { id: newId, terminalId: "", name: folderName, cwd: activeCwd, isActive: true },
    ]);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    destroySession(tabId);
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (filtered.length > 0 && prev.find(t => t.id === tabId)?.isActive) {
        filtered[filtered.length - 1] = { ...filtered[filtered.length - 1], isActive: true };
      }
      return filtered;
    });
  };

  const handleSelectTab = (tabId: string) => {
    setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === tabId })));
    setTimeout(() => {
      const s = sessions.current.get(tabId);
      if (s) { try { s.fitAddon.fit(); } catch (_) { } s.terminal.focus(); }
    }, 30);
  };

  const handleClearTerminal = () => {
    if (activeTabId) sessions.current.get(activeTabId)?.terminal.clear();
  };

  // ── Resize Handle ─────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isVisible) return null;

  return (
    <div className="bg-ide-bg border-t border-ide-border flex flex-col" style={{ height: `${height}px` }}>
      {/* Resize Handle */}
      <div className="h-1 bg-ide-border hover:bg-indigo-500 cursor-row-resize transition-colors flex-shrink-0" onMouseDown={handleMouseDown} />

      {/* Tab Bar */}
      <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={cn(
                "h-7 flex items-center gap-2 px-3 rounded-t text-xs transition-colors cursor-pointer group flex-shrink-0",
                tab.isActive
                  ? "bg-ide-bg text-ide-text-primary"
                  : "text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
              )}
              onClick={() => handleSelectTab(tab.id)}
              title={tab.cwd}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="max-w-[120px] truncate">{tab.name}</span>
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
          <Button variant="ghost" size="icon" onClick={handleNewTab} className="h-6 w-6 flex-shrink-0 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover" title="New Terminal">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Quick Commands */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickCommands(p => !p)}
              className="h-6 px-2 text-xs text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover flex items-center gap-1"
              title="Quick Commands"
            >
              <Play className="w-3 h-3 text-green-400" />
              <span className="hidden sm:inline">Quick Commands</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showQuickCommands && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#1a1d2e] border border-ide-border rounded-lg shadow-2xl z-50 overflow-hidden">
                {AVAILABLE_QUICK_COMMANDS.length === 0 ? (
                  <div className="px-3 py-2 text-[10px] text-ide-text-secondary italic bg-ide-sidebar">
                    No quick commands available. Enable extensions in settings.
                  </div>
                ) : (
                  AVAILABLE_QUICK_COMMANDS.map(qc => (
                    <button
                      key={qc.command + qc.label}
                      onClick={() => executeQuickCommand(qc.command)}
                      className="w-full text-left px-3 py-2 text-xs text-ide-text-secondary hover:bg-ide-hover hover:text-ide-text-primary transition-colors flex items-center gap-2"
                    >
                      {qc.icon}
                      {qc.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={handleClearTerminal} className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover" title="Clear Terminal">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover" title="Hide Terminal">
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* xterm.js renders here */}
      <div ref={terminalContainerRef} className="flex-1 min-h-0 overflow-hidden" style={{ padding: "4px 4px 0 4px" }} />
    </div>
  );
});

export default TerminalPanel;
