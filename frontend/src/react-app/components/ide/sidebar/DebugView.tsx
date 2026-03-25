import { useState, useRef, useEffect } from "react";
import {
    Play, ChevronDown, ChevronRight,
    Circle, StopCircle, SkipForward, ArrowDown, ArrowUp,
    RotateCcw, Plus, X, FileCode, Bug,
    Trash2, Terminal, ListFilter, AlertCircle,
    Settings
} from "lucide-react";
import { cn } from "@/react-app/lib/utils";
import { CONFIG } from "@/react-app/lib/config";

interface DebugViewProps {
    rootPath?: string;
}

interface Breakpoint {
    id: string;
    file: string;
    line: number;
    enabled: boolean;
}

interface Variable {
    name: string;
    value: string;
    type?: string;
}

interface CallFrame {
    name: string;
    file: string;
    line: number;
    active?: boolean;
}

interface DebugEntry {
    type: "log" | "error" | "warn" | "info" | "result" | "system";
    message: string;
}

type ConsoleTab = "debug" | "terminal" | "output" | "problems";

// ── Mock data matching the screenshot ──────────────────────────────────────
const MOCK_VARIABLES: Variable[] = [
    { name: "count", value: "5", type: "number" },
    { name: "state", value: "'active'", type: "string" },
    { name: "timer", value: "null", type: "null" },
    { name: "isLoading", value: "false", type: "boolean" },
    { name: "items", value: "Array(0)", type: "array" },
];

const MOCK_CALL_STACK: CallFrame[] = [
    { name: "App", file: "App.js", line: 24, active: true },
    { name: "renderWithHooks", file: "react-dom", line: 16305 },
    { name: "mountIndeterminateComponent", file: "react-d...", line: 0 },
];

const MOCK_CONSOLE_ENTRIES: DebugEntry[] = [
    { type: "system", message: "Debugger listening on ws://127.0.0.1:45321/stitch-debug" },
    { type: "log", message: "App mounted" },
    { type: "info", message: 'Variable "count" changed from 4 to 5' },
    { type: "error", message: 'Warning: Each child in a list should have a unique "key" prop.' },
];

const MOCK_CODE_LINES = [
    { no: 20, code: "" },
    { no: 21, code: "  // Main application logic", italic: true },
    { no: 22, code: "const App = () => {" },
    { no: 23, code: "  const [count, setCount] = useState(0);" },
    { no: 24, code: "  const [state, setState] = useState('active');" },
    { no: 25, code: "  useEffect(() => {", breakpoint: true },
    { no: 26, code: "    console.log('App mounted');" },
    { no: 27, code: "    setCount(prev => prev + 1);" },
    { no: 28, code: "  }, []);" },
    { no: 29, code: "" },
    { no: 30, code: "  return (" },
    { no: 31, code: '    <div className="container">' },
    { no: 32, code: "      <Header status={state} />" },
    { no: 33, code: "      <Main>" },
    { no: 34, code: "        <Counter value={count} />" },
    { no: 35, code: "      </Main>" },
    { no: 36, code: "    </div>" },
    { no: 37, code: "  );" },
    { no: 38, code: "};" },
];

export default function DebugView({ rootPath: _rootPath }: DebugViewProps) {
    const [isDebugging, setIsDebugging] = useState(false);
    const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([
        { id: "1", file: "App.js", line: 24, enabled: true },
    ]);
    const [breakpointsExpanded, setBreakpointsExpanded] = useState(true);
    const [variablesExpanded, setVariablesExpanded] = useState(true);
    const [callStackExpanded, setCallStackExpanded] = useState(true);
    const [watchExpanded, setWatchExpanded] = useState(true);
    const [localExpanded, setLocalExpanded] = useState(true);
    const [consoleTab, setConsoleTab] = useState<ConsoleTab>("debug");
    const [consoleInput, setConsoleInput] = useState("");
    const [consoleEntries, setConsoleEntries] = useState<DebugEntry[]>(MOCK_CONSOLE_ENTRIES);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [launchConfig, setLaunchConfig] = useState("Launch Program");

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [consoleEntries]);

    const toggleBreakpoint = (id: string) => {
        setBreakpoints(prev => prev.map(bp => bp.id === id ? { ...bp, enabled: !bp.enabled } : bp));
    };

    const removeBreakpoint = (id: string) => {
        setBreakpoints(prev => prev.filter(bp => bp.id !== id));
    };

    const handleConsoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consoleInput.trim()) return;
        const expr = consoleInput.trim();
        setConsoleEntries(prev => [...prev, { type: "log", message: `> ${expr}` }]);
        setConsoleInput("");
        try {
            const res = await fetch(`${CONFIG.TERMINAL_API_URL}/debug/eval`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expression: expr })
            });
            const data = await res.json();
            if (data.error) {
                setConsoleEntries(prev => [...prev, { type: "error", message: data.error }]);
            } else {
                setConsoleEntries(prev => [...prev, { type: "result", message: String(data.result) }]);
            }
        } catch {
            setConsoleEntries(prev => [...prev, { type: "error", message: "Not connected to debug session." }]);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-ide-bg" style={{ minWidth: 0 }}>
            {/* ══ TOP ROW: left sidebar + code view ══ */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ─── LEFT: Debug Sidebar ─────────────────────────────────── */}
                <div
                    className="flex flex-col shrink-0 border-r border-ide-border/60 overflow-y-auto custom-scrollbar bg-ide-sidebar"
                    style={{ width: 240 }}
                >
                    {/* Header */}
                    <div className="h-9 px-4 flex items-center justify-between border-b border-ide-border/60 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ide-text-secondary select-none">
                            Run and Debug
                        </span>
                        <button
                            className="text-ide-text-secondary hover:text-ide-text-primary transition-colors"
                            title="Configure"
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Launch Config Row */}
                    <div className="px-2 py-2 flex items-center gap-1.5 border-b border-ide-border/60 shrink-0">
                        <button
                            onClick={() => setIsDebugging(true)}
                            className={cn(
                                "p-1.5 rounded transition-all",
                                isDebugging
                                    ? "text-green-400 hover:bg-green-500/10"
                                    : "text-green-400 hover:bg-green-500/20"
                            )}
                            title="Start Debugging (F5)"
                        >
                            <Play className="w-4 h-4 fill-green-400" />
                        </button>
                        <select
                            value={launchConfig}
                            onChange={e => setLaunchConfig(e.target.value)}
                            className="flex-1 text-[11px] bg-transparent text-ide-text-primary border-none outline-none cursor-pointer truncate"
                        >
                            <option>Launch Program</option>
                            <option>Attach to Process</option>
                            <option>Node.js Debug</option>
                        </select>
                        <button className="p-1 text-ide-text-secondary/50 hover:text-ide-text-secondary transition-colors">
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Active toolbar when debugging */}
                    {isDebugging && (
                        <div className="flex items-center justify-between px-2 py-1.5 border-b border-ide-border/60 shrink-0 bg-green-900/10">
                            <div className="flex items-center gap-0.5">
                                <ToolbarBtn icon={<Play className="w-3.5 h-3.5 fill-current" />} color="text-green-400" title="Continue (F5)" />
                                <ToolbarBtn icon={<ArrowDown className="w-3.5 h-3.5" />} title="Step Over (F10)" />
                                <ToolbarBtn icon={<SkipForward className="w-3.5 h-3.5" />} title="Step Into (F11)" />
                                <ToolbarBtn icon={<ArrowUp className="w-3.5 h-3.5" />} title="Step Out (⇧F11)" />
                                <ToolbarBtn icon={<RotateCcw className="w-3.5 h-3.5" />} color="text-green-400" title="Restart" />
                                <ToolbarBtn icon={<StopCircle className="w-3.5 h-3.5" />} color="text-red-400" title="Stop" onClick={() => setIsDebugging(false)} />
                            </div>
                        </div>
                    )}

                    {/* Variables */}
                    <Section
                        label="Variables"
                        expanded={variablesExpanded}
                        onToggle={() => setVariablesExpanded(v => !v)}
                    >
                        {/* Local scope */}
                        <div>
                            <button
                                onClick={() => setLocalExpanded(v => !v)}
                                className="w-full flex items-center gap-1.5 px-4 py-1 hover:bg-ide-hover/50 transition-colors"
                            >
                                {localExpanded
                                    ? <ChevronDown className="w-3 h-3 text-ide-text-secondary/50" />
                                    : <ChevronRight className="w-3 h-3 text-ide-text-secondary/50" />}
                                <span className="text-[10px] text-ide-text-secondary">Local</span>
                            </button>
                            {localExpanded && (
                                <div>
                                    {MOCK_VARIABLES.map((v) => (
                                        <VarRow key={v.name} variable={v} />
                                    ))}
                                </div>
                            )}
                        </div>
                        {!isDebugging && (
                            <p className="text-[10px] text-ide-text-secondary/40 italic px-6 py-2">Not running</p>
                        )}
                    </Section>

                    {/* Watch */}
                    <Section
                        label="Watch"
                        expanded={watchExpanded}
                        onToggle={() => setWatchExpanded(v => !v)}
                        actions={
                            <button className="p-0.5 text-ide-text-secondary hover:text-ide-text-primary transition-colors" title="Add expression">
                                <Plus className="w-3 h-3" />
                            </button>
                        }
                    >
                        <p className="text-[10px] text-ide-text-secondary/40 italic px-6 py-2">Add expressions to watch</p>
                    </Section>

                    {/* Call Stack */}
                    <Section
                        label="Call Stack"
                        expanded={callStackExpanded}
                        onToggle={() => setCallStackExpanded(v => !v)}
                    >
                        {MOCK_CALL_STACK.map((frame, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-center gap-1.5 px-6 py-1 cursor-pointer text-[11px] group transition-colors",
                                    frame.active
                                        ? "bg-indigo-500/10 border-l-2 border-l-indigo-500 font-medium"
                                        : "hover:bg-ide-hover/50 border-l-2 border-l-transparent"
                                )}
                            >
                                <span className={cn("truncate flex-1 font-mono", frame.active ? "text-ide-text-primary" : "text-ide-text-secondary")}>
                                    {frame.name}
                                </span>
                                <span className="text-[9px] text-ide-text-secondary/60 shrink-0 font-mono">
                                    {frame.file} {frame.line > 0 ? frame.line : ""}
                                </span>
                            </div>
                        ))}
                        {!isDebugging && (
                            <p className="text-[10px] text-ide-text-secondary/40 italic px-6 py-2">Not running</p>
                        )}
                    </Section>

                    {/* Breakpoints */}
                    <Section
                        label="Breakpoints"
                        expanded={breakpointsExpanded}
                        onToggle={() => setBreakpointsExpanded(v => !v)}
                        badge={breakpoints.length}
                    >
                        {breakpoints.map(bp => (
                            <div key={bp.id} className="group flex items-center gap-2 px-4 py-1 hover:bg-ide-hover/50 transition-colors cursor-pointer">
                                <button onClick={() => toggleBreakpoint(bp.id)} className="shrink-0">
                                    <Circle className={cn("w-3 h-3", bp.enabled ? "fill-red-500 text-red-500" : "text-ide-text-secondary/30 fill-transparent")} />
                                </button>
                                <FileCode className="w-3 h-3 text-blue-400/80 shrink-0" />
                                <span className="text-[11px] text-ide-text-primary truncate flex-1">{bp.file}</span>
                                <span className="text-[10px] text-ide-text-secondary font-mono">{bp.line}</span>
                                <button
                                    onClick={() => removeBreakpoint(bp.id)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-ide-text-secondary hover:text-red-400 transition-all ml-auto shrink-0"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))}
                        {breakpoints.length === 0 && (
                            <p className="text-[10px] text-ide-text-secondary/40 italic px-6 py-2">No breakpoints</p>
                        )}
                    </Section>
                </div>

                {/* ─── RIGHT: Code Viewer ──────────────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Mini tab bar */}
                    <div className="h-9 flex items-center border-b border-ide-border/60 bg-ide-sidebar/60 px-1 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-ide-panel/70 rounded-t border-t border-x border-ide-border/60 text-[11px] text-ide-text-primary font-medium">
                            <span className="text-[9px] text-ide-text-secondary/60 mr-1">src</span>
                            <span className="text-[9px] text-ide-text-secondary/60">›</span>
                            <FileCode className="w-3.5 h-3.5 text-yellow-400 mx-1" />
                            <span>App.js</span>
                        </div>
                        {/* Debug toolbar floating */}
                        {isDebugging && (
                            <div className="ml-auto flex items-center gap-0.5 mr-2 px-2 py-1 bg-ide-sidebar/90 border border-ide-border/60 rounded-md shadow-lg">
                                <ToolbarBtn icon={<Play className="w-3.5 h-3.5 fill-current" />} color="text-green-400" title="Continue" />
                                <ToolbarBtn icon={<RotateCcw className="w-3.5 h-3.5" />} title="Restart" />
                                <ToolbarBtn icon={<ArrowDown className="w-3.5 h-3.5" />} title="Step Over" />
                                <ToolbarBtn icon={<ArrowUp className="w-3.5 h-3.5" />} title="Step Out" />
                                <ToolbarBtn icon={<RotateCcw className="w-3.5 h-3.5" />} color="text-indigo-400" title="Restart Session" />
                                <ToolbarBtn icon={<StopCircle className="w-3.5 h-3.5" />} color="text-red-400" title="Stop" onClick={() => setIsDebugging(false)} />
                            </div>
                        )}
                    </div>

                    {/* Code with line numbers */}
                    <div className="flex-1 overflow-auto custom-scrollbar font-mono text-[12px] bg-ide-bg">
                        {MOCK_CODE_LINES.map((line) => {
                            const hasBreakpoint = breakpoints.some(bp => bp.line === line.no && bp.enabled);
                            const isCurrentLine = isDebugging && line.no === 25;
                            return (
                                <div
                                    key={line.no}
                                    className={cn(
                                        "flex items-start group relative",
                                        isCurrentLine && "bg-indigo-500/15 border-l-2 border-indigo-500",
                                        !isCurrentLine && "border-l-2 border-transparent",
                                    )}
                                >
                                    {/* Breakpoint gutter */}
                                    <div className="w-7 shrink-0 flex items-center justify-center py-0.5 relative">
                                        {hasBreakpoint ? (
                                            <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                                        ) : (
                                            <div
                                                className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-red-500/30 cursor-pointer transition-colors"
                                                onClick={() => {
                                                    const existing = breakpoints.find(bp => bp.line === line.no);
                                                    if (existing) removeBreakpoint(existing.id);
                                                    else setBreakpoints(prev => [...prev, { id: Date.now().toString(), file: "App.js", line: line.no, enabled: true }]);
                                                }}
                                            />
                                        )}
                                    </div>
                                    {/* Line number */}
                                    <div className={cn(
                                        "w-8 text-right pr-4 py-0.5 select-none shrink-0 text-[11px] leading-5",
                                        isCurrentLine ? "text-indigo-300" : "text-ide-text-secondary/35"
                                    )}>
                                        {line.no}
                                    </div>
                                    {/* Code content */}
                                    <div className={cn(
                                        "flex-1 py-0.5 pr-4 text-[12px] leading-5 whitespace-pre",
                                        line.italic ? "italic text-ide-text-secondary/60" : "text-ide-text-primary/90",
                                        isCurrentLine && "text-ide-text-primary"
                                    )}>
                                        <SyntaxLine code={line.code} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══ BOTTOM: Debug Console ══ */}
            <div className="flex flex-col border-t border-ide-border/60 bg-ide-bg" style={{ height: 160 }}>
                {/* Console Tab Bar */}
                <div className="flex items-center border-b border-ide-border/60 shrink-0 bg-ide-sidebar/60">
                    {(["debug", "terminal", "output", "problems"] as ConsoleTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setConsoleTab(tab)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2",
                                consoleTab === tab
                                    ? "text-ide-text-primary border-indigo-500"
                                    : "text-ide-text-secondary/60 hover:text-ide-text-secondary border-transparent"
                            )}
                        >
                            {tab === "debug" && <Bug className="w-3 h-3" />}
                            {tab === "terminal" && <Terminal className="w-3 h-3" />}
                            {tab === "output" && <ListFilter className="w-3 h-3" />}
                            {tab === "problems" && <AlertCircle className="w-3 h-3" />}
                            {tab === "debug" ? "Debug Console" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center pr-2">
                        <button
                            onClick={() => setConsoleEntries(MOCK_CONSOLE_ENTRIES)}
                            className="p-1.5 text-ide-text-secondary/50 hover:text-ide-text-secondary transition-colors"
                            title="Clear console"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Console Output */}
                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] py-1">
                    {consoleEntries.map((entry, i) => {
                        const isError = entry.type === "error";
                        const isWarn = entry.type === "warn";
                        const isInfo = entry.type === "info";
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-start gap-2 px-3 py-0.5 hover:bg-ide-hover/20 transition-colors leading-5",
                                    isError && "text-red-400 bg-red-900/5",
                                    isWarn && "text-yellow-400",
                                    isInfo && "text-ide-text-primary",
                                    !isError && !isWarn && !isInfo && "text-ide-text-secondary"
                                )}
                            >
                                <span className={cn("shrink-0 mt-0.5", isError ? "text-red-500" : "text-ide-text-secondary/50")}>
                                    {isError ? <Circle className="w-2.5 h-2.5 fill-current mt-1" /> : ">"}
                                </span>
                                <span className="break-all">{entry.message}</span>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* Console input */}
                <form onSubmit={handleConsoleSubmit} className="flex items-center gap-1.5 px-3 py-1.5 border-t border-ide-border/60 shrink-0 bg-ide-sidebar/60">
                    <span className="text-green-400 font-mono text-[11px] shrink-0">{">"}</span>
                    <input
                        value={consoleInput}
                        onChange={e => setConsoleInput(e.target.value)}
                        placeholder=""
                        className="flex-1 bg-transparent text-ide-text-primary outline-none font-mono text-[11px]"
                    />
                </form>
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({
    label, expanded, onToggle, children, badge, actions
}: {
    label: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    badge?: number;
    actions?: React.ReactNode;
}) {
    return (
        <div className="border-b border-ide-border/40">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover/50 transition-colors"
            >
                {expanded
                    ? <ChevronDown className="w-3 h-3 text-ide-text-secondary/60" />
                    : <ChevronRight className="w-3 h-3 text-ide-text-secondary/60" />}
                <span className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary flex-1 text-left">
                    {label}
                </span>
                {badge !== undefined && (
                    <span className="text-[9px] text-ide-text-secondary/60 bg-ide-border/60 px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                        {badge}
                    </span>
                )}
                {actions}
            </button>
            {expanded && <div>{children}</div>}
        </div>
    );
}

function VarRow({ variable }: { variable: Variable }) {
    const valueColor =
        variable.type === "number" ? "text-amber-300" :
        variable.type === "string" ? "text-green-300" :
        variable.type === "boolean" ? "text-yellow-300" :
        variable.type === "null" ? "text-ide-text-secondary/60" :
        "text-blue-300";

    return (
        <div className="flex items-baseline gap-2 px-8 py-0.5 hover:bg-ide-hover/30 transition-colors cursor-default">
            <span className="text-[11px] text-blue-300 font-mono shrink-0">{variable.name}</span>
            <span className="text-[11px] text-ide-text-secondary">:</span>
            <span className={cn("text-[11px] font-mono truncate flex-1", valueColor)}>{variable.value}</span>
        </div>
    );
}

function ToolbarBtn({
    icon, color, title, onClick
}: {
    icon: React.ReactNode;
    color?: string;
    title: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "p-1.5 rounded transition-colors",
                color
                    ? `${color} hover:bg-white/10`
                    : "text-ide-text-secondary hover:text-ide-text-primary hover:bg-white/5"
            )}
            title={title}
        >
            {icon}
        </button>
    );
}

function SyntaxLine({ code }: { code: string }) {
    if (!code.trim()) return <span>&nbsp;</span>;
    return <>{code}</>;
}
