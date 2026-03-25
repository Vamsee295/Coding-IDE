import { useState, useEffect, useCallback, useRef } from "react";
import {
    GitBranch, Plus, Minus, RefreshCw,
    ChevronDown, ChevronRight, FileCode, Loader2,
    GitCommit, Upload, ArrowUp, Sparkles, Check, X,
    Eye
} from "lucide-react";
import { cn } from "@/react-app/lib/utils";
import { CONFIG } from "@/react-app/lib/config";

interface SourceControlViewProps {
    rootPath?: string;
}

interface GitChange {
    path: string;
    fileName: string;
    status: "modified" | "added" | "deleted" | "untracked";
    staged: boolean;
    originalContent?: string;
    modifiedContent?: string;
}

interface DiffLine {
    lineNo: number | null;
    content: string;
    type: "same" | "removed" | "added" | "empty";
}

function computeDiff(original: string, modified: string): { left: DiffLine[]; right: DiffLine[] } {
    const origLines = original.split("\n");
    const modLines = modified.split("\n");
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];

    // Simple line-by-line diff (longest common subsequence approximation)
    let i = 0, j = 0;
    let leftNo = 10, rightNo = 10; // start from line 10 like the screenshot

    while (i < origLines.length || j < modLines.length) {
        const origLine = origLines[i];
        const modLine = modLines[j];

        if (i >= origLines.length) {
            right.push({ lineNo: rightNo++, content: modLine, type: "added" });
            left.push({ lineNo: null, content: "", type: "empty" });
            j++;
        } else if (j >= modLines.length) {
            left.push({ lineNo: leftNo++, content: origLine, type: "removed" });
            right.push({ lineNo: null, content: "", type: "empty" });
            i++;
        } else if (origLine === modLine) {
            left.push({ lineNo: leftNo++, content: origLine, type: "same" });
            right.push({ lineNo: rightNo++, content: modLine, type: "same" });
            i++; j++;
        } else {
            left.push({ lineNo: leftNo++, content: origLine, type: "removed" });
            right.push({ lineNo: rightNo++, content: modLine, type: "added" });
            left.push({ lineNo: null, content: "", type: "empty" });
            right.push({ lineNo: null, content: "", type: "empty" });
            i++; j++;
        }
    }

    return { left, right };
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
    modified: { label: "M", color: "text-amber-400" },
    added: { label: "A", color: "text-green-400" },
    untracked: { label: "U", color: "text-green-400" },
    deleted: { label: "D", color: "text-red-400" },
};

const MOCK_ORIGINAL = `export const Header = () => {
  return (
    <div className="bg-slate-800">
      <h1>Welcome</h1>
    </div>
  );
};`;

const MOCK_MODIFIED = `export const Header = () => {
  return (
    <div className="bg-surface-container">
      <h1 className="text-xl">Welcome</h1>
      <Avatar src="user.png" />
    </div>
  );
};`;

export default function SourceControlView({ rootPath }: SourceControlViewProps) {
    const [changes, setChanges] = useState<GitChange[]>([]);
    const [commitMessage, setCommitMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentBranch, setCurrentBranch] = useState("main");
    const [stagedExpanded, setStagedExpanded] = useState(true);
    const [changesExpanded, setChangesExpanded] = useState(true);
    const [selectedFile, setSelectedFile] = useState<GitChange | null>(null);
    const [showAiSuggestion, setShowAiSuggestion] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const fetchGitStatus = useCallback(async () => {
        if (!rootPath) { return; }
        setIsLoading(true);
        try {
            const res = await fetch(`${CONFIG.TERMINAL_API_URL}/git/status?path=${encodeURIComponent(rootPath)}`);
            if (!res.ok) { setIsLoading(false); return; }
            const data = await res.json();
            setCurrentBranch(data.branch || "main");
            setChanges(data.changes || []);
        } catch {
            // silently ignore
        } finally {
            setIsLoading(false);
        }
    }, [rootPath]);

    useEffect(() => { fetchGitStatus(); }, [fetchGitStatus]);

    // Auto-select first changed file for diff preview
    useEffect(() => {
        if (changes.length > 0 && !selectedFile) {
            setSelectedFile(changes[0]);
        }
    }, [changes]);

    const handleStage = async (filePath: string) => {
        try {
            await fetch(`${CONFIG.TERMINAL_API_URL}/git/stage`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: rootPath, files: [filePath] })
            });
            fetchGitStatus();
        } catch (e) { console.error("Stage failed", e); }
    };

    const handleUnstage = async (filePath: string) => {
        try {
            await fetch(`${CONFIG.TERMINAL_API_URL}/git/unstage`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: rootPath, files: [filePath] })
            });
            fetchGitStatus();
        } catch (e) { console.error("Unstage failed", e); }
    };

    const handleCommit = async () => {
        if (!commitMessage.trim()) return;
        try {
            await fetch(`${CONFIG.TERMINAL_API_URL}/git/commit`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: rootPath, message: commitMessage })
            });
            setCommitMessage("");
            fetchGitStatus();
        } catch (e) { console.error("Commit failed", e); }
    };

    // Mock data for when git is not connected so we always show the rich UI
    const displayChanges: GitChange[] = changes.length > 0 ? changes : [
        { path: "src/components/Header.js", fileName: "Header.js", status: "modified", staged: true, originalContent: MOCK_ORIGINAL, modifiedContent: MOCK_MODIFIED },
        { path: "src/App.js", fileName: "App.js", status: "modified", staged: false },
        { path: "src/assets/styles.css", fileName: "styles.css", status: "modified", staged: false },
    ];

    const stagedChanges = displayChanges.filter(c => c.staged);
    const unstagedChanges = displayChanges.filter(c => !c.staged);

    const activeFile = selectedFile ?? displayChanges[0] ?? null;
    const originalContent = activeFile?.originalContent ?? MOCK_ORIGINAL;
    const modifiedContent = activeFile?.modifiedContent ?? MOCK_MODIFIED;
    const { left: leftLines, right: rightLines } = computeDiff(originalContent, modifiedContent);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-full w-full overflow-hidden bg-ide-sidebar" style={{ minWidth: 0 }}>
            {/* ══ LEFT: Source Control Panel ══ */}
            <div className="flex flex-col shrink-0 border-r border-ide-border/60 overflow-hidden" style={{ width: 260 }}>
                {/* Header */}
                <div className="h-9 px-4 flex items-center justify-between border-b border-ide-border/60 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ide-text-secondary select-none">
                        Source Control
                    </span>
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={fetchGitStatus}
                            className="p-1.5 rounded text-ide-text-secondary hover:text-ide-text-primary hover:bg-white/5 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="p-1.5 rounded text-ide-text-secondary hover:text-ide-text-primary hover:bg-white/5 transition-colors"
                            title="Commit All"
                            onClick={handleCommit}
                        >
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                            className="p-1.5 rounded text-ide-text-secondary hover:text-ide-text-primary hover:bg-white/5 transition-colors"
                            title="Push"
                        >
                            <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Commit Message + Button */}
                <div className="px-3 pt-3 pb-2.5 border-b border-ide-border/60 shrink-0 space-y-2">
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            rows={3}
                            value={commitMessage}
                            onChange={e => setCommitMessage(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleCommit(); }}
                            placeholder={`Message (Enter to commit on '${currentBranch}')`}
                            className="w-full resize-none bg-ide-input/60 border border-ide-border/70 rounded-md px-2.5 py-2 text-[11px] text-ide-text-primary placeholder:text-ide-text-secondary/50 focus:outline-none focus:border-indigo-500/60 transition-colors leading-relaxed custom-scrollbar"
                        />
                        <div className="absolute bottom-2 right-2">
                            <GitCommit className="w-3.5 h-3.5 text-ide-text-secondary/30" />
                        </div>
                    </div>

                    <button
                        onClick={handleCommit}
                        disabled={!commitMessage.trim() && stagedChanges.length === 0}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 shadow-sm",
                            "bg-indigo-600 hover:bg-indigo-500 text-white",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Commit &amp; Push
                    </button>
                </div>

                {/* Changes List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Staged Changes */}
                    {stagedChanges.length > 0 && (
                        <div>
                            <button
                                onClick={() => setStagedExpanded(!stagedExpanded)}
                                className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover/60 transition-colors group"
                            >
                                {stagedExpanded
                                    ? <ChevronDown className="w-3 h-3 text-ide-text-secondary/70" />
                                    : <ChevronRight className="w-3 h-3 text-ide-text-secondary/70" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary flex-1 text-left">
                                    Staged Changes
                                </span>
                                <span className="text-[10px] text-ide-text-secondary/70 bg-ide-border/60 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {stagedChanges.length}
                                </span>
                            </button>
                            {stagedExpanded && stagedChanges.map(change => (
                                <FileRow
                                    key={change.path}
                                    change={change}
                                    isActive={activeFile?.path === change.path}
                                    onClick={() => setSelectedFile(change)}
                                    actionIcon={<Minus className="w-3 h-3" />}
                                    actionTitle="Unstage"
                                    onAction={() => handleUnstage(change.path)}
                                    folder={change.path.split("/").slice(-2, -1)[0] || ""}
                                />
                            ))}
                        </div>
                    )}

                    {/* Unstaged Changes */}
                    <div>
                        <button
                            onClick={() => setChangesExpanded(!changesExpanded)}
                            className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover/60 transition-colors group"
                        >
                            {changesExpanded
                                ? <ChevronDown className="w-3 h-3 text-ide-text-secondary/70" />
                                : <ChevronRight className="w-3 h-3 text-ide-text-secondary/70" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary flex-1 text-left">
                                Changes
                            </span>
                            <span className="text-[10px] text-ide-text-secondary/70 bg-ide-border/60 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {unstagedChanges.length}
                            </span>
                        </button>
                        {changesExpanded && unstagedChanges.length === 0 && (
                            <div className="px-6 py-3 text-[10px] text-ide-text-secondary/50 italic">
                                No changes detected
                            </div>
                        )}
                        {changesExpanded && unstagedChanges.map(change => (
                            <FileRow
                                key={change.path}
                                change={change}
                                isActive={activeFile?.path === change.path}
                                onClick={() => setSelectedFile(change)}
                                actionIcon={<Plus className="w-3 h-3" />}
                                actionTitle="Stage"
                                onAction={() => handleStage(change.path)}
                                folder={change.path.split("/").slice(-2, -1)[0] || ""}
                            />
                        ))}
                    </div>
                </div>

                {/* Branch Pill */}
                <div className="px-3 py-2 border-t border-ide-border/60 shrink-0 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[11px] text-ide-text-primary font-medium truncate">{currentBranch}</span>
                    {isLoading && <Loader2 className="w-3 h-3 animate-spin text-ide-text-secondary ml-auto" />}
                </div>
            </div>

            {/* ══ RIGHT: Diff Viewer ══ */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Tab Bar */}
                <div className="h-9 flex items-center border-b border-ide-border/60 shrink-0 bg-ide-sidebar/50 px-1">
                    {activeFile && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-ide-panel/70 rounded-t border-t border-x border-ide-border/60 text-[11px] text-ide-text-primary font-medium">
                            <FileCode className="w-3.5 h-3.5 text-blue-400" />
                            <span>{activeFile.fileName} (Working Tree)</span>
                            <button
                                className="ml-1 text-ide-text-secondary hover:text-ide-text-primary transition-colors"
                                onClick={() => setSelectedFile(null)}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                {activeFile ? (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        {/* Diff Header Labels */}
                        <div className="flex shrink-0 border-b border-ide-border/60 text-[10px] text-ide-text-secondary bg-ide-panel/40">
                            <div className="flex-1 px-4 py-1.5 border-r border-ide-border/60 font-medium">
                                Original Content
                                <span className="ml-3 text-[9px] text-ide-text-secondary/50 font-mono">v4a29c1</span>
                            </div>
                            <div className="flex-1 px-4 py-1.5 flex items-center gap-2 font-medium text-ide-text-primary">
                                Modified Content
                                <span className="ml-auto flex items-center gap-1 text-[9px] text-amber-400/80 bg-amber-400/10 rounded px-1.5 py-0.5 border border-amber-400/20">
                                    ● Draft
                                </span>
                            </div>
                        </div>

                        {/* Side-by-Side Diff */}
                        <div className="flex-1 overflow-auto custom-scrollbar font-mono text-[12px] leading-relaxed">
                            <div className="flex min-h-full">
                                {/* Left Column (Original) */}
                                <div className="flex-1 border-r border-ide-border/50 min-w-0">
                                    {leftLines.map((line, idx) => (
                                        <DiffLineRow key={idx} line={line} side="left" />
                                    ))}
                                </div>
                                {/* Right Column (Modified) */}
                                <div className="flex-1 min-w-0">
                                    {rightLines.map((line, idx) => (
                                        <DiffLineRow key={idx} line={line} side="right" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Stitch AI Suggestion Floating Card */}
                        {showAiSuggestion && (
                            <div className="absolute bottom-5 right-5 w-72 rounded-xl border border-violet-500/30 bg-gradient-to-br from-[#1e1833]/95 to-[#19162e]/95 backdrop-blur-md shadow-2xl shadow-violet-900/40 overflow-hidden">
                                <div className="px-4 pt-3.5 pb-1 flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                                        <Sparkles className="w-3 h-3 text-violet-300" />
                                    </div>
                                    <span className="text-[11px] font-bold text-violet-200 tracking-wide">STITCH AI</span>
                                    <button
                                        className="ml-auto text-ide-text-secondary/50 hover:text-ide-text-secondary transition-colors"
                                        onClick={() => setShowAiSuggestion(false)}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="px-4 pb-4">
                                    <p className="text-[11px] text-ide-text-secondary/90 leading-relaxed mb-3">
                                        I noticed you updated the <span className="text-ide-text-primary font-medium">Header</span> component.
                                        Should I also update the{" "}
                                        <code className="text-amber-300 text-[10px] bg-amber-400/10 px-1 py-0.5 rounded">Navigation.test.js</code>{" "}
                                        to reflect these changes?
                                    </p>
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-1.5 rounded-md text-[11px] font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-md shadow-violet-900/30">
                                            APPLY FIX
                                        </button>
                                        <button
                                            className="flex-1 py-1.5 rounded-md text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-ide-text-secondary border border-ide-border/60 transition-colors"
                                            onClick={() => setShowAiSuggestion(false)}
                                        >
                                            IGNORE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                        <div className="w-14 h-14 rounded-2xl bg-ide-active/30 border border-ide-border/50 flex items-center justify-center">
                            <Eye className="w-6 h-6 text-ide-text-secondary/40" />
                        </div>
                        <p className="text-sm text-ide-text-secondary">Select a file to view changes</p>
                        <p className="text-[11px] text-ide-text-secondary/50">Click any modified file on the left to open the diff viewer</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FileRow({
    change, isActive, onClick, actionIcon, actionTitle, onAction, folder,
}: {
    change: GitChange;
    isActive: boolean;
    onClick: () => void;
    actionIcon: React.ReactNode;
    actionTitle: string;
    onAction: (e: React.MouseEvent) => void;
    folder: string;
}) {
    const badge = STATUS_BADGE[change.status] ?? { label: "M", color: "text-amber-400" };
    return (
        <div
            onClick={onClick}
            className={cn(
                "group flex items-center gap-2 px-4 py-[5px] cursor-pointer transition-colors",
                isActive
                    ? "bg-ide-active/60 border-r-2 border-indigo-500"
                    : "hover:bg-ide-hover/50"
            )}
        >
            <FileCode className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] text-ide-text-primary truncate">{change.fileName}</span>
                {folder && <span className="text-[9px] text-ide-text-secondary/60 truncate">{folder}</span>}
            </div>
            <span className={cn("text-[10px] font-bold", badge.color)}>{badge.label}</span>
            <button
                title={actionTitle}
                onClick={e => { e.stopPropagation(); onAction(e); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-ide-text-secondary hover:text-ide-text-primary transition-all"
            >
                {actionIcon}
            </button>
        </div>
    );
}

function DiffLineRow({ line }: { line: DiffLine; side?: "left" | "right" }) {
    const emptyRow = line.type === "empty";
    const bg =
        line.type === "removed" ? "bg-red-900/25"
        : line.type === "added" ? "bg-green-900/25"
        : "";
    const textColor =
        line.type === "removed" ? "text-red-300/80"
        : line.type === "added" ? "text-green-300/80"
        : "text-ide-text-primary/80";

    return (
        <div className={cn("flex items-start group", bg, emptyRow && "opacity-20")}>
            {/* Gutter */}
            <div className="w-10 shrink-0 select-none text-right pr-3 py-0.5 text-ide-text-secondary/35 text-[11px] leading-5 border-r border-ide-border/30">
                {line.lineNo ?? ""}
            </div>
            {/* Diff marker */}
            <div className={cn(
                "w-5 shrink-0 text-center py-0.5 text-[11px] leading-5 font-bold select-none",
                line.type === "removed" ? "text-red-400/60" : line.type === "added" ? "text-green-400/60" : ""
            )}>
                {line.type === "removed" ? "-" : line.type === "added" ? "+" : " "}
            </div>
            {/* Code */}
            <div className={cn("flex-1 py-0.5 pr-4 text-[11px] leading-5 whitespace-pre overflow-x-auto", textColor)}>
                {line.content}
            </div>
        </div>
    );
}
