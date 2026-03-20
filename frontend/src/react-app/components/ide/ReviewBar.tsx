import { ChevronDown, FileCode, RotateCcw, HelpCircle } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/react-app/components/ui/dropdown-menu';

interface ReviewFile {
    path: string;
    additions: number;
    deletions: number;
}

interface ReviewBarProps {
    isOpen: boolean;
    files: ReviewFile[];
    onAcceptAll: () => void;
    onRejectAll: () => void;
    onModify?: () => void;
    onExplain?: () => void;
    onFileClick?: (path: string) => void;
}

export default function ReviewBar({
    isOpen,
    files,
    onAcceptAll,
    onRejectAll,
    onModify,
    onExplain,
    onFileClick
}: ReviewBarProps) {
    if (!isOpen || files.length === 0) return null;

    return (
        <div className="fixed bottom-12 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
            <div className="bg-ide-sidebar border border-ide-border rounded-xl shadow-2xl flex flex-col min-w-[320px] max-w-sm overflow-hidden divide-y divide-ide-border/50">
                {/* File List */}
                <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
                    {files.map((file, idx) => (
                        <div
                            key={idx}
                            onClick={() => onFileClick?.(file.path)}
                            className="flex items-center justify-between p-2 hover:bg-ide-hover rounded-lg cursor-pointer transition-colors group"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                                <span className="text-xs text-ide-text-primary truncate">
                                    {file.path.split(/[/\\]/).pop() || file.path}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[10px] font-medium text-green-400">+{file.additions}</span>
                                <span className="text-[10px] font-medium text-red-400">-{file.deletions}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="p-2 flex items-center justify-between bg-ide-bg/80 backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ide-text-secondary font-medium px-1">
                            {files.length} {files.length === 1 ? 'file' : 'files'} changed
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRejectAll}
                            className="h-7 px-2 text-xs text-ide-text-secondary hover:text-red-400 hover:bg-red-400/10"
                        >
                            Reject all
                        </Button>
                        <Button
                            size="sm"
                            onClick={onAcceptAll}
                            className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-500/10"
                        >
                            Accept all
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-ide-text-secondary hover:text-white">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-ide-sidebar border-ide-border shadow-xl">
                                {onModify && (
                                    <DropdownMenuItem onClick={onModify} className="text-xs text-ide-text-primary hover:bg-ide-hover cursor-pointer gap-2">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Modify again
                                    </DropdownMenuItem>
                                )}
                                {onExplain && (
                                    <DropdownMenuItem onClick={onExplain} className="text-xs text-ide-text-primary hover:bg-ide-hover cursor-pointer gap-2">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        Explain changes
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}
