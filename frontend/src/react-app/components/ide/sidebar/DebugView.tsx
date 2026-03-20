import { useState } from "react";
import {
    Play, Settings, ChevronDown, ChevronRight,
    Circle, StopCircle, SkipForward, StepForward, StepBack,
    RotateCcw, Plus, X, FileCode
} from "lucide-react";
import { cn } from "@/react-app/lib/utils";

interface DebugViewProps {
    rootPath?: string;
}

interface Breakpoint {
    id: string;
    file: string;
    line: number;
    enabled: boolean;
}

export default function DebugView({ rootPath: _rootPath }: DebugViewProps) {
    const [isDebugging, setIsDebugging] = useState(false);
    const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([
        { id: "1", file: "index.ts", line: 15, enabled: true },
        { id: "2", file: "App.tsx", line: 42, enabled: true },
        { id: "3", file: "server.js", line: 88, enabled: false },
    ]);
    const [breakpointsExpanded, setBreakpointsExpanded] = useState(true);
    const [variablesExpanded, setVariablesExpanded] = useState(true);
    const [callStackExpanded, setCallStackExpanded] = useState(true);
    const [watchExpanded, setWatchExpanded] = useState(true);

    const toggleBreakpoint = (id: string) => {
        setBreakpoints(prev => prev.map(bp => bp.id === id ? { ...bp, enabled: !bp.enabled } : bp));
    };

    const removeBreakpoint = (id: string) => {
        setBreakpoints(prev => prev.filter(bp => bp.id !== id));
    };

    return (
        <div className="flex flex-col h-full bg-ide-sidebar">
            {/* Header */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary select-none">
                    Run and Debug
                </span>
            </div>

            {!isDebugging ? (
                /* Launch Config */
                <div className="px-3 py-3 border-b border-ide-border">
                    <div className="flex items-center gap-2 mb-3">
                        <select className="flex-1 bg-ide-input border border-ide-border rounded px-2 py-1 text-xs text-ide-text-primary focus:outline-none focus:border-indigo-500">
                            <option>Launch Program</option>
                            <option>Attach to Process</option>
                            <option>Node.js Debug</option>
                        </select>
                        <button
                            onClick={() => setIsDebugging(true)}
                            className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                            title="Start Debugging (F5)"
                        >
                            <Play className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover rounded transition-colors" title="Configure">
                            <Settings className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ) : (
                /* Debug Toolbar */
                <div className="px-3 py-2 border-b border-ide-border bg-ide-sidebar">
                    <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 text-ide-text-secondary hover:text-blue-400 hover:bg-ide-hover rounded transition-colors" title="Continue (F5)">
                            <Play className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover rounded transition-colors" title="Step Over (F10)">
                            <SkipForward className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover rounded transition-colors" title="Step Into (F11)">
                            <StepForward className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover rounded transition-colors" title="Step Out (⇧F11)">
                            <StepBack className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 text-ide-text-secondary hover:text-green-400 hover:bg-ide-hover rounded transition-colors" title="Restart (⇧⌘F5)">
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setIsDebugging(false)} className="p-1.5 text-ide-text-secondary hover:text-red-400 hover:bg-ide-hover rounded transition-colors" title="Stop (⇧F5)">
                            <StopCircle className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Variables Section */}
                <div>
                    <button onClick={() => setVariablesExpanded(!variablesExpanded)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover transition-colors">
                        {variablesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ide-text-secondary" />}
                        <span className="text-[10px] font-bold uppercase text-ide-text-secondary">Variables</span>
                    </button>
                    {variablesExpanded && (
                        <div className="px-4 py-2 space-y-1">
                            {!isDebugging ? (
                                <p className="text-[10px] text-ide-text-secondary/60 italic pl-2">Not running</p>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 pl-4 text-xs">
                                        <span className="text-blue-300">count</span>
                                        <span className="text-ide-text-secondary">=</span>
                                        <span className="text-orange-300">42</span>
                                    </div>
                                    <div className="flex items-center gap-2 pl-4 text-xs">
                                        <span className="text-blue-300">name</span>
                                        <span className="text-ide-text-secondary">=</span>
                                        <span className="text-green-300">"OLLAMA AI"</span>
                                    </div>
                                    <div className="flex items-center gap-2 pl-4 text-xs">
                                        <span className="text-blue-300">isActive</span>
                                        <span className="text-ide-text-secondary">=</span>
                                        <span className="text-yellow-300">true</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Watch Section */}
                <div>
                    <button onClick={() => setWatchExpanded(!watchExpanded)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover transition-colors">
                        {watchExpanded ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ide-text-secondary" />}
                        <span className="text-[10px] font-bold uppercase text-ide-text-secondary">Watch</span>
                        <button className="ml-auto p-0.5 text-ide-text-secondary hover:text-ide-text-primary transition-colors" title="Add Expression">
                            <Plus className="w-3 h-3" />
                        </button>
                    </button>
                    {watchExpanded && (
                        <div className="px-6 py-2">
                            <p className="text-[10px] text-ide-text-secondary/60 italic">Add expressions to watch</p>
                        </div>
                    )}
                </div>

                {/* Call Stack */}
                <div>
                    <button onClick={() => setCallStackExpanded(!callStackExpanded)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover transition-colors">
                        {callStackExpanded ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ide-text-secondary" />}
                        <span className="text-[10px] font-bold uppercase text-ide-text-secondary">Call Stack</span>
                    </button>
                    {callStackExpanded && (
                        <div className="px-4 py-2">
                            {!isDebugging ? (
                                <p className="text-[10px] text-ide-text-secondary/60 italic pl-2">Not running</p>
                            ) : (
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border-l-2 border-indigo-500 rounded-r text-xs">
                                        <span className="text-indigo-300 font-mono">handleClick</span>
                                        <span className="text-ide-text-secondary text-[10px] ml-auto">App.tsx:42</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-ide-text-secondary hover:bg-ide-hover rounded cursor-pointer">
                                        <span className="font-mono">render</span>
                                        <span className="text-[10px] ml-auto">App.tsx:15</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-ide-text-secondary hover:bg-ide-hover rounded cursor-pointer">
                                        <span className="font-mono">module.exports</span>
                                        <span className="text-[10px] ml-auto">index.ts:1</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Breakpoints */}
                <div>
                    <button onClick={() => setBreakpointsExpanded(!breakpointsExpanded)} className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-ide-hover transition-colors">
                        {breakpointsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ide-text-secondary" />}
                        <span className="text-[10px] font-bold uppercase text-ide-text-secondary">Breakpoints</span>
                        <span className="text-[10px] text-ide-text-secondary ml-auto bg-ide-border/50 px-1.5 py-0.5 rounded-full">{breakpoints.length}</span>
                    </button>
                    {breakpointsExpanded && (
                        <div className="space-y-px">
                            {breakpoints.map(bp => (
                                <div key={bp.id} className="group flex items-center gap-2 px-4 py-1 hover:bg-ide-hover transition-colors cursor-pointer">
                                    <button onClick={() => toggleBreakpoint(bp.id)} className="shrink-0">
                                        <Circle className={cn("w-3 h-3", bp.enabled ? "fill-red-500 text-red-500" : "text-ide-text-secondary/40")} />
                                    </button>
                                    <FileCode className="w-3 h-3 text-blue-400 shrink-0" />
                                    <span className="text-xs text-ide-text-primary truncate">{bp.file}</span>
                                    <span className="text-[10px] text-ide-text-secondary font-mono">:{bp.line}</span>
                                    <button onClick={() => removeBreakpoint(bp.id)} className="p-0.5 opacity-0 group-hover:opacity-100 text-ide-text-secondary hover:text-red-400 transition-all ml-auto shrink-0" title="Remove">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
