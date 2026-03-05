import { useEffect, useState, useRef, useCallback } from "react";
import { Wifi, RefreshCw, ExternalLink, Copy, Check, Server } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";

const API_URL = "http://localhost:8082";

interface PortEntry {
    port: number;
    pid: string | null;
    state: string;
    url: string;
    label?: string;
}

const LABEL_COLORS: Record<string, string> = {
    "React": "bg-cyan-500/10 text-cyan-400",
    "Vite": "bg-purple-500/10 text-purple-400",
    "Spring Boot": "bg-green-500/10 text-green-400",
    "Spring Boot API": "bg-green-500/10 text-green-400",
    "Terminal Server": "bg-indigo-500/10 text-indigo-400",
    "GraphQL": "bg-pink-500/10 text-pink-400",
};

export default function PortsPanel() {
    const [ports, setPorts] = useState<PortEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);
    const [copiedPort, setCopiedPort] = useState<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchPorts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/ports`);
            const data = await res.json();
            setPorts(data.ports || []);
            setLastFetch(new Date());
        } catch {
            // terminal server might not be running
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPorts();
        intervalRef.current = setInterval(fetchPorts, 5000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchPorts]);

    const openInBrowser = (url: string) => window.open(url, "_blank");

    const copyUrl = async (url: string, port: number) => {
        await navigator.clipboard.writeText(url);
        setCopiedPort(port);
        setTimeout(() => setCopiedPort(null), 1500);
    };

    return (
        <div className="h-full flex flex-col text-xs bg-ide-bg">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-3 py-1.5 border-b border-ide-border bg-ide-sidebar flex-shrink-0">
                <Wifi className="w-3.5 h-3.5 text-ide-text-secondary" />
                <span className="text-ide-text-secondary text-[10px]">Auto-refreshes every 5s</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchPorts}
                    disabled={isLoading}
                    className="h-6 px-2 text-xs text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover gap-1.5 ml-auto"
                >
                    <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                    Refresh
                </Button>
                {lastFetch && (
                    <span className="text-ide-text-secondary text-[10px] opacity-50">
                        {lastFetch.toLocaleTimeString()}
                    </span>
                )}
            </div>

            {/* Port Table */}
            <div className="flex-1 overflow-y-auto">
                {ports.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-ide-text-secondary">
                        <Server className="w-10 h-10 opacity-20" />
                        <div className="text-center">
                            <div className="font-medium mb-1">{isLoading ? "Scanning ports…" : "No ports detected"}</div>
                            <div className="text-[10px] opacity-60">Start a development server to see ports here</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="grid grid-cols-[80px_1fr_100px_auto] gap-3 px-4 py-1.5 text-[10px] text-ide-text-secondary font-medium border-b border-ide-border/50 bg-ide-sidebar/50 sticky top-0">
                            <span>Port</span>
                            <span>Address</span>
                            <span>Process</span>
                            <span>Actions</span>
                        </div>

                        {ports.map(p => (
                            <div
                                key={p.port}
                                className="grid grid-cols-[80px_1fr_100px_auto] gap-3 px-4 py-2 border-b border-ide-border/30 hover:bg-ide-hover/40 items-center"
                            >
                                <span className="font-mono font-bold text-indigo-400">{p.port}</span>
                                <a
                                    href={p.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 hover:underline truncate"
                                >
                                    {p.url}
                                </a>
                                <div className="flex items-center gap-1.5">
                                    {p.label ? (
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", LABEL_COLORS[p.label] || "bg-ide-hover text-ide-text-secondary")}>
                                            {p.label}
                                        </span>
                                    ) : (
                                        <span className="text-ide-text-secondary text-[10px]">
                                            {p.pid ? `PID ${p.pid}` : "—"}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openInBrowser(p.url)}
                                        className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
                                        title="Open in Browser"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyUrl(p.url, p.port)}
                                        className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
                                        title="Copy URL"
                                    >
                                        {copiedPort === p.port ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
