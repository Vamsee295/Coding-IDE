import React, { useState, useEffect } from 'react';
import { Extension } from '@/types/extension';
import { extensionService } from '@/services/extensionService';
import {
    X, ArrowLeft, Download, Shield, Globe,
    History, Puzzle, Settings, CheckCircle2,
    XCircle, Loader2, Info, Package, User, Hash
} from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { cn } from '@/react-app/lib/utils';

interface ExtensionDetailsViewProps {
    extensionId: string;
    onBack: () => void;
}

type TabId = 'details' | 'features' | 'changelog';

export default function ExtensionDetailsView({ extensionId, onBack }: ExtensionDetailsViewProps) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('details');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        async function fetchDetails() {
            setLoading(true);
            try {
                const data = await extensionService.getVSCodeDetails(extensionId);
                setDetails(data);
            } catch (err) {
                console.error('[ExtensionDetails] Failed to fetch:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchDetails();
    }, [extensionId]);

    const handleUninstall = async () => {
        if (!confirm('Are you sure you want to uninstall this extension?')) return;
        setActionLoading(true);
        try {
            await extensionService.uninstall(extensionId);
            onBack();
        } catch (err) {
            alert('Failed to uninstall extension');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-ide-text-secondary">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-sm">Loading extension details…</span>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <XCircle className="w-10 h-10 text-red-400/50" />
                <span className="text-sm text-ide-text-secondary">Could not find extension details.</span>
                <Button variant="ghost" onClick={onBack} size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </Button>
            </div>
        );
    }

    const pkg = details.packageJson;
    const stats = [
        { label: 'Identifier', value: extensionId, icon: <Hash className="w-3.5 h-3.5" /> },
        { label: 'Version', value: pkg.version || '0.0.0', icon: <Package className="w-3.5 h-3.5" /> },
        { label: 'Publisher', value: pkg.publisher || 'Unknown', icon: <User className="w-3.5 h-3.5" /> },
        { label: 'Categories', value: (pkg.categories || []).join(', ') || 'None', icon: <Puzzle className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="flex flex-col h-full bg-ide-bg overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Nav */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-ide-border bg-ide-sidebar/30 shrink-0">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 text-ide-text-secondary hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="h-4 w-px bg-ide-border mx-1" />
                <span className="text-xs text-ide-text-secondary font-medium truncate opacity-60">Extensions / {pkg.displayName || pkg.name}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto px-8 py-10">
                    {/* Hero Section */}
                    <div className="flex gap-8 items-start mb-12">
                        <div className="w-32 h-32 rounded-2xl bg-ide-sidebar border border-ide-border flex items-center justify-center shrink-0 shadow-lg overflow-hidden group">
                            {pkg.icon ? (
                                <img src={`http://localhost:8082/vscode-extensions/icon/${extensionId}`}
                                    alt=""
                                    className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-500"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '';
                                        (e.target as any).parentNode.innerHTML = `<svg class="w-12 h-12 text-indigo-400 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.63 3 12"></polyline><polyline points="21 12 16.5 14.63 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
                                    }}
                                />
                            ) : (
                                <Puzzle className="w-16 h-16 text-indigo-400 opacity-50" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0 pt-2">
                            <h1 className="text-3xl font-bold text-ide-text-primary tracking-tight mb-2">
                                {pkg.displayName || pkg.name}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-ide-text-secondary mb-6">
                                <span className="hover:text-indigo-400 cursor-pointer transition-colors font-medium">{pkg.publisher}</span>
                                <span className="w-1 h-1 rounded-full bg-ide-border" />
                                <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> 2.5M installs</span>
                                <span className="w-1 h-1 rounded-full bg-ide-border" />
                                <span className="flex items-center gap-1 text-yellow-400">★★★★★ <span className="text-ide-text-secondary ml-1">(124)</span></span>
                            </div>
                            <p className="text-base text-ide-text-secondary/80 leading-relaxed mb-8 max-w-2xl">
                                {pkg.description}
                            </p>
                            <div className="flex items-center gap-3">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-6 rounded-md font-medium transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                                    Disable
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleUninstall}
                                    disabled={actionLoading}
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 px-6 rounded-md font-medium transition-all active:scale-95"
                                >
                                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Uninstall'}
                                </Button>
                                <div className="ml-2 flex items-center gap-2 group cursor-pointer px-3 py-1.5 rounded-md hover:bg-ide-sidebar/50 transition-colors">
                                    <Settings className="w-4 h-4 text-ide-text-secondary group-hover:text-indigo-400" />
                                    <span className="text-xs text-ide-text-secondary group-hover:text-indigo-400">Manage</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Area */}
                    <div className="flex gap-12 items-start border-t border-ide-border pt-2">
                        {/* Main Content */}
                        <div className="flex-1 pt-6 min-w-0">
                            <div className="flex items-center gap-8 border-b border-ide-border/50 mb-8 sticky top-0 bg-ide-bg z-10 pb-0.5">
                                {(['details', 'features', 'changelog'] as TabId[]).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "text-xs font-bold uppercase tracking-widest pb-3 px-1 transition-all border-b-2",
                                            activeTab === tab
                                                ? "text-indigo-400 border-indigo-400"
                                                : "text-ide-text-secondary border-transparent hover:text-white"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-ide-text-primary prose-p:text-ide-text-secondary/90 prose-pre:bg-ide-sidebar/50 prose-pre:border prose-pre:border-ide-border">
                                {activeTab === 'details' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {details.readme ? (
                                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed opacity-90">
                                                {details.readme}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                                                <Info className="w-12 h-12" />
                                                <span className="text-sm">No details provided by the extension.</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'features' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
                                        <section>
                                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-indigo-400" /> Configuration
                                            </h3>
                                            <div className="grid gap-4 bg-ide-sidebar/40 p-6 rounded-xl border border-ide-border/50">
                                                {pkg.contributes?.configuration ? (
                                                    <div className="space-y-6">
                                                        {Object.entries(pkg.contributes.configuration.properties || {}).map(([key, value]: [string, any]) => (
                                                            <div key={key} className="flex flex-col gap-1">
                                                                <span className="text-indigo-300 font-mono text-xs">{key}</span>
                                                                <span className="text-xs text-ide-text-secondary">{value.description || value.markdownDescription || 'No description'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-xs opacity-50 italic">No configuration settings.</span>}
                                            </div>
                                        </section>
                                        <section>
                                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                                <Puzzle className="w-5 h-5 text-indigo-400" /> Commands
                                            </h3>
                                            <div className="grid gap-4 bg-ide-sidebar/40 p-6 rounded-xl border border-ide-border/50">
                                                {(pkg.contributes?.commands || []).length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                        {(pkg.contributes.commands as any[]).map(cmd => (
                                                            <div key={cmd.command} className="flex flex-col gap-1">
                                                                <span className="text-sm text-ide-text-primary">{cmd.title}</span>
                                                                <span className="text-[10px] text-ide-text-secondary font-mono opacity-60">{cmd.command}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-xs opacity-50 italic">No commands provided.</span>}
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {activeTab === 'changelog' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {details.changelog ? (
                                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed opacity-90 p-4 border-l-2 border-indigo-500/30 bg-indigo-500/5 rounded-r-lg">
                                                {details.changelog}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                                                <History className="w-12 h-12" />
                                                <span className="text-sm">No changelog available.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Information */}
                        <div className="w-72 pt-10 sticky top-10">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-ide-text-secondary mb-6 flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-indigo-400" /> Metadata
                            </h4>
                            <div className="space-y-8">
                                {stats.map(stat => (
                                    <div key={stat.label} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-ide-text-primary">
                                            {stat.icon} {stat.label}
                                        </div>
                                        <div className="text-xs text-ide-text-secondary leading-relaxed pl-5 break-all">
                                            {stat.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 p-6 rounded-xl bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20">
                                <h5 className="text-xs font-bold text-indigo-300 mb-2">Marketplace</h5>
                                <p className="text-[10px] text-ide-text-secondary leading-normal mb-4">
                                    This extension was imported from your local VS Code installation.
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider cursor-pointer hover:underline">
                                    <Globe className="w-3 h-3" /> Visit Repository
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
