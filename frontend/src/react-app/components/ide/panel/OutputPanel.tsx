import { useEffect, useRef, useState } from "react";
import { Layers, Trash2 } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import { io, Socket } from "socket.io-client";

const WS_URL = "http://localhost:8082";

interface LogEntry {
    source: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    timestamp: string;
}

const SOURCE_COLORS: Record<string, string> = {
    "IDE": "text-indigo-400",
    "Terminal": "text-green-400",
    "ESLint": "text-yellow-400",
    "TypeScript": "text-blue-400",
    "Build": "text-orange-400",
    "Git": "text-pink-400",
};

const LEVEL_BADGE: Record<string, string> = {
    info: "text-cyan-400",
    warn: "text-yellow-400",
    error: "text-red-400",
    debug: "text-ide-text-secondary",
};

export default function OutputPanel() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [source, setSource] = useState<string>("all");
    const bottomRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        const socket = io(WS_URL, { transports: ["websocket"] });
        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("subscribe-output");
        });

        socket.on("output-history", (history: LogEntry[]) => {
            setLogs(history);
        });

        socket.on("output-log", (entry: LogEntry) => {
            setLogs(prev => [...prev.slice(-999), entry]);
        });

        return () => { socket.disconnect(); };
    }, []);

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    const sources = ["all", ...Array.from(new Set(logs.map(l => l.source)))];
    const filtered = source === "all" ? logs : logs.filter(l => l.source === source);

    const fmt = (ts: string) => {
        try { return new Date(ts).toLocaleTimeString(); }
        catch { return ts; }
    };

    return (
        <div className="h-full flex flex-col text-xs bg-ide-bg font-mono">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border bg-ide-sidebar flex-shrink-0 overflow-x-auto">
                <Layers className="w-3.5 h-3.5 text-ide-text-secondary flex-shrink-0" />
                <span className="text-ide-text-secondary text-[10px] flex-shrink-0">Source:</span>
                <div className="flex items-center gap-1">
                    {sources.map(s => (
                        <button
                            key={s}
                            onClick={() => setSource(s)}
                            className={cn(
                                "px-2 py-0.5 rounded text-[10px] transition-colors flex-shrink-0",
                                source === s ? "bg-indigo-500/20 text-indigo-300" : "text-ide-text-secondary hover:text-ide-text-primary"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setAutoScroll(v => !v)} className={cn("px-2 py-0.5 rounded text-[10px] transition-colors", autoScroll ? "text-indigo-300 bg-indigo-500/10" : "text-ide-text-secondary hover:text-ide-text-primary")}>
                        Auto-scroll
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => setLogs([])} className="h-5 w-5 text-ide-text-secondary hover:text-ide-text-primary" title="Clear Output">
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Log Stream */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filtered.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-ide-text-secondary opacity-50">
                        No output yet…
                    </div>
                ) : (
                    filtered.map((log, i) => (
                        <div key={i} className="flex items-start gap-2 hover:bg-ide-hover/30 rounded px-1 py-0.5">
                            <span className="text-ide-text-secondary opacity-50 flex-shrink-0 w-16 text-right text-[10px]">{fmt(log.timestamp)}</span>
                            <span className={cn("flex-shrink-0 w-20 text-[10px]", SOURCE_COLORS[log.source] || "text-ide-text-secondary")}>[{log.source}]</span>
                            <span className={cn("flex-shrink-0 w-10 text-[10px]", LEVEL_BADGE[log.level])}>{log.level}</span>
                            <span className="text-ide-text-primary break-all">{log.message}</span>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
