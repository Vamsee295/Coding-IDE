import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Info, RefreshCw, FileCode, ChevronRight } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import { io, Socket } from "socket.io-client";

import { CONFIG } from "@/react-app/lib/config";

const WS_URL = CONFIG.TERMINAL_WS_URL;

interface Problem {
    id: string;
    file: string;
    line: number;
    col: number;
    message: string;
    severity: "error" | "warning" | "info";
    source: string;
    rule?: string;
}

interface ProblemsResponse {
    problems: Problem[];
    error?: string;
    info?: string;
}

interface ProblemsProps {
    cwd?: string;
}

export default function ProblemsPanel({ cwd }: ProblemsProps) {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [lastInfo, setLastInfo] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "error" | "warning">("all");
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io(WS_URL, { transports: ["websocket"] });
        socketRef.current = socket;

        socket.on("lint-diagnostics", (data: ProblemsResponse) => {
            setIsRunning(false);
            if (data.error) { setLastInfo(data.error); setProblems([]); return; }
            if (data.info) setLastInfo(data.info);
            else setLastInfo(null);
            setProblems(data.problems || []);
        });

        return () => { socket.disconnect(); };
    }, []);

    const runDiagnostics = () => {
        if (!cwd || !socketRef.current) return;
        setIsRunning(true);
        setLastInfo(null);
        socketRef.current.emit("run-diagnostics", { cwd });
    };

    const errors = problems.filter(p => p.severity === "error");
    const warnings = problems.filter(p => p.severity === "warning");

    const filtered = filter === "all" ? problems
        : filter === "error" ? errors
            : warnings;

    return (
        <div className="h-full flex flex-col text-xs bg-ide-bg">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-3 py-1.5 border-b border-ide-border bg-ide-sidebar flex-shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={runDiagnostics}
                    disabled={isRunning || !cwd}
                    className="h-6 px-2 text-xs text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover gap-1.5"
                >
                    <RefreshCw className={cn("w-3 h-3", isRunning && "animate-spin")} />
                    {isRunning ? "Running…" : "Run Diagnostics"}
                </Button>

                {/* Filters */}
                <div className="flex items-center gap-1">
                    {(["all", "error", "warning"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                                filter === f ? "bg-indigo-500/20 text-indigo-300" : "text-ide-text-secondary hover:text-ide-text-primary"
                            )}
                        >
                            {f === "all" ? `All (${problems.length})` : f === "error" ? `Errors (${errors.length})` : `Warnings (${warnings.length})`}
                        </button>
                    ))}
                </div>

                {lastInfo && <span className="text-ide-text-secondary text-[10px] ml-auto">{lastInfo}</span>}
            </div>

            {/* Problems List */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-ide-text-secondary">
                        <AlertCircle className="w-10 h-10 opacity-20" />
                        <div className="text-center">
                            <div className="font-medium mb-1">{isRunning ? "Analyzing…" : "No problems detected"}</div>
                            {!isRunning && !cwd && <div className="text-[10px] opacity-60">Open a project to run diagnostics</div>}
                            {!isRunning && cwd && problems.length === 0 && (
                                <div className="text-[10px] opacity-60">Click "Run Diagnostics" to analyze your project</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        {filtered.map(p => (
                            <div key={p.id} className="flex items-start gap-2 px-3 py-1.5 hover:bg-ide-hover/50 cursor-pointer group border-b border-ide-border/30">
                                {p.severity === "error" ? (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                                ) : p.severity === "warning" ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                ) : (
                                    <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-ide-text-primary leading-snug">{p.message}</div>
                                    <div className="flex items-center gap-2 mt-0.5 text-ide-text-secondary">
                                        <span className="flex items-center gap-1">
                                            <FileCode className="w-3 h-3" />
                                            <span className="truncate max-w-[200px]">{p.file}</span>
                                        </span>
                                        {p.line > 0 && (
                                            <>
                                                <ChevronRight className="w-3 h-3 opacity-40" />
                                                <span>Line {p.line}, Col {p.col}</span>
                                            </>
                                        )}
                                        {p.rule && <span className="text-[10px] opacity-50 font-mono">[{p.rule}]</span>}
                                        <span className={cn("text-[10px] ml-auto px-1 py-0.5 rounded",
                                            p.source === "TypeScript" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"
                                        )}>{p.source}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
