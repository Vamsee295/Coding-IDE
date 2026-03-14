import { FolderOpen, Book, ChevronRight, Clock, FileCode, Lightbulb, Command, FilePlus } from 'lucide-react';
import { useSettings } from "@/react-app/contexts/SettingsContext";
import { getTranslation } from "@/react-app/lib/i18n";

interface WelcomePageProps {
    recentWorkspaces: string[];
    onOpenFolder: () => void;
    onNewFile: () => void;
    onOpenFile: (path: string) => void;
    onOpenCommandPalette: () => void;
}

export default function WelcomePage({ recentWorkspaces, onOpenFolder, onNewFile, onOpenFile, onOpenCommandPalette }: WelcomePageProps) {
    const { settings } = useSettings();
    const t = (key: string) => getTranslation(settings.language, key);
    const quickActions = [
        {
            icon: <FolderOpen className="w-4 h-4" />,
            label: t("welcome.action.openFolder"),
            desc: t("welcome.action.openFolderDesc"),
            onClick: onOpenFolder
        },
        {
            icon: <FilePlus className="w-4 h-4" />,
            label: t("welcome.action.newFile"),
            desc: t("welcome.action.newFileDesc"),
            onClick: onNewFile
        },
        {
            icon: <Command className="w-4 h-4" />,
            label: t("welcome.action.commandPalette"),
            desc: t("welcome.action.commandPaletteDesc"),
            shortcut: "Ctrl+Shift+P",
            onClick: onOpenCommandPalette
        },
        {
            icon: <Book className="w-4 h-4" />,
            label: t("welcome.action.documentation"),
            desc: t("welcome.action.documentationDesc"),
            onClick: () => window.open("https://code.visualstudio.com/docs", "_blank")
        }
    ];

    return (
        <div className="h-full w-full overflow-y-auto bg-ide-editor flex items-start justify-center pt-16 px-8">
            <div className="w-full max-w-3xl space-y-10">
                {/* Hero */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
                        <FileCode className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                        {t('welcome.title')}
                    </h1>
                    <p className="text-lg text-ide-text-secondary max-w-md">
                        {t('welcome.subtitle')}
                    </p>
                </div>

                {/* Quick Start */}
                <div>
                    <h2 className="text-xs font-semibold text-ide-text-secondary uppercase tracking-widest mb-3">
                        {t('welcome.quickStart')}
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((a, i) => (
                            <button
                                key={i}
                                onClick={a.onClick}
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
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-ide-text-secondary px-1">
                            <Clock className="w-4 h-4" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider">
                                {t('welcome.recentWorkspaces')}
                            </h2>
                        </div>
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
                <div className="mt-12 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-indigo-300 mb-1">
                            {t('welcome.proTip')}
                        </h3>
                        <p className="text-xs text-ide-text-secondary leading-relaxed">
                            {t('welcome.proTipDesc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
