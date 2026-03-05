import { Play, Square, RefreshCw, ArrowRight, ArrowDown, ArrowUp, Pause } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { cn } from '@/react-app/lib/utils';

interface DebugToolbarProps {
    isActive: boolean;
    isPaused: boolean;
    onContinue: () => void;
    onStepOver: () => void;
    onStepInto: () => void;
    onStepOut: () => void;
    onPause: () => void;
    onStop: () => void;
    onRestart: () => void;
}

export default function DebugToolbar({
    isActive,
    isPaused,
    onContinue,
    onStepOver,
    onStepInto,
    onStepOut,
    onPause,
    onStop,
    onRestart
}: DebugToolbarProps) {
    if (!isActive) return null;

    const btn = (title: string, icon: React.ReactNode, onClick: () => void, disabled = false, danger = false) => (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "h-7 w-7 transition-all",
                danger
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    : "text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover",
                disabled && "opacity-30 cursor-not-allowed"
            )}
        >
            {icon}
        </Button>
    );

    return (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-ide-sidebar/95 border border-ide-border rounded-lg px-2 py-1 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-0.5 mr-1">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs text-orange-400 font-medium ml-1">Debugging</span>
            </div>
            <div className="w-px h-5 bg-ide-border mx-1" />
            {isPaused
                ? btn("Continue (F5)", <Play className="w-3.5 h-3.5" />, onContinue)
                : btn("Pause", <Pause className="w-3.5 h-3.5" />, onPause)
            }
            {btn("Step Over (F10)", <ArrowRight className="w-3.5 h-3.5" />, onStepOver, !isPaused)}
            {btn("Step Into (F11)", <ArrowDown className="w-3.5 h-3.5" />, onStepInto, !isPaused)}
            {btn("Step Out (Shift+F11)", <ArrowUp className="w-3.5 h-3.5" />, onStepOut, !isPaused)}
            <div className="w-px h-5 bg-ide-border mx-1" />
            {btn("Restart", <RefreshCw className="w-3.5 h-3.5" />, onRestart)}
            {btn("Stop (Shift+F5)", <Square className="w-3.5 h-3.5" />, onStop, false, true)}
        </div>
    );
}
