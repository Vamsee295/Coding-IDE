import React, { useState, useEffect, useCallback } from "react";
import { Extension } from "@/types/extension";
import { extensionService } from "@/services/extensionService";
import ImportVSCodeModal from "@/react-app/components/settings/ImportVSCodeModal";
import ExtensionDetailsView from "@/react-app/components/settings/ExtensionDetailsView";
import {
    Code2,
    Sparkles,
    Play,
    GitBranch,
    ScanLine,
    Loader2,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Download,
} from "lucide-react";

// ─── Extension icon + colour per category ─────────────────────────────────

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; badge: string }> = {
    formatting: {
        icon: <Code2 className="w-5 h-5" />,
        color: "text-blue-400",
        badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
    ai: {
        icon: <Sparkles className="w-5 h-5" />,
        color: "text-violet-400",
        badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    },
    tools: {
        icon: <Play className="w-5 h-5" />,
        color: "text-green-400",
        badge: "bg-green-500/15 text-green-400 border-green-500/30",
    },
    vcs: {
        icon: <GitBranch className="w-5 h-5" />,
        color: "text-orange-400",
        badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    },
    default: {
        icon: <ScanLine className="w-5 h-5" />,
        color: "text-gray-400",
        badge: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    },
};

function getCategoryMeta(category: string) {
    return CATEGORY_META[category] ?? CATEGORY_META.default;
}

// ─── Toggle Switch ──────────────────────────────────────────────────────────

function ToggleSwitch({
    checked,
    onChange,
    loading,
}: {
    checked: boolean;
    onChange: () => void;
    loading: boolean;
}) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            disabled={loading}
            className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none
        ${checked ? "bg-indigo-600" : "bg-gray-600"}
        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}
      `}
        >
            <span
                className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-300
          ${checked ? "translate-x-4" : "translate-x-1"}
        `}
            />
        </button>
    );
}

// ─── Extension Card ─────────────────────────────────────────────────────────

function ExtensionCard({
    extension,
    onToggle,
    onClick,
}: {
    extension: Extension;
    onToggle: (id: string, enable: boolean) => Promise<void>;
    onClick: (id: string) => void;
}) {
    const [toggling, setToggling] = useState(false);
    const meta = getCategoryMeta(extension.category);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setToggling(true);
        onToggle(extension.id, !extension.enabled).finally(() => setToggling(false));
    };

    return (
        <div
            onClick={() => onClick(extension.id)}
            className={`
        group flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 cursor-pointer
        ${extension.enabled
                    ? "bg-ide-sidebar/80 border-indigo-500/30 shadow-sm shadow-indigo-500/5 hover:border-indigo-500/50"
                    : "bg-ide-sidebar/40 border-ide-border hover:border-ide-border/80"
                }
        hover:bg-ide-sidebar/90 hover:translate-x-1 active:scale-[0.99]
      `}
        >
            {/* icon */}
            <div
                className={`
          w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200
          ${extension.enabled ? "bg-ide-bg" : "bg-ide-bg/50"}
          ${meta.color}
        `}
            >
                {extension.icon ? (
                    <img src={extension.icon} className="w-6 h-6 object-contain" alt="" />
                ) : meta.icon}
            </div>

            {/* content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-ide-text-primary">
                        {extension.name}
                    </span>

                    {/* category badge */}
                    <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide ${meta.badge}`}
                    >
                        {extension.category}
                    </span>

                    {/* version badge */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-ide-border/50 text-ide-text-secondary font-mono">
                        v{extension.version}
                    </span>

                    {/* status indicator */}
                    {extension.enabled ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-400 ml-auto">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
                            <XCircle className="w-3 h-3" />
                            Disabled
                        </span>
                    )}
                </div>

                <p className="text-xs text-ide-text-secondary leading-relaxed">
                    {extension.description}
                </p>
            </div>

            {/* toggle */}
            <div className="shrink-0 flex items-center">
                {toggling ? (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                ) : (
                    <ToggleSwitch
                        checked={extension.enabled}
                        onChange={() => handleToggle({ stopPropagation: () => { } } as any)}
                        loading={toggling}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

import { useExtensions } from "@/react-app/contexts/ExtensionContext";

export default function ExtensionsPanel() {
    const { extensions, loading, refreshExtensions } = useExtensions();
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null);

    // Initial load happens in ExtensionProvider, but we can refresh here if needed
    const handleRefresh = useCallback(async () => {
        try {
            await refreshExtensions();
        } catch {
            setError("Failed to load extensions. Make sure the backend is running on port 8081.");
        }
    }, [refreshExtensions]);

    // Auto-dismiss toast after 3s
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const handleToggle = async (id: string, enable: boolean) => {
        try {
            // Call backend — this triggers full lifecycle: activate/deactivate + EventBus
            enable
                ? await extensionService.enable(id)
                : await extensionService.disable(id);

            // Trigger global refresh so context-dependent components (Chat, Terminal) update
            await refreshExtensions();

            const ext = extensions.find((e) => e.id === id);
            setToast({
                message: `${ext?.name ?? id} ${enable ? "enabled ✔" : "disabled"}`,
                type: "success",
            });
        } catch {
            setToast({ message: "Failed to update extension — backend may be offline", type: "error" });
            refreshExtensions().catch(() => { });
        }
    };


    // Group by category
    const grouped = extensions.reduce<Record<string, Extension[]>>((acc, ext) => {
        const key = ext.category;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ext);
        return acc;
    }, {});

    const enabledCount = extensions.filter((e) => e.enabled).length;

    if (selectedExtensionId) {
        return (
            <ExtensionDetailsView
                extensionId={selectedExtensionId}
                onBack={() => {
                    setSelectedExtensionId(null);
                    refreshExtensions();
                }}
            />
        );
    }

    return (
        <div className="relative flex flex-col h-full overflow-hidden animate-in fade-in duration-300">

            {/* Toast notification */}
            {toast && (
                <div
                    className={`
            absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium
            transition-all duration-300 animate-in slide-in-from-top-2
            ${toast.type === "success"
                            ? "bg-green-900/90 border border-green-500/30 text-green-300"
                            : "bg-red-900/90 border border-red-500/30 text-red-300"
                        }
          `}
                >
                    {toast.type === "success"
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <XCircle className="w-4 h-4" />
                    }
                    {toast.message}
                </div>
            )}

            {/* Import VS Code Modal */}
            <ImportVSCodeModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImported={() => {
                    setToast({ message: "VS Code extensions imported successfully!", type: "success" });
                    refreshExtensions().catch(() => { });
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-ide-border shrink-0">
                <div>
                    <h2 className="text-base font-semibold text-ide-text-primary">Extensions</h2>
                    <p className="text-xs text-ide-text-secondary mt-0.5">
                        {loading ? "Loading..." : `${enabledCount} of ${extensions.length} active`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Import VS Code Extensions
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-ide-text-secondary hover:text-ide-text-primary transition-colors px-2 py-1.5 rounded hover:bg-ide-hover"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="h-[72px] bg-ide-sidebar/60 rounded-lg border border-ide-border animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <XCircle className="w-10 h-10 text-red-400/60" />
                        <div>
                            <p className="text-sm font-medium text-red-400">Connection Error</p>
                            <p className="text-xs text-ide-text-secondary mt-1 max-w-xs">{error}</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="mt-2 text-xs px-3 py-1.5 bg-ide-sidebar border border-ide-border rounded hover:bg-ide-hover transition-colors text-ide-text-primary"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Extension groups */}
                {!loading && !error && Object.entries(grouped).map(([category, exts]) => (
                    <div key={category}>
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ide-text-secondary mb-3 flex items-center gap-2">
                            <span className={getCategoryMeta(category).color}>
                                {getCategoryMeta(category).icon}
                            </span>
                            {category}
                        </h3>
                        <div className="space-y-2">
                            {exts.map((ext) => (
                                <ExtensionCard
                                    key={ext.id}
                                    extension={ext}
                                    onToggle={handleToggle}
                                    onClick={(id) => setSelectedExtensionId(id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Empty state */}
                {!loading && !error && extensions.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <Code2 className="w-10 h-10 text-ide-text-secondary/40" />
                        <p className="text-sm text-ide-text-secondary">No extensions registered.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
