import { useState, useEffect, useCallback } from "react";
import {
    GitBranch, Plus, Minus, RefreshCw,
    Check, ChevronDown, ChevronRight, FileCode, Loader2, AlertCircle
} from "lucide-react";
import { cn } from "@/react-app/lib/utils";

interface SourceControlViewProps {
    rootPath?: string;
}

interface GitChange {
    path: string;
    fileName: string;
    status: "modified" | "added" | "deleted" | "untracked";
    staged: boolean;
}

export default function SourceControlView({ rootPath }: SourceControlViewProps) {
    const [changes, setChanges] = useState<GitChange[]>([]);
    const [commitMessage, setCommitMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);
    const [currentBranch, setCurrentBranch] = useState("main");
    const [stagedExpanded, setStagedExpanded] = useState(true);
    const [changesExpanded, setChangesExpanded] = useState(true);

    const fetchGitStatus = useCallback(async () => {
        if (!rootPath) { setIsGitRepo(false); return; }
        setIsLoading(true);
        try {
            const res = await fetch(`http://localhost:8082/git/status?path=${encodeURIComponent(rootPath)}`);
            if (!res.ok) { setIsGitRepo(false); setIsLoading(false); return; }
            const data = await res.json();
            setIsGitRepo(true);
            setCurrentBranch(data.branch || "main");
            setChanges(data.changes || []);
        } catch {
            setIsGitRepo(false);
        } finally {
            setIsLoading(false);
        }
    }, [rootPath]);

    useEffect(() => { fetchGitStatus(); }, [fetchGitStatus]);

    const handleStage = async (filePath: string) => {
        try {
            await fetch("http://localhost:8082/git/stage", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: rootPath, files: [filePath] })
            });
            fetchGitStatus();
        } catch (e) { console.error("Stage failed", e); }
    };

    const handleUnstage = async (filePath: string) => {
        try {
            await fetch("http://localhost:8082/git/unstage", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: rootPath, files: [filePath] })
            });
            fetchGitStatus();
        } catch (e) { console.error("Unstage failed", e); }
    };

    const handleCommit = async () => {
        if (!commitMessage.trim()) return;
        try {
            await fetch("http://localhost:8082/git/commit", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: rootPath, message: commitMessage })
            });
            setCommitMessage("");
            fetchGitStatus();
        } catch (e) { console.error("Commit failed", e); }
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case "modified": return <span className="text-yellow-400 text-[10px] font-bold">M</span>;
            case "added":
            case "untracked": return <span className="text-green-400 text-[10px] font-bold">U</span>;
            case "deleted": return <span className="text-red-400 text-[10px] font-bold">D</span>;
            default: return null;
        }
    };

    const stagedChanges = changes.filter(c => c.staged);
    const unstagedChanges = changes.filter(c => !c.staged);

    return (
        <div className="flex flex-col h-full bg-ide-sidebar">
            {/* Header */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary select-none">
                    Source Control
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={fetchGitStatus} className="p-1 text-ide-text-secondary hover:text-ide-text-primary transition-colors" title="Refresh">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-ide-text-secondary" />
                </div>
            ) : !rootPath ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <GitBranch className="w-8 h-8 text-ide-text-secondary/40 mb-3" />
                    <p className="text-xs text-ide-text-secondary">No folder opened</p>
                    <p className="text-[10px] text-ide-text-secondary/60 mt-1">Open a project to use Source Control</p>
                </div>
            ) : !isGitRepo ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-yellow-500/40 mb-3" />
                    <p className="text-xs text-ide-text-secondary">Not a Git repository</p>
                    <p className="text-[10px] text-ide-text-secondary/60 mt-1">Initialize a Git repository to track changes</p>
                    <button
                        onClick={async () => {
                            try {
                                await fetch("http://localhost:8082/git/init", {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ path: rootPath })
                                });
                                fetchGitStatus();
                            } catch (e) { console.error("Git init failed", e); }
                        }}
                        className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
                    >
                        Initialize Repository
                    </button>
                </div>
            ) : (
                <>
                    {/* Branch indicator */}
                    <div className="px-4 py-2 border-b border-ide-border flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs text-ide-text-primary font-medium">{currentBranch}</span>
                    </div>

                    {/* Commit input */}
                    <div className="px-3 py-3 border-b border-ide-border">
                        <div className="relative">
                            <input
                                type="text"
                                value={commitMessage}
                                onChange={e => setCommitMessage(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleCommit(); }}
                                placeholder="Message (press Enter to commit)"
                                className="w-full bg-ide-input border border-ide-border rounded px-2.5 py-1.5 text-xs text-ide-text-primary focus:outline-none focus:border-indigo-500 pr-8 transition-colors"
                            />
                            <button
                                onClick={handleCommit}
                                disabled={!commitMessage.trim() || stagedChanges.length === 0}
                                className={cn(
                                    "absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors",
                                    commitMessage.trim() && stagedChanges.length > 0
                                        ? "text-indigo-400 hover:text-indigo-300"
                                        : "text-ide-text-secondary/30 cursor-not-allowed"
                                )}
                                title="Commit"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Staged Changes */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {stagedChanges.length > 0 && (
                            <div>
                                <button onClick={() => setStagedExpanded(!stagedExpanded)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover transition-colors">
                                    {stagedExpanded ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ide-text-secondary" />}
                                    <span className="text-[10px] font-bold uppercase text-ide-text-secondary">Staged Changes</span>
                                    <span className="text-[10px] text-ide-text-secondary ml-auto bg-ide-border/50 px-1.5 py-0.5 rounded-full">{stagedChanges.length}</span>
                                </button>
                                {stagedExpanded && stagedChanges.map(change => (
                                    <div key={change.path} className="group flex items-center gap-2 px-6 py-1 hover:bg-ide-hover transition-colors cursor-pointer">
                                        <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        <span className="text-xs text-ide-text-primary truncate flex-1">{change.fileName}</span>
                                        {statusIcon(change.status)}
                                        <button onClick={() => handleUnstage(change.path)} className="p-0.5 opacity-0 group-hover:opacity-100 text-ide-text-secondary hover:text-ide-text-primary transition-all" title="Unstage">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Unstaged Changes */}
                        <div>
                            <button onClick={() => setChangesExpanded(!changesExpanded)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover transition-colors">
                                {changesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ide-text-secondary" />}
                                <span className="text-[10px] font-bold uppercase text-ide-text-secondary">Changes</span>
                                <span className="text-[10px] text-ide-text-secondary ml-auto bg-ide-border/50 px-1.5 py-0.5 rounded-full">{unstagedChanges.length}</span>
                            </button>
                            {changesExpanded && unstagedChanges.length === 0 && (
                                <div className="px-6 py-3 text-[10px] text-ide-text-secondary/60 italic">No changes detected</div>
                            )}
                            {changesExpanded && unstagedChanges.map(change => (
                                <div key={change.path} className="group flex items-center gap-2 px-6 py-1 hover:bg-ide-hover transition-colors cursor-pointer">
                                    <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span className="text-xs text-ide-text-primary truncate flex-1">{change.fileName}</span>
                                    {statusIcon(change.status)}
                                    <button onClick={() => handleStage(change.path)} className="p-0.5 opacity-0 group-hover:opacity-100 text-ide-text-secondary hover:text-ide-text-primary transition-all" title="Stage">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
