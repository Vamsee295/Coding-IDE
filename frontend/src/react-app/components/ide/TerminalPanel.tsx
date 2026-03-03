import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Terminal as TerminalIcon, X, Plus, ChevronDown, Trash2, SquareSplitHorizontal, Settings, LayoutList, AlertCircle, Bug, Layers, Wifi } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import { io, Socket } from "socket.io-client";

const BACKEND_WS_URL = "http://localhost:8082";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TerminalTab {
  id: string;
  terminalId: string;
  name: string;
  label?: string; // e.g. "frontend", "backend"
  cwd: string;
  isActive: boolean;
  profile?: string; // shell profile e.g. PowerShell, Git Bash
}

interface TabSession {
  terminal: Terminal;
  fitAddon: FitAddon;
}

export interface TerminalPanelHandle {
  openTerminalForWorkspace: (path: string) => void;
  openTerminalWithProfile: (path: string, profile: string) => void;
  resetForNewWorkspace: (path: string) => void;
  executeCommand: (command: string) => void;
}

interface TerminalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  initialCwd?: string;
}

// VS Code-style top panel tabs
type PanelTab = "problems" | "output" | "debug" | "terminal" | "ports";

// Terminal profiles
const TERMINAL_PROFILES = [
  { label: "PowerShell", value: "PowerShell", icon: ">" },
  { label: "Git Bash", value: "Git Bash", icon: "$" },
  { label: "Command Prompt", value: "Command Prompt", icon: ">" },
  { label: "Ubuntu (WSL)", value: "Ubuntu (WSL)", icon: "$" },
];

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
  // ── State ─────────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>("terminal");
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const sessions = useRef<Map<string, TabSession>>(new Map());
  const terminalIds = useRef<Map<string, string>>(new Map());
  const isDragging = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const pendingCreations = useRef<Map<string, (terminalId: string) => void>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Socket Setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BACKEND_WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("terminal-output", ({ terminalId, data }: { terminalId: string; data: string | ArrayBuffer }) => {
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

    socket.on("terminal-created", ({ terminalId }: { terminalId: string }) => {
      const firstKey = [...pendingCreations.current.keys()][0];
      if (firstKey) {
        const resolve = pendingCreations.current.get(firstKey)!;
        pendingCreations.current.delete(firstKey);
        resolve(terminalId);
      }
    });

    return () => { socket.disconnect(); };
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

  const spawnTerminalForTab = useCallback((tabId: string, cwd: string, container: HTMLDivElement, profile?: string) => {
    const session = createXtermSession(container);
    sessions.current.set(tabId, session);

    session.terminal.onData((data) => {
      const terminalId = terminalIds.current.get(tabId);
      if (terminalId && socketRef.current?.connected) {
        socketRef.current.emit("terminal-input", { terminalId, data });
      }
    });

    session.terminal.onResize(({ cols, rows }) => {
      const terminalId = terminalIds.current.get(tabId);
      if (terminalId && socketRef.current?.connected) {
        socketRef.current.emit("resize", { terminalId, cols, rows });
      }
    });

    const emitCreate = () => {
      if (!socketRef.current?.connected) {
        socketRef.current?.once("connect", () => emitCreate());
        return;
      }

      pendingCreations.current.set(tabId, (terminalId: string) => {
        terminalIds.current.set(tabId, terminalId);
        try {
          session.fitAddon.fit();
          socketRef.current?.emit("resize", {
            terminalId,
            cols: session.terminal.cols,
            rows: session.terminal.rows,
          });
        } catch (_) { }
      });

      const folderName = profile || cwd.split(/[/\\]/).filter(Boolean).pop() || "Terminal";
      socketRef.current.emit("create-terminal", { cwd, name: folderName, profile });
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

  // ── Public API ────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    openTerminalForWorkspace: (path: string) => {
      if (!path) return;
      const folderName = path.split(/[/\\]/).filter(Boolean).pop() || "Terminal";
      const newId = `terminal-${Date.now()}`;
      const newTab: TerminalTab = { id: newId, terminalId: "", name: folderName, cwd: path, isActive: true };
      setTabs(prev => [...prev.map(t => ({ ...t, isActive: false })), newTab]);
    },
    openTerminalWithProfile: (path: string, profile: string) => {
      if (!path) return;
      const newId = `terminal-profile-${Date.now()}`;
      const newTab: TerminalTab = { id: newId, terminalId: "", name: profile, cwd: path, isActive: true, profile };
      setTabs(prev => [...prev.map(t => ({ ...t, isActive: false })), newTab]);
    },
    resetForNewWorkspace: (path: string) => {
      if (!path) return;
      sessions.current.forEach((_, id) => destroySession(id));
      const folderName = path.split(/[/\\]/).filter(Boolean).pop() || "Terminal";
      const newId = `terminal-${Date.now()}`;
      const newTab: TerminalTab = { id: newId, terminalId: "", name: folderName, cwd: path, isActive: true };
      setTabs([newTab]);
    },
    executeCommand: (command: string) => {
      const activeTabId = tabs.find(t => t.isActive)?.id;
      if (!activeTabId) return;
      const terminalId = terminalIds.current.get(activeTabId);
      if (terminalId && socketRef.current?.connected) {
        socketRef.current.emit("terminal-input", { terminalId, data: command + "\n" });
      }
    }
  }), [tabs, destroySession]);

  // ── First terminal on mount ───────────────────────────────────────────────
  const initialBootRef = useRef(false);
  useEffect(() => {
    if (initialBootRef.current || !initialCwd || tabs.length > 0) return;
    initialBootRef.current = true;
    const folderName = initialCwd.split(/[/\\]/).filter(Boolean).pop() || "PowerShell";
    const newId = `terminal-initial-${Date.now()}`;
    setTabs([{ id: newId, terminalId: "", name: folderName, cwd: initialCwd, isActive: true }]);
  }, [initialCwd, tabs.length]);

  // ── Mount xterm session on active tab ────────────────────────────────────
  const activeTabId = tabs.find(t => t.isActive)?.id;

  useEffect(() => {
    if (!isVisible || !activeTabId || activePanelTab !== "terminal") return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    requestAnimationFrame(() => {
      const container = document.getElementById(`terminal-container-${activeTabId}`);
      if (!container) return;

      if (!sessions.current.has(activeTabId)) {
        spawnTerminalForTab(activeTabId, activeTab.cwd, container as HTMLDivElement, activeTab.profile);
      } else {
        try { sessions.current.get(activeTabId)!.fitAddon.fit(); } catch (_) { }
      }
      sessions.current.get(activeTabId)?.terminal.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, activeTabId, height, tabs.length, activePanelTab]);

  useEffect(() => { sessions.current.forEach(s => { try { s.fitAddon.fit(); } catch (_) { } }); }, [height]);
  useEffect(() => { return () => { sessions.current.forEach((_, id) => destroySession(id)); }; }, [destroySession]);

  // ── Tab Management ────────────────────────────────────────────────────────

  const spawnNewTerminal = (profile?: string) => {
    setShowDropdown(false);
    const activeCwd = tabs.find(t => t.isActive)?.cwd || "";
    const folderName = profile || activeCwd.split(/[/\\]/).filter(Boolean).pop() || "PowerShell";
    const newId = `terminal-${Date.now()}`;
    setTabs(prev => [
      ...prev.map(t => ({ ...t, isActive: false })),
      { id: newId, terminalId: "", name: folderName, cwd: activeCwd, isActive: true, profile },
    ]);
    if (activePanelTab !== "terminal") setActivePanelTab("terminal");
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
    setActivePanelTab("terminal");
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

  const panelTabs: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
    { id: "problems", label: "Problems", icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: "output", label: "Output", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "debug", label: "Debug Console", icon: <Bug className="w-3.5 h-3.5" /> },
    { id: "terminal", label: "Terminal", icon: <TerminalIcon className="w-3.5 h-3.5" /> },
    { id: "ports", label: "Ports", icon: <Wifi className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-ide-bg border-t border-ide-border flex flex-col" style={{ height: `${height}px` }}>
      {/* Resize Handle */}
      <div className="h-1 bg-ide-border hover:bg-indigo-500 cursor-row-resize transition-colors flex-shrink-0" onMouseDown={handleMouseDown} />

      {/* VS Code-style Top Tab Bar (Problems | Output | Debug Console | Terminal | Ports) */}
      <div className="h-9 bg-[#1e2030] border-b border-ide-border flex items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center h-full">
          {panelTabs.map(pt => (
            <button
              key={pt.id}
              onClick={() => setActivePanelTab(pt.id)}
              className={cn(
                "h-full flex items-center gap-1.5 px-3 text-xs font-medium border-b-2 transition-colors",
                activePanelTab === pt.id
                  ? "border-indigo-400 text-ide-text-primary"
                  : "border-transparent text-ide-text-secondary hover:text-ide-text-primary"
              )}
            >
              {pt.icon}
              {pt.label}
            </button>
          ))}
        </div>

        {/* Right Toolbar: +▾ | … | Split | Trash | Close */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* New Terminal + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => spawnNewTerminal()}
                className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
                title="New Terminal"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDropdown(p => !p)}
                className="h-6 w-4 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
                title="Terminal Options"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#1a1d2e] border border-ide-border rounded-lg shadow-2xl z-50 overflow-hidden text-sm">
                {/* New Terminal group */}
                <div className="border-b border-ide-border/60">
                  <button onClick={() => spawnNewTerminal()} className="w-full flex items-center justify-between px-3 py-2 text-xs text-ide-text-primary hover:bg-ide-hover transition-colors">
                    <span className="font-medium">New Terminal</span>
                    <span className="text-ide-text-secondary text-[10px]">Ctrl+Shift+`</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-3 py-2 text-xs text-ide-text-primary hover:bg-ide-hover transition-colors opacity-60 cursor-not-allowed">
                    <span>New Terminal Window</span>
                    <span className="text-ide-text-secondary text-[10px]">Ctrl+Shift+Alt+`</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-3 py-2 text-xs text-ide-text-primary hover:bg-ide-hover transition-colors opacity-60 cursor-not-allowed">
                    <span>Split Terminal</span>
                    <span className="text-ide-text-secondary text-[10px]">Ctrl+Shift+5</span>
                  </button>
                </div>

                {/* Shell profiles */}
                <div className="border-b border-ide-border/60">
                  {TERMINAL_PROFILES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => spawnNewTerminal(p.value)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ide-text-primary hover:bg-ide-hover transition-colors"
                    >
                      <span className="text-indigo-400 font-mono text-[11px] w-4">{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                  <button className="w-full flex items-center justify-between px-3 py-2 text-xs text-ide-text-secondary hover:bg-ide-hover hover:text-ide-text-primary transition-colors opacity-60 cursor-not-allowed">
                    <span>Split Terminal with Profile</span>
                    <span className="text-[10px]">›</span>
                  </button>
                </div>

                {/* Settings */}
                <div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ide-text-primary hover:bg-ide-hover transition-colors">
                    <Settings className="w-3.5 h-3.5 text-ide-text-secondary" />
                    Configure Terminal Settings
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ide-text-primary hover:bg-ide-hover transition-colors">
                    <LayoutList className="w-3.5 h-3.5 text-ide-text-secondary" />
                    Select Default Profile
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Split icon (cosmetic) */}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover" title="Split Terminal">
            <SquareSplitHorizontal className="w-3.5 h-3.5" />
          </Button>

          {/* Clear */}
          <Button variant="ghost" size="icon" onClick={handleClearTerminal} className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover" title="Clear Terminal">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>

          {/* Close panel */}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover" title="Close Panel">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Body — Terminal list on right, xterm on left */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {activePanelTab === "terminal" ? (
          <>
            {/* xterm area */}
            <div className="flex-1 min-w-0 overflow-hidden" style={{ padding: "4px 0 0 4px" }}>
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  id={`terminal-container-${tab.id}`}
                  className={tab.isActive ? "h-full w-full block" : "hidden"}
                />
              ))}
              {tabs.length === 0 && (
                <div className="h-full flex items-center justify-center text-ide-text-secondary text-xs">
                  No terminals. Click + to open one.
                </div>
              )}
            </div>

            {/* Terminal list sidebar (VS Code style) */}
            {tabs.length > 0 && (
              <div className="w-44 flex-shrink-0 border-l border-ide-border bg-[#1a1d2e] overflow-y-auto">
                {tabs.map(tab => (
                  <div
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={cn(
                      "group flex items-center gap-2 px-2 py-1.5 cursor-pointer text-xs transition-colors",
                      tab.isActive
                        ? "bg-ide-hover text-ide-text-primary"
                        : "text-ide-text-secondary hover:bg-ide-hover/50 hover:text-ide-text-primary"
                    )}
                  >
                    <TerminalIcon className={cn("w-3.5 h-3.5 flex-shrink-0", tab.isActive ? "text-indigo-400" : "text-ide-text-secondary")} />
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="font-mono truncate">{tab.profile ? tab.profile.toLowerCase().split(" ")[0] : tab.name}</div>
                      {tab.label && <div className="text-[10px] text-ide-text-secondary truncate">{tab.label}</div>}
                    </div>
                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Other panels (Problems, Output, Debug, Ports) — placeholder */
          <div className="flex-1 flex items-center justify-center text-ide-text-secondary text-xs gap-2">
            {panelTabs.find(p => p.id === activePanelTab)?.icon}
            <span className="capitalize">{activePanelTab === "debug" ? "Debug Console" : activePanelTab} — not yet implemented</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default TerminalPanel;
