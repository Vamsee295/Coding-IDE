import { useState } from 'react';
import { GitBranch, X, Loader2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';

interface WelcomePageProps {
    recentWorkspaces: string[];
    onOpenFolder: () => void;
    onNewFile: () => void; // kept for prop compatibility
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
        <div className="h-full w-full bg-mesh relative overflow-y-auto flex items-center justify-center pb-24 font-body selection:bg-stitch-primary/30 selection:text-stitch-primary">
            <div className="max-w-2xl w-full px-6 flex flex-col items-center">
                {/* Logo & Brand Centered */}
                <div className="flex flex-col items-center mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[32px] text-white" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24", verticalAlign: "middle" }}>blur_on</span>
                        <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Stitch</h1>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stitch-on-surface-variant/60 font-medium">
                        <span>Free Plan</span>
                        <span>•</span>
                        <button className="hover:text-stitch-primary transition-colors">Upgrade</button>
                    </div>
                </div>

                {/* Primary Action Cards */}
                <div className="grid grid-cols-3 gap-3 w-full mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both">
                    <button onClick={onOpenFolder} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg group transition-all duration-200">
                        <span className="material-symbols-outlined text-stitch-on-surface-variant group-hover:text-stitch-primary transition-colors text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>folder_open</span>
                        <span className="text-[13px] font-medium text-stitch-on-surface-variant group-hover:text-white transition-colors">Open project</span>
                    </button>
                    <button onClick={() => setShowCloneDialog(true)} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg group transition-all duration-200">
                        <span className="material-symbols-outlined text-stitch-on-surface-variant group-hover:text-stitch-primary transition-colors text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>cloud_download</span>
                        <span className="text-[13px] font-medium text-stitch-on-surface-variant group-hover:text-white transition-colors">Clone repo</span>
                    </button>
                    <button onClick={() => alert("Connect via SSH not implemented")} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg group transition-all duration-200">
                        <span className="material-symbols-outlined text-stitch-on-surface-variant group-hover:text-stitch-primary transition-colors text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>terminal</span>
                        <span className="text-[13px] font-medium text-stitch-on-surface-variant group-hover:text-white transition-colors">Connect via SSH</span>
                    </button>
                </div>

                {/* Recent Projects Section */}
                <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-stitch-on-surface-variant/50">Recent projects</h2>
                        <a className="text-[11px] text-stitch-on-surface-variant/50 hover:text-stitch-on-surface transition-colors flex items-center gap-1" href="#" onClick={(e) => e.preventDefault()}>
                            View all ({recentWorkspaces.length > 0 ? recentWorkspaces.length : 85})
                        </a>
                    </div>
                    <div className="flex flex-col gap-1">
                        {recentWorkspaces.length === 0 ? (
                            <div className="py-6 text-center text-xs text-stitch-on-surface-variant/50 italic">
                                Your journey begins here. Open a project to get started.
                            </div>
                        ) : (
                            recentWorkspaces.slice(0, 5).map((ws, i) => {
                                const name = ws.split(/[/\\]/).filter(Boolean).pop() || ws;
                                const parent = ws.split(/[/\\]/).slice(0, -1).join('\\') || ws;
                                return (
                                    <div key={i} onClick={() => onOpenFile(ws)} className="group flex items-center justify-between py-1.5 px-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors">
                                        <span className="text-[13px] text-stitch-on-surface-variant group-hover:text-stitch-on-surface font-medium">{name}</span>
                                        <span className="text-[11px] font-mono text-stitch-on-surface-variant/40 group-hover:text-stitch-on-surface-variant/60">{parent}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Clone Repository Dialog */}
            {showCloneDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#13151f] border border-ide-border rounded-2xl shadow-2xl p-6 mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <GitBranch className="w-5 h-5 text-stitch-primary" />
                                <h2 className="text-base font-semibold text-white">Clone Repository</h2>
                            </div>
                            <button
                                onClick={() => { setShowCloneDialog(false); setCloneUrl(''); }}
                                className="text-stitch-on-surface-variant hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-stitch-on-surface-variant mb-4">
                            Enter a Git repository URL. The repo will be cloned into <code className="text-stitch-primary/80">~/cloned-repos/</code>
                        </p>

                        <input
                            type="text"
                            value={cloneUrl}
                            onChange={e => setCloneUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !isCloning && handleClone()}
                            placeholder="https://github.com/user/repo.git"
                            autoFocus
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-stitch-on-surface-variant/40 focus:outline-none focus:border-stitch-primary/70 focus:ring-1 focus:ring-stitch-primary/30 mb-4 font-mono"
                        />

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => { setShowCloneDialog(false); setCloneUrl(''); }}
                                className="flex-1 h-10 text-sm border-white/10 text-stitch-on-surface-variant hover:bg-white/5 hover:text-white rounded-xl bg-transparent"
                                disabled={isCloning}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleClone}
                                disabled={!cloneUrl.trim() || isCloning}
                                className="flex-1 h-10 bg-stitch-primary hover:bg-stitch-primary/90 disabled:opacity-50 text-slate-900 border-none text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
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
