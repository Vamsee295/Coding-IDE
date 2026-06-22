import { Button } from "@/react-app/components/ui/button";
import { AlertTriangle, CheckCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/react-app/lib/utils";

interface DebuggerCardProps {
    analysis: any;
    onApply: (analysis: any) => void;
    onDismiss: () => void;
    isApplying?: boolean;
}

export function DebuggerCard({ analysis, onApply, onDismiss, isApplying }: DebuggerCardProps) {
    if (!analysis) return null;

    return (
        <div className="bg-[#121212] border border-orange-500/30 rounded-xl p-4 m-4 shadow-[0_0_40px_rgba(249,115,22,0.1)] pointer-events-auto max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <h3 className="font-bold text-ide-text-primary text-xs uppercase tracking-wider">AI Debugger Analysis</h3>
                </div>
                <Button size="icon-xs" variant="ghost" onClick={onDismiss} className="text-ide-text-secondary hover:text-white hover:bg-white/5">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-3.5 text-[11px] text-ide-text-primary/90 leading-relaxed mb-4">
                <div>
                    <span className="font-semibold text-ide-text-secondary uppercase tracking-widest text-[9px] mr-2">Summary</span>
                    <span className="text-red-300">{analysis.summary}</span>
                </div>
                <div>
                    <span className="font-semibold text-ide-text-secondary uppercase tracking-widest text-[9px] block mb-1">Root Cause</span>
                    <div className="bg-white/5 p-2 rounded-md border border-white/5">
                        {analysis.rootCause}
                    </div>
                </div>
                <div>
                    <span className="font-semibold text-ide-text-secondary uppercase tracking-widest text-[9px] block mb-1">Suggested Fix</span>
                    <div className="bg-indigo-500/10 text-indigo-200 p-2 rounded-md border border-indigo-500/20">
                        {analysis.suggestedFix}
                    </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <span className="font-semibold text-ide-text-secondary uppercase tracking-widest text-[9px]">Confidence</span>
                    <div className="w-full bg-black/40 rounded-full h-1.5 flex-1 max-w-[120px] overflow-hidden border border-white/5">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                analysis.confidence > 80 ? "bg-green-500" : analysis.confidence > 50 ? "bg-amber-400" : "bg-red-400"
                            )}
                            style={{ width: `${analysis.confidence || 0}%` }}
                        />
                    </div>
                    <span className={cn(
                        "font-mono font-bold",
                        analysis.confidence > 80 ? "text-green-400" : analysis.confidence > 50 ? "text-amber-400" : "text-red-400"
                    )}>{analysis.confidence}%</span>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button size="xs" variant="ghost" onClick={onDismiss} className="text-ide-text-secondary hover:text-white px-4">
                    Dismiss
                </Button>
                <Button
                    size="xs"
                    onClick={() => onApply(analysis)}
                    disabled={isApplying || !analysis.patch}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium px-4 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                    {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {analysis.patch ? "Preview Fix" : "No Patch Available"}
                </Button>
            </div>
        </div>
    );
}
