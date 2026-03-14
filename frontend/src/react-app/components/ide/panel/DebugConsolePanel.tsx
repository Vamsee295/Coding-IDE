import { useRef, useState, useEffect } from "react";
import { Bug, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import { CONFIG } from "@/react-app/lib/config";

interface DebugEntry {
    type: "log" | "error" | "warn" | "info" | "result" | "system";
    message: string;
    timestamp: string;
}

const TYPE_STYLE: Record<string, string> = {
    log: "text-ide-text-primary",
    error: "text-red-400",
    warn: "text-yellow-400",
    info: "text-blue-400",
    result: "text-green-400",
    system: "text-ide-text-secondary italic",
};

const TYPE_PREFIX: Record<string, string> = {
    log: "",
    error: "✕ ",
    warn: "⚠ ",
    info: "ℹ ",
    result: "← ",
    system: "# ",
};

export default function DebugConsolePanel() {
    const [entries, setEntries] = useState<DebugEntry[]>([
        { type: "system", message: "Debug Console ready. Start a debug session to see output.", timestamp: new Date().toISOString() },
    ]);
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [entries]);

    const addEntry = (entry: DebugEntry) => setEntries(prev => [...prev, entry]);

    const handleEval = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const expr = input.trim();
        addEntry({ type: "log", message: `> ${expr}`, timestamp: new Date().toISOString() });
        setInput("");

        try {
            const res = await fetch(`${CONFIG.TERMINAL_API_URL}/debug/eval`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expression: expr })
            });
            const data = await res.json();
            
            if (data.error) {
                addEntry({ type: "error", message: data.error, timestamp: new Date().toISOString() });
            } else {
                addEntry({ type: "result", message: String(data.result), timestamp: new Date().toISOString() });
            }
        } catch (err: any) {
            addEntry({ type: "error", message: "Network Error: " + err.message, timestamp: new Date().toISOString() });
        }
    };

    const fmt = (ts: string) => {
        try { return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
        catch { return ""; }
    };

    return (
        <div className="h-full flex flex-col text-xs bg-ide-bg font-mono">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border bg-ide-sidebar flex-shrink-0">
                <Bug className="w-3.5 h-3.5 text-ide-text-secondary" />
                <span className="text-ide-text-secondary text-[10px]">Debug Console</span>
                <div className="ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => setEntries([{ type: "system", message: "Console cleared.", timestamp: new Date().toISOString() }])} className="h-5 w-5 text-ide-text-secondary hover:text-ide-text-primary" title="Clear">
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Output */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {entries.map((entry, i) => (
                    <div key={i} className={cn("flex items-start gap-2 hover:bg-ide-hover/30 rounded px-1 py-0.5", TYPE_STYLE[entry.type])}>
                        <span className="text-ide-text-secondary opacity-40 w-16 text-right flex-shrink-0 text-[10px]">{fmt(entry.timestamp)}</span>
                        <span className="break-all">{TYPE_PREFIX[entry.type]}{entry.message}</span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Expression Input */}
            <form onSubmit={handleEval} className="flex items-center gap-1 px-2 py-1.5 border-t border-ide-border bg-ide-sidebar flex-shrink-0">
                <ChevronRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="flex-1 bg-transparent text-ide-text-primary outline-none border-none text-xs font-mono placeholder:text-ide-text-secondary"
                    placeholder="Evaluate expression…"
                />
            </form>
        </div>
    );
}
