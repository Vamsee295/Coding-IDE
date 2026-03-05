import { Zap, FolderOpen, FileText, Terminal, MessageSquare, Book, ChevronRight, Clock } from 'lucide-react';

interface WelcomePageProps {
    recentWorkspaces: string[];
    onOpenFolder: () => void;
    onNewFile: () => void;
    onOpenFile: (path: string) => void;
    onOpenCommandPalette: () => void;
}

export default function WelcomePage({ recentWorkspaces, onOpenFolder, onNewFile, onOpenFile, onOpenCommandPalette }: WelcomePageProps) {
    const quickActions = [
        { icon: <FolderOpen className="w-4 h-4" />, label: "Open Folder", desc: "Open a local project folder", action: onOpenFolder, shortcut: "Ctrl+K Ctrl+O" },
        { icon: <FileText className="w-4 h-4" />, label: "New File", desc: "Create an untitled file", action: onNewFile, shortcut: "Ctrl+N" },
        { icon: <Zap className="w-4 h-4" />, label: "Command Palette", desc: "Search all IDE commands", action: onOpenCommandPalette, shortcut: "Ctrl+Shift+P" },
        { icon: <Book className="w-4 h-4" />, label: "Documentation", desc: "Browse the VS Code docs", action: () => window.open("https://code.visualstudio.com/docs", "_blank") },
    ];

    return (
        <div className="h-full w-full overflow-y-auto bg-ide-editor flex items-start justify-center pt-16 px-8">
            <div className="w-full max-w-3xl space-y-10">
                {/* Hero */}
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                        <Terminal className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-ide-text-primary tracking-tight">StackFlow IDE</h1>
                        <p className="text-ide-text-secondary text-sm mt-1">AI-powered local code editor — built for developers</p>
                    </div>
                </div>

                {/* Quick Start */}
                <div>
                    <h2 className="text-xs font-semibold text-ide-text-secondary uppercase tracking-widest mb-3">Quick Start</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((a, i) => (
                            <button
                                key={i}
                                onClick={a.action}
                                className="flex items-start gap-3 p-4 rounded-xl border border-ide-border bg-ide-sidebar hover:bg-ide-hover hover:border-indigo-500/50 transition-all text-left group"
                            >
                                <span className="mt-0.5 text-indigo-400 group-hover:text-indigo-300">{a.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-ide-text-primary">{a.label}</div>
                                    <div className="text-xs text-ide-text-secondary mt-0.5">{a.desc}</div>
                                </div>
                                {a.shortcut && (
                                    <kbd className="text-[10px] text-ide-text-secondary bg-ide-bg px-1.5 py-0.5 rounded border border-ide-border font-mono shrink-0 self-center opacity-70">{a.shortcut}</kbd>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Workspaces */}
                {recentWorkspaces.length > 0 && (
                    <div>
                        <h2 className="text-xs font-semibold text-ide-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Recent Workspaces
                        </h2>
                        <div className="space-y-1">
                            {recentWorkspaces.slice(0, 8).map((ws, i) => {
                                const name = ws.split(/[/\\]/).filter(Boolean).pop() || ws;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => onOpenFile(ws)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ide-hover text-left group transition-colors"
                                    >
                                        <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-ide-text-primary truncate">{name}</div>
                                            <div className="text-xs text-ide-text-secondary truncate">{ws}</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-ide-text-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tip */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                    <MessageSquare className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-medium text-indigo-300">Pro Tip</p>
                        <p className="text-xs text-ide-text-secondary mt-1">Open the <strong className="text-ide-text-primary">AI Chat</strong> panel (Ctrl+Shift+A) to generate, explain, or refactor code using your local Ollama model.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
