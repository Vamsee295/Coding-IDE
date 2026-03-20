import { useState } from 'react';
import { FolderOpen, GitBranch, Terminal, X, Loader2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';

interface WelcomePageProps {
    recentWorkspaces: string[];
    onOpenFolder: () => void;
    onNewFile: () => void;
    onOpenFile: (path: string) => void;
    onOpenCommandPalette: () => void;
    onCloneRepo: (url: string) => Promise<void>;
}

export default function WelcomePage({ recentWorkspaces, onOpenFolder, onOpenFile, onCloneRepo }: WelcomePageProps) {
    const [showCloneDialog, setShowCloneDialog] = useState(false);
    const [cloneUrl, setCloneUrl] = useState('');
    const [isCloning, setIsCloning] = useState(false);

    const handleClone = async () => {
        if (!cloneUrl.trim()) return;
        setIsCloning(true);
        try {
            await onCloneRepo(cloneUrl.trim());
            setShowCloneDialog(false);
            setCloneUrl('');
        } finally {
            setIsCloning(false);
        }
    };

    return (
        <div className="h-full w-full bg-radial-gradient flex flex-col items-center p-6 overflow-y-auto select-none animate-in fade-in duration-700">
            <div className="w-full max-w-md flex flex-col items-center my-auto py-8">
                
                {/* Logo / Icon */}
                <div className="mb-10 flex flex-col items-center">
                    <div className="w-24 h-24 flex items-center justify-center mb-6 relative group">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-700" />
                        <svg viewBox="0 0 100 100" className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-glow relative z-10 transition-transform duration-500 group-hover:scale-110">
                            <path 
                                d="M50 15 L15 85 L35 85 L50 50 L65 85 L85 85 Z" 
                                fill="currentColor" 
                                className="fill-current"
                            />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tighter text-glow-indigo">
                        OLLAMA AI
                    </h1>
                    <p className="text-sm text-ide-text-secondary mt-2 opacity-80">
                        Local AI Code Editor — Reimagined
                    </p>
                </div>

                {/* Primary Actions */}
                <div className="w-full space-y-4 mb-12">
                    <Button 
                        onClick={onOpenFolder}
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-3 shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] transition-all duration-300 hover:translate-y-[-2px] active:scale-95"
                    >
                        <FolderOpen className="w-5 h-5" />
                        Open Folder
                    </Button>

                    <div className="grid grid-cols-2 gap-4">
                        <Button 
                            variant="secondary"
                            onClick={() => alert("Open Agent Manager not implemented")}
                            className="h-11 text-xs bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl flex items-center justify-center gap-2 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-1px]"
                        >
                            <Terminal className="w-4 h-4 text-emerald-400" />
                            Agent Manager
                        </Button>
                        <Button 
                            variant="secondary"
                            onClick={() => setShowCloneDialog(true)}
                            className="h-11 text-xs bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl flex items-center justify-center gap-2 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-1px]"
                        >
                            <GitBranch className="w-4 h-4 text-purple-400" />
                            Clone Repository
                        </Button>
                    </div>
                </div>

                {/* Recent Items / Workspaces */}
                <div className="w-full glass-panel-dark rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ide-text-secondary/60">Recent Workspaces</span>
                    </div>

                    <div className="space-y-1">
                        {recentWorkspaces.length === 0 ? (
                            <div className="py-6 text-center text-xs text-ide-text-secondary/50 italic">
                                Your journey begins here. Open a folder to get started.
                            </div>
                        ) : (
                            recentWorkspaces.slice(0, 5).map((ws, i) => {
                                const name = ws.split(/[/\\]/).filter(Boolean).pop() || ws;
                                const parent = ws.split(/[/\\]/).slice(0, -1).join('\\') || ws;
                                return (
                                    <div
                                        key={i}
                                        onClick={() => onOpenFile(ws)}
                                        className="w-full p-3 hover:bg-white/5 cursor-pointer flex flex-col gap-0.5 group transition-all duration-200 rounded-xl"
                                    >
                                        <div className="text-[13px] font-medium text-ide-text-primary group-hover:text-white transition-colors capitalize">{name}</div>
                                        <div className="text-[11px] text-ide-text-secondary/70 truncate group-hover:text-ide-text-secondary transition-colors">{parent}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {recentWorkspaces.length > 5 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <button className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mx-auto">
                                View all workspaces
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Clone Repository Dialog */}
            {showCloneDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#13151f] border border-ide-border rounded-2xl shadow-2xl p-6 mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <GitBranch className="w-5 h-5 text-purple-400" />
                                <h2 className="text-base font-semibold text-white">Clone Repository</h2>
                            </div>
                            <button
                                onClick={() => { setShowCloneDialog(false); setCloneUrl(''); }}
                                className="text-ide-text-secondary hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-ide-text-secondary mb-4">
                            Enter a Git repository URL. The repo will be cloned into <code className="text-indigo-300">~/cloned-repos/</code>
                        </p>

                        <input
                            type="text"
                            value={cloneUrl}
                            onChange={e => setCloneUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !isCloning && handleClone()}
                            placeholder="https://github.com/user/repo.git"
                            autoFocus
                            className="w-full bg-ide-bg border border-ide-border rounded-xl px-3 py-2.5 text-sm text-ide-text-primary placeholder-ide-text-secondary/50 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 mb-4 font-mono"
                        />

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setShowCloneDialog(false); setCloneUrl(''); }}
                                className="flex-1 h-10 text-sm border-ide-border text-ide-text-secondary hover:bg-ide-hover rounded-xl"
                                disabled={isCloning}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleClone}
                                disabled={!cloneUrl.trim() || isCloning}
                                className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2"
                            >
                                {isCloning ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Cloning...</>
                                ) : (
                                    <><GitBranch className="w-4 h-4" /> Clone</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
