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
        <div className="h-7 bg-black/40 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-3 text-[10px] text-ide-text-secondary/80 font-medium select-none shrink-0 z-20">
            {/* Left section */}
            <div className="flex items-center gap-4">
                {/* Git branch */}
                <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
                    <GitBranch className="w-3 h-3" />
                    <span>{gitBranch}</span>
                </div>

                {/* Errors / Warnings */}
                {(errorCount > 0 || warningCount > 0) && (
                    <div className="flex items-center gap-2">
                        {errorCount > 0 && (
                            <div className="flex items-center gap-1 text-red-400">
                                <AlertCircle className="w-3 h-3" />
                                <span>{errorCount}</span>
                            </div>
                        )}
                        {warningCount > 0 && (
                            <div className="flex items-center gap-1 text-yellow-400">
                                <AlertCircle className="w-3 h-3" />
                                <span>{warningCount}</span>
                            </div>
                        )}
                    </div>
                )}
                {errorCount === 0 && warningCount === 0 && (
                    <div className="flex items-center gap-1 text-green-400/80">
                        <CheckCircle className="w-3 h-3" />
                        <span>{getTranslation(settings.language, 'statusbar.noProblems')}</span>
                    </div>
                )}

                {/* Extension Items (Left) */}
                {leftItems.map(item => (
                    <div 
                        key={item.id} 
                        className={`flex items-center gap-1 ${item.command ? 'cursor-pointer hover:text-white transition-colors' : ''} ${item.color || ''}`}
                        title={item.tooltip}
                        onClick={() => item.command && dispatchCommand(item.command as any)}
                    >
                        {item.icon}
                        <span>{item.text}</span>
                    </div>
                ))}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-4">
                {/* Extension Items (Right) */}
                {rightItems.map(item => (
                    <div 
                        key={item.id} 
                        className={`flex items-center gap-1 ${item.command ? 'cursor-pointer hover:text-white transition-colors' : ''} ${item.color || ''}`}
                        title={item.tooltip}
                        onClick={() => item.command && dispatchCommand(item.command as any)}
                    >
                        {item.icon}
                        <span>{item.text}</span>
                    </div>
                ))}

                {/* Cursor position */}
                <div className="flex items-center gap-1">
                    <span>{getTranslation(settings.language, 'statusbar.line')} {line}, {getTranslation(settings.language, 'statusbar.column')} {column}</span>
                </div>

                {/* Tab size */}
                <span>{getTranslation(settings.language, 'statusbar.spaces')}: 2</span>

                {/* Encoding */}
                <span>UTF-8</span>

                {/* Language */}
                <button className="hover:text-white transition-colors">
                    {langLabel[language] || language}
                </button>

                {/* Auto-save indicator */}
                {settings.autoSave && (
                    <span className="text-green-400/70 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {t('statusbar.autoSave')}
                    </span>
                )}

                {/* Dirty indicator */}
                {isDirty && !settings.autoSave && (
                    <span className="text-amber-400">●</span>
                )}

                {/* Connection status */}
                <div className={`flex items-center gap-1 ${isConnected ? 'text-green-400/70' : 'text-red-400'}`}>
                    {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span>{isConnected ? t('statusbar.connected') : t('statusbar.offline')}</span>
                </div>
            </div>
        </div>
    );
}
