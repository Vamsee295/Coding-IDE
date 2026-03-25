import React, { useState, useEffect } from "react";
import { Extension } from "@/types/extension";

import ImportVSCodeModal from "@/react-app/components/settings/ImportVSCodeModal";
import ExtensionDetailsView from "@/react-app/components/settings/ExtensionDetailsView";
import { useExtensions } from "@/react-app/contexts/ExtensionContext";
import {
    Code2, Sparkles, Play, GitBranch, ScanLine, Loader2,
    CheckCircle2, XCircle, Download, Search,
    SlidersHorizontal, Star, Palette,
    Bug, Cpu, Database, Terminal,
} from "lucide-react";
import { cn } from "@/react-app/lib/utils";

// ─── Marketplace data ───────────────────────────────────────────────────────

interface MarketplaceItem {
    id: string;
    name: string;
    author: string;
    description: string;
    rating: number;
    reviews: string;
    installs: string;
    icon: React.ReactNode;
    iconBg: string;
    featured?: boolean;
    installed?: boolean;
    category?: string;
}

const FEATURED: MarketplaceItem = {
    id: "stitch-ai-pro",
    name: "Stitch AI Pro",
    author: "STITCH LABS",
    description: "The ultimate AI coding companion. Autocomplete entire functions, refactor code instantly, and write tests with one click using the latest LLM engines.",
    rating: 4.9,
    reviews: "1.2M reviews",
    installs: "15.4M installs",
    icon: <Sparkles className="w-8 h-8 text-violet-300" />,
    iconBg: "bg-violet-600/20 border-violet-500/30",
    featured: true,
};

const MARKETPLACE_GRID: MarketplaceItem[] = [
    {
        id: "midnight-nebula",
        name: "Midnight Nebula",
        author: "STITCH LABS",
        description: "A high-contrast dark theme with vibrant neon syntax highlighting...",
        rating: 4.8,
        reviews: "",
        installs: "2.1M",
        icon: <Palette className="w-5 h-5 text-pink-300" />,
        iconBg: "bg-pink-500/15",
        category: "THEME",
    },
    {
        id: "rust-analyzer",
        name: "Rust Analyzer",
        author: "DEBUG_TOOLS",
        description: "Deep code intelligence and debugging for the Rust langua...",
        rating: 4.9,
        reviews: "",
        installs: "5.8M",
        icon: <Bug className="w-5 h-5 text-orange-300" />,
        iconBg: "bg-orange-500/15",
        category: "DEBUG_TOOLS",
    },
    {
        id: "docker-explorer",
        name: "Docker Explorer",
        author: "DOCKER INC",
        description: "Easily manage containers, images, and registries directly...",
        rating: 4.7,
        reviews: "",
        installs: "12.3M",
        icon: <Cpu className="w-5 h-5 text-sky-300" />,
        iconBg: "bg-sky-500/15",
        category: "DOCKER INC",
    },
    {
        id: "vim-emulation",
        name: "Vim Emulation",
        author: "SHELL_PRO",
        description: "A powerful Vim emulation layer for Stitch, supporting multiple...",
        rating: 4.5,
        reviews: "",
        installs: "8.9M",
        icon: <Terminal className="w-5 h-5 text-green-300" />,
        iconBg: "bg-green-500/15",
        category: "SHELL_PRO",
    },
    {
        id: "sql-optimizer",
        name: "SQL Optimizer",
        author: "SQL_MASTERS",
        description: "Real-time performance suggestions for your SQL querie...",
        rating: 4.6,
        reviews: "",
        installs: "1.4M",
        icon: <Database className="w-5 h-5 text-amber-300" />,
        iconBg: "bg-amber-500/15",
        category: "SQL_MASTERS",
    },
    {
        id: "gitlens-extreme",
        name: "GitLens Extreme",
        author: "GIT_FLOW",
        description: "Visualize code authorship at a glance via Git blame annotation...",
        rating: 4.9,
        reviews: "",
        installs: "35.1M",
        icon: <GitBranch className="w-5 h-5 text-indigo-300" />,
        iconBg: "bg-indigo-500/15",
        category: "GIT_FLOW",
    },
];

// ─── Installed extension sidebar item ────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
    formatting: <Code2 className="w-4 h-4" />,
    ai: <Sparkles className="w-4 h-4" />,
    tools: <Play className="w-4 h-4" />,
    vcs: <GitBranch className="w-4 h-4" />,
    default: <ScanLine className="w-4 h-4" />,
};

const ICON_COLOR: Record<string, string> = {
    formatting: "text-blue-400 bg-blue-500/15",
    ai: "text-violet-400 bg-violet-500/15",
    tools: "text-green-400 bg-green-500/15",
    vcs: "text-orange-400 bg-orange-500/15",
    default: "text-gray-400 bg-gray-500/15",
};

const MOCK_INSTALLED: Extension[] = [
    { id: "prettier", name: "Prettier - Code formatter", description: "Code formatter using prettier", category: "formatting", version: "10.1.0", enabled: true },
    { id: "eslint", name: "ESLint", description: "Integrates ESLint into Stitch", category: "tools", version: "2.4.4", enabled: true },
    { id: "python", name: "Python", description: "IntelliSense (Pylance), Linting", category: "tools", version: "2024.1", enabled: true },
    { id: "tailwind", name: "Tailwind CSS IntelliSense", description: "Intelligent Tailwind CSS tooling", category: "formatting", version: "0.10.5", enabled: true },
];

function InstalledRow({
    ext,
    active,
    onClick,
}: {
    ext: Extension;
    active: boolean;
    onClick: () => void;
}) {
    const iconClass = ICON_COLOR[ext.category] ?? ICON_COLOR.default;
    const icon = ICON_MAP[ext.category] ?? ICON_MAP.default;
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex gap-3 px-4 py-3 cursor-pointer transition-colors group",
                active ? "bg-ide-active/50 border-l-2 border-indigo-500" : "border-l-2 border-transparent hover:bg-ide-hover/50"
            )}
        >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative", iconClass)}>
                {icon}
                {ext.enabled && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-ide-sidebar" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-ide-text-primary truncate">{ext.name}</span>
                    {ext.enabled && <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />}
                </div>
                <p className="text-[10px] text-ide-text-secondary/70 truncate">{ext.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-mono text-indigo-400/80">v{ext.version}</span>
                    <span className="text-[9px] text-ide-text-secondary/50">·</span>
                    <span className="text-[9px] text-ide-text-secondary/50">
                        {ext.category === "formatting" ? "32.4M" : ext.category === "tools" && ext.id === "eslint" ? "28.1M" : ext.category === "tools" ? "94.2M" : "6.8M"}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Marketplace card ────────────────────────────────────────────────────────

function MarketplaceCard({ item }: { item: MarketplaceItem }) {
    const [installed, setInstalled] = useState(item.installed ?? false);
    const [installing, setInstalling] = useState(false);

    const handleInstall = (e: React.MouseEvent) => {
        e.stopPropagation();
        setInstalling(true);
        setTimeout(() => { setInstalling(false); setInstalled(true); }, 1200);
    };

    return (
        <div className="flex flex-col gap-3 p-5 rounded-xl border border-ide-border/60 bg-ide-sidebar/50 hover:bg-ide-sidebar hover:border-indigo-500/30 transition-all cursor-pointer group">
            {/* Author label */}
            <div className="flex items-center justify-between">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.iconBg, "border border-white/10")}>
                    {item.icon}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-ide-text-secondary/60">{item.author}</span>
            </div>
            {/* Name + description */}
            <div>
                <h3 className="text-[13px] font-bold text-ide-text-primary mb-1">{item.name}</h3>
                <p className="text-[11px] text-ide-text-secondary/70 leading-relaxed line-clamp-2">{item.description}</p>
            </div>
            {/* Stats + install */}
            <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary/70">
                    <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {item.rating}
                    </span>
                    <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {item.installs}
                    </span>
                </div>
                <button
                    onClick={handleInstall}
                    className={cn(
                        "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                        installed
                            ? "text-green-400 bg-green-500/10 border border-green-500/30"
                            : "text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors"
                    )}
                >
                    {installing ? <Loader2 className="w-3 h-3 animate-spin" /> : installed ? "INSTALLED" : "INSTALL"}
                </button>
            </div>
        </div>
    );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export default function ExtensionsPanel() {
    const { extensions, loading, refreshExtensions } = useExtensions();
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeInstalledId, setActiveInstalledId] = useState<string | null>(null);

    const installedList: Extension[] = extensions.length > 0 ? extensions : MOCK_INSTALLED;
    const filteredInstalled = installedList.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    if (selectedExtensionId) {
        return (
            <ExtensionDetailsView
                extensionId={selectedExtensionId}
                onBack={() => { setSelectedExtensionId(null); refreshExtensions(); }}
            />
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Toast */}
            {toast && (
                <div className={cn(
                    "absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium transition-all",
                    toast.type === "success"
                        ? "bg-green-900/90 border border-green-500/30 text-green-300"
                        : "bg-red-900/90 border border-red-500/30 text-red-300"
                )}>
                    {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}

            <ImportVSCodeModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImported={() => { setToast({ message: "VS Code extensions imported!", type: "success" }); refreshExtensions().catch(() => {}); }}
            />

            {/* ── LEFT: Installed Extensions Sidebar ─────────────────────── */}
            <div className="flex flex-col shrink-0 border-r border-ide-border/60 bg-ide-sidebar overflow-hidden" style={{ width: 260 }}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-ide-border/60 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ide-text-secondary select-none">
                            Extensions
                        </span>
                        <button
                            className="text-ide-text-secondary/50 hover:text-ide-text-secondary transition-colors"
                            title="Filter"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ide-text-secondary/50" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="prettier"
                            className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-ide-input/60 border border-ide-border/70 rounded text-ide-text-primary placeholder:text-ide-text-secondary/40 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Installed list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading && (
                        <div className="space-y-0">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-lg bg-ide-active/30 shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-ide-active/30 rounded w-3/4" />
                                        <div className="h-2 bg-ide-active/20 rounded w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && filteredInstalled.map(ext => (
                        <InstalledRow
                            key={ext.id}
                            ext={ext}
                            active={activeInstalledId === ext.id}
                            onClick={() => setActiveInstalledId(ext.id === activeInstalledId ? null : ext.id)}
                        />
                    ))}
                    {!loading && filteredInstalled.length === 0 && (
                        <div className="px-4 py-8 text-center">
                            <p className="text-[11px] text-ide-text-secondary/50 italic">No extensions found</p>
                        </div>
                    )}
                </div>

                {/* Import footer */}
                <div className="px-3 py-2.5 border-t border-ide-border/60 shrink-0">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors py-1.5 px-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20"
                    >
                        <Download className="w-3 h-3" />
                        Import VS Code Extensions
                    </button>
                </div>
            </div>

            {/* ── RIGHT: Marketplace ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-ide-bg">
                {/* Title bar */}
                <div className="px-8 pt-8 pb-4 shrink-0">
                    <h1 className="text-2xl font-bold text-ide-text-primary tracking-tight mb-1">Marketplace</h1>
                    <p className="text-[12px] text-ide-text-secondary/70 max-w-xl">
                        Enhance your development workflow with thousands of extensions for snippets, themes, debuggers, and more. Optimized for Stitch IDE performance.
                    </p>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 space-y-8">
                    {/* Featured Banner */}
                    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/50 via-[#1a1630]/80 to-indigo-950/40 p-6 flex items-center gap-8 shadow-xl shadow-violet-900/20">
                        <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 border", FEATURED.iconBg)}>
                            {FEATURED.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/15 border border-violet-500/30 rounded-full px-2.5 py-1">
                                    Editor's Choice
                                </span>
                                <h2 className="text-xl font-bold text-ide-text-primary">{FEATURED.name}</h2>
                            </div>
                            <p className="text-[12px] text-ide-text-secondary/80 leading-relaxed mb-4 max-w-lg">
                                {FEATURED.description}
                            </p>
                            <div className="flex items-center gap-5 text-[12px] text-ide-text-secondary/70">
                                <span className="flex items-center gap-1.5">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    <span className="text-ide-text-primary font-semibold">{FEATURED.rating}</span>
                                    ({FEATURED.reviews})
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Download className="w-3.5 h-3.5" />
                                    {FEATURED.installs}
                                </span>
                            </div>
                        </div>
                        <button className="px-5 py-2.5 rounded-lg text-[12px] font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-900/40 shrink-0">
                            Install
                        </button>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        {MARKETPLACE_GRID.map(item => (
                            <MarketplaceCard key={item.id} item={item} />
                        ))}
                    </div>

                    {/* More section prompt */}
                    <div className="text-center py-4">
                        <button className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                            Browse all extensions →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
