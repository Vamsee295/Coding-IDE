import { GitBranch, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useSettings } from '@/react-app/contexts/SettingsContext';
import { getTranslation } from '@/react-app/lib/i18n';
import { useStatusBar } from '@/react-app/contexts/StatusBarContext';
import { useIdeCommand } from '@/react-app/contexts/IdeCommandContext';

interface StatusBarProps {
    language?: string;
    line?: number;
    column?: number;
    isDirty?: boolean;
    filePath?: string;
    gitBranch?: string;
    errorCount?: number;
    warningCount?: number;
    isConnected?: boolean;
}

export default function StatusBar({
    language = 'plaintext',
    line = 1,
    column = 1,
    isDirty = false,
    gitBranch = 'main',
    errorCount = 0,
    warningCount = 0,
    isConnected = true,
}: StatusBarProps) {
    const { settings } = useSettings();
    const t = (key: string) => getTranslation(settings.language, key);
    const { items: extensionItems } = useStatusBar();
    const { dispatchCommand } = useIdeCommand();

    const leftItems = [...extensionItems].filter(i => i.alignment === 'left').sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const rightItems = [...extensionItems].filter(i => i.alignment === 'right').sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const langLabel: Record<string, string> = {
        typescript: 'TypeScript',
        javascript: 'JavaScript',
        python: 'Python',
        java: 'Java',
        cpp: 'C++',
        c: 'C',
        go: 'Go',
        rust: 'Rust',
        html: 'HTML',
        css: 'CSS',
        json: 'JSON',
        markdown: 'Markdown',
        shell: 'Shell',
        plaintext: 'Plain Text',
    };

    return (
        <div className="h-7 bg-ide-statusbar border-t border-white/10 flex items-center justify-between px-3 text-[10px] text-white/90 font-medium select-none shrink-0 z-50 shadow-[0_-4px_24px_-8px_hsl(217_85%_35%/0.6)]">
            {/* Left section */}
            <div className="flex items-center gap-5">
                {/* Git branch */}
                <div className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-all duration-200 group">
                    <GitBranch className="w-3 h-3 text-white/70 group-hover:text-white transition-colors" />
                    <span className="tracking-wide uppercase text-white/95">{gitBranch}*</span>
                </div>

                {/* Errors / Warnings */}
                {(errorCount > 0 || warningCount > 0) && (
                    <div className="flex items-center gap-3">
                        {errorCount > 0 && (
                            <div className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors cursor-pointer">
                                <AlertCircle className="w-3 h-3" />
                                <span>{errorCount}</span>
                            </div>
                        )}
                        {warningCount > 0 && (
                            <div className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer">
                                <AlertCircle className="w-3 h-3" />
                                <span>{warningCount}</span>
                            </div>
                        )}
                    </div>
                )}
                {errorCount === 0 && warningCount === 0 && (
                    <div className="flex items-center gap-1.5 text-white/75 hover:text-white transition-colors cursor-pointer">
                        <CheckCircle className="w-3 h-3" />
                        <span className="tracking-tight uppercase">{getTranslation(settings.language, 'statusbar.noProblems')}</span>
                    </div>
                )}

                {/* Extension Items (Left) */}
                {leftItems.map(item => (
                    <div
                        key={item.id}
                        className={`flex items-center gap-1.5 text-white/85 ${item.command ? 'cursor-pointer hover:text-white transition-all duration-200' : ''} ${item.color || ''}`}
                        title={item.tooltip}
                        onClick={() => item.command && dispatchCommand(item.command as any)}
                    >
                        {item.icon}
                        <span className="uppercase tracking-tight">{item.text}</span>
                    </div>
                ))}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-5">
                {/* Extension Items (Right) */}
                {rightItems.map(item => (
                    <div
                        key={item.id}
                        className={`flex items-center gap-1.5 text-white/85 ${item.command ? 'cursor-pointer hover:text-white transition-all duration-200' : ''} ${item.color || ''}`}
                        title={item.tooltip}
                        onClick={() => item.command && dispatchCommand(item.command as any)}
                    >
                        {item.icon}
                        <span className="uppercase tracking-tight">{item.text}</span>
                    </div>
                ))}

                {/* Cursor position */}
                <div className="flex items-center gap-1 text-white/80 hover:text-white transition-colors cursor-default">
                    <span className="opacity-60 font-semibold tracking-wide mr-0.5">Ln</span>
                    <span>{line}, Col {column}</span>
                </div>

                {/* Tab size */}
                <div className="flex items-center gap-1 text-white/80 hover:text-white transition-colors cursor-default">
                    <span className="opacity-60 font-semibold tracking-wide mr-0.5">Spaces:</span>
                    <span>2</span>
                </div>

                {/* Encoding */}
                <span className="opacity-90 hover:text-white transition-colors cursor-default">UTF-8</span>

                {/* Language */}
                <button className="text-white font-semibold hover:text-white/95 transition-all uppercase tracking-wider text-[9px]">
                    {langLabel[language] || language}
                </button>

                {/* Auto-save indicator */}
                {settings.autoSave && (
                    <span className="text-white/75 flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" />
                        {t('statusbar.autoSave')}
                    </span>
                )}

                {/* Dirty indicator */}
                {isDirty && !settings.autoSave && (
                    <span className="text-amber-200 animate-pulse">●</span>
                )}

                {/* Connection status */}
                <div className={`flex items-center gap-1.5 font-semibold uppercase tracking-wider ${isConnected ? 'text-white/80' : 'text-amber-200'}`}>
                    {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span>{isConnected ? t('statusbar.connected') : t('statusbar.offline')}</span>
                </div>
            </div>
        </div>
    );
}
