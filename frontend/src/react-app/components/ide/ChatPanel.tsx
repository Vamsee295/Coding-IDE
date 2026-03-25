import { useState, useRef, useEffect } from "react";
import {
    Bot,
    Plus,
    Clock,
    Sparkles,
    Wrench,
    Zap,
    User,
    FileCode,
    Send,
    RotateCcw,
    X,
    Image,
    Monitor,
    Square,
    CheckCircle,
    Cpu,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { ChatMessage, AIAction, FileItem } from "@/react-app/types/ide";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useExtensions } from "@/react-app/contexts/ExtensionContext";
import FileMentions from "@/react-app/components/ide/FileMentions";
import { useIdeStore } from "@/react-app/store/useIdeStore";
import type { AgentEvent } from "@/services/agentService";
import { agentService } from "@/services/agentService";

interface AgentFeedItem {
    id: string;
    label: string;
    status: 'running' | 'done' | 'error';
    result?: string;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (message: string, taggedFiles?: FileItem[], attachedImages?: string[]) => void;
    onActionClick: (action: "explain" | "fix" | "optimize") => void;
    onApplyAction: (action: AIAction, messageId: string) => void;
    isLoading: boolean;
    selectedModel: string;
    files: FileItem[];
    width: number;
    isResizing: boolean;
    onNewChat: () => void;
    onViewHistory: () => void;
    onRevert: (messageId: string) => void;
    onAnalyzeScreen: () => void;
    onStopGeneration: () => void;
    agentEvents?: AgentEvent[];
}

export default function ChatPanel({
    messages,
    onSendMessage,
    onActionClick,
    onApplyAction,
    isLoading,
    selectedModel,
    files,
    width,
    isResizing,
    onNewChat,
    onViewHistory,
    onRevert,
    onAnalyzeScreen,
    onStopGeneration,
    agentEvents = [],
}: ChatPanelProps) {
    const { isExtensionEnabled } = useExtensions();
    const aiEnabled = isExtensionEnabled("ai-enhancer");
    const { agentMode, setAgentMode } = useIdeStore();

    const [input, setInput] = useState("");
    const [mentionFilter, setMentionFilter] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [taggedFiles, setTaggedFiles] = useState<FileItem[]>([]);
    const [attachedImages, setAttachedImages] = useState<string[]>([]);
    const [feedCollapsed, setFeedCollapsed] = useState(false);

    // Build a live feed from agentEvents with enhanced metadata
    const agentFeed = agentEvents.reduce<AgentFeedItem[]>((acc, evt) => {
        if (evt.type === 'thought') {
            acc.push({ id: `thought-${acc.length}`, label: evt.message || "Thinking...", status: 'running' });

        } else if (evt.type === 'step') {
            // New format: step metadata — show as a thought-style entry
            const label = (evt as any).plan || (evt as any).step || "Planning...";
            acc.push({ id: `step-${acc.length}`, label, status: 'running' });

        } else if (evt.type === 'action') {
            // New format: tool about to execute
            const e = evt as any;
            const label = e.label || agentService.getToolLabel(e.tool, e.path, e.command, e.query);
            acc.push({ id: `tool-${acc.length}`, label, status: 'running' });

        } else if (evt.type === 'result') {
            // New format: tool result
            const e = evt as any;
            const lastRunning = [...acc].reverse().find(item => item.status === 'running' && item.id.startsWith('tool-'));
            if (lastRunning) {
                lastRunning.status = e.success ? 'done' : 'error';
                lastRunning.result = e.result?.substring(0, 120) + (e.result?.length > 120 ? "..." : "");
            }

        } else if (evt.type === 'tool_call') {
            // Legacy format
            const action = (evt as any).action;
            const labels: Record<string, string> = {
                read_file:    `Reading ${action.path}`,
                readFile:     `Reading ${action.path}`,
                write_file:   `Writing ${action.path}`,
                writeFile:    `Writing ${action.path}`,
                create_file:  `Creating ${action.path}`,
                createFile:   `Creating ${action.path}`,
                delete_file:  `Deleting ${action.path}`,
                deleteFile:   `Deleting ${action.path}`,
                run_command:  `Running: ${action.command}`,
                runCommand:   `Running: ${action.command}`,
                search:       `Searching: ${action.query}`,
                listFiles:    `Listing: ${action.path || 'workspace'}`,
            };
            acc.push({ 
                id: `tool-${acc.length}`, 
                label: labels[action.type] || action.type, 
                status: 'running' 
            });

        } else if (evt.type === 'tool_result') {
            // Legacy format
            const e = evt as any;
            const lastRunning = [...acc].reverse().find(item => item.status === 'running' && item.id.startsWith('tool-'));
            if (lastRunning) {
                lastRunning.status = e.success ? 'done' : 'error';
                lastRunning.result = e.success ? (e.result?.substring(0, 100) + (e.result?.length > 100 ? "..." : "")) : e.result;
            }
        }
        return acc;
    }, []);
    const isAgentRunning = agentEvents.length > 0 && !agentEvents.some(e => e.type === 'done' || e.type === 'error');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottom = useRef(true);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
    };

    useEffect(() => {
        if (isAtBottom.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim(), taggedFiles, attachedImages);
            setInput("");
            setTaggedFiles([]);
            setAttachedImages([]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setInput(value);

        const textBeforeCursor = value.substring(0, cursorPosition);
        const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

        if (lastAtSymbol !== -1 && (lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === " ")) {
            const filter = textBeforeCursor.substring(lastAtSymbol + 1).toLowerCase();
            setMentionFilter(filter);
            setShowMentions(true);

            const rect = e.target.getBoundingClientRect();
            setMentionPosition({
                top: rect.top,
                left: rect.left + (cursorPosition * 6) % rect.width
            });
        } else {
            setShowMentions(false);
        }
    };

    const handleMentionSelect = (item: FileItem) => {
        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = input.substring(0, cursorPosition);
        const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
        const textAfterCursor = input.substring(cursorPosition);

        const newInput = input.substring(0, lastAtSymbol) + `@${item.name} ` + textAfterCursor;
        setInput(newInput);
        setShowMentions(false);
        setTaggedFiles(prev => [...prev, item]);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showMentions) {
            if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) {
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = Array.from(e.clipboardData.items);
        let handled = false;

        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                if (!file) continue;
                handled = true;
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result && typeof event.target.result === 'string') {
                        setAttachedImages(prev => [...prev, event.target!.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            }
        }

        if (handled) {
            e.preventDefault();
        }
    };

    const removeImage = (index: number) => {
        setAttachedImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeFile = (id: string) => {
        setTaggedFiles(prev => prev.filter(f => f.id !== id));
    };

    const triggerFileUpload = () => {
        alert("Visual analysis engine active. Paste an image or drag/drop for processing.");
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <aside
            style={{ width }}
            className={cn(
                "bg-ide-panel border-l border-ide-border flex flex-col shrink-0 relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.3)]",
                !isResizing && "transition-all duration-200"
            )}
        >
            {showMentions && (
                <FileMentions
                    files={files}
                    filter={mentionFilter}
                    onSelect={handleMentionSelect}
                    onClose={() => setShowMentions(false)}
                    position={mentionPosition}
                />
            )}

            {/* Header */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border/50 bg-ide-panel/80 backdrop-blur-md">
                <div className="flex items-center gap-2 group">
                    <div className="w-5 h-5 flex items-center justify-center transition-transform duration-200">
                        <Bot className="w-4 h-4 text-ide-accent" />
                    </div>
                    <div className="flex bg-black/40 rounded-full p-0.5 border border-ide-border/50 shadow-inner">
                        <button
                            onClick={() => setAgentMode(false)}
                            className={cn(
                                "text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full transition-all duration-300",
                                !agentMode 
                                    ? "bg-ide-accent text-[#090b10] shadow-[0_0_10px_rgba(var(--color-ide-accent-rgb),0.5)]" 
                                    : "text-ide-text-secondary hover:text-white"
                            )}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setAgentMode(true)}
                            className={cn(
                                "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full transition-all duration-300",
                                agentMode 
                                    ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse shadow-sm"
                                    : "text-ide-text-secondary hover:text-white"
                            )}
                        >
                            <Cpu className="w-3 h-3" />
                            Agent
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={onNewChat}
                        className="text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all"
                        title="New Chat"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={onViewHistory}
                        className="text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all"
                        title="Chat History"
                    >
                        <Clock className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Quick Actions */}
            {aiEnabled && (
                <div className="px-3 py-1.5 border-b border-ide-border flex gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onActionClick("explain")}
                        className="h-6 px-2 text-[10px] gap-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover transition-colors rounded-md"
                    >
                        <Sparkles className="w-3 h-3" />
                        Explain
                    </Button>
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onActionClick("fix")}
                        className="h-6 px-2 text-[10px] gap-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover transition-colors rounded-md"
                    >
                        <Wrench className="w-3 h-3" />
                        Fix
                    </Button>
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onActionClick("optimize")}
                        className="h-6 px-2 text-[10px] gap-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover transition-colors rounded-md"
                    >
                        <Zap className="w-3 h-3" />
                        Optimize
                    </Button>
                </div>
            )}

            {/* Live Action Feed — shown during autonomous agent runs */}
            {(agentFeed.length > 0 || isAgentRunning) && (
                <div className="border-b border-ide-border/50 bg-[#0d1117]/80 backdrop-blur-sm shadow-inner group/feed">
                    <button
                        onClick={() => setFeedCollapsed(p => !p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-all text-xs"
                    >
                        <div className="flex items-center gap-2.5 text-ide-text-secondary group-hover/feed:text-ide-text-primary">
                            <div className="relative">
                                <Cpu className={cn("w-3.5 h-3.5", isAgentRunning && "text-ide-accent")} />
                                {isAgentRunning && <span className="absolute -top-1 -right-1 w-2 h-2 bg-ide-accent rounded-full animate-ping opacity-75" />}
                            </div>
                            <span className="font-semibold uppercase tracking-wider text-[10px]">
                                {isAgentRunning ? 'Agent Active' : 'Agent Log'}
                            </span>
                            <span className="text-ide-text-secondary/40 text-[9px] font-mono">[{agentFeed.length} actions]</span>
                        </div>
                        {feedCollapsed
                            ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-secondary/50 group-hover/feed:text-ide-text-secondary" />
                            : <ChevronUp className="w-3.5 h-3.5 text-ide-text-secondary/50 group-hover/feed:text-ide-text-secondary" />}
                    </button>
                    {!feedCollapsed && (
                        <div className="px-4 pb-3 space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
                            {agentFeed.map((item, idx) => (
                                <div key={item.id} className="relative pl-5 group/item">
                                    {/* Link line */}
                                    {idx < agentFeed.length - 1 && (
                                        <div className="absolute left-[7px] top-[14px] w-[1px] h-full bg-ide-border group-hover/item:bg-ide-border/80 transition-colors" />
                                    )}
                                    
                                    <div className="flex items-start gap-2.5 mb-1">
                                        <div className="mt-1 relative flex shrink-0">
                                            <span className={cn(
                                                "w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-300",
                                                item.status === 'running' && 'bg-ide-accent/20 border-ide-accent/50 scale-110 shadow-[0_0_8px_rgba(var(--color-ide-accent-rgb),0.3)]',
                                                item.status === 'done' && 'bg-emerald-500/20 border-emerald-500/50',
                                                item.status === 'error' && 'bg-rose-500/20 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                            )}>
                                                {item.status === 'running' && <div className="w-1.5 h-1.5 bg-ide-accent rounded-full animate-pulse" />}
                                                {item.status === 'done' && <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />}
                                                {item.status === 'error' && <X className="w-2.5 h-2.5 text-rose-400" />}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 py-0.5">
                                            <div className="flex items-center justify-between">
                                                <span className={cn(
                                                    "text-[11px] font-medium leading-relaxed truncate block",
                                                    item.status === 'running' ? 'text-ide-text-primary' : 'text-ide-text-secondary transition-colors group-hover/item:text-ide-text-primary',
                                                    item.status === 'error' && 'text-rose-400'
                                                )}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            {item.result && (
                                                <div className={cn(
                                                    "mt-1 p-2 rounded bg-black/30 border border-ide-border/40 text-[10px] font-mono leading-tight whitespace-pre-wrap break-all max-h-24 overflow-y-auto custom-scrollbar-mini",
                                                    item.status === 'error' ? 'text-rose-300/80 border-rose-500/20' : 'text-ide-text-secondary/60'
                                                )}>
                                                    {item.result}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isAgentRunning && agentFeed.every(f => f.status !== 'running') && (
                                <div className="relative pl-5 flex items-center gap-2.5 py-1 text-ide-text-secondary/40 animate-pulse">
                                    <div className="w-3.5 h-3.5 rounded-full border border-ide-border flex items-center justify-center">
                                         <div className="w-1.5 h-1.5 bg-ide-text-secondary/20 rounded-full" />
                                    </div>
                                    <span className="text-[10px] italic font-medium">Processing next step...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar text-ide-text-primary"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-12 h-12 rounded-full border border-ide-accent/30 flex items-center justify-center mb-4 text-ide-accent bg-ide-accent/10 premium-glow">
                            <Bot className="w-6 h-6" />
                        </div>
                        <h3 className="text-xs font-medium text-ide-text-primary mb-2">How can I help you?</h3>
                        <p className="text-[11px] leading-relaxed text-ide-text-secondary max-w-[200px]">
                            Type <span className="font-bold text-ide-text-primary">@</span> to reference files or paste images for visual analysis.
                        </p>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                            message.role === "user" ? "flex-row-reverse" : ""
                        )}
                    >
                        <div
                            className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-ide-border shadow-sm",
                                message.role === "user"
                                    ? "bg-ide-hover"
                                    : "bg-ide-accent/20 text-ide-accent premium-glow border-ide-accent/30"
                            )}
                        >
                            {message.role === "user" ? (
                                <User className="w-3.5 h-3.5 text-ide-text-primary" />
                            ) : (
                                <Bot className="w-3.5 h-3.5 text-current" />
                            )}
                        </div>
                        <div className={cn("flex-1 min-w-0 max-w-[90%]", message.role === "user" ? "text-right" : "")}>
                            <div
                                className={cn(
                                    "inline-block px-3.5 py-2.5 text-[13px] border border-ide-border shadow-sm",
                                    message.role === "user"
                                        ? "bg-ide-hover text-ide-text-primary rounded-2xl rounded-tr-sm"
                                        : "bg-ide-sidebar text-ide-text-primary rounded-2xl rounded-tl-sm transition-all"
                                )}
                            >
                                <div className={cn("markdown-body prose prose-invert max-w-none text-left", message.role === "user" ? "text-ide-text-primary" : "")}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code({ node, inline, className, children, ...props }: any) {
                                                const match = /language-(\w+)/.exec(className || "");
                                                return !inline && match ? (
                                                    <div className="rounded-md overflow-hidden my-3 border border-ide-border bg-ide-sidebar">
                                                        <div className="flex items-center justify-between px-3 py-1.5 bg-ide-bg text-[10px] font-medium tracking-wide text-ide-text-secondary border-b border-ide-border">
                                                            <span className="flex items-center gap-2">
                                                                <FileCode className="w-3 h-3" />
                                                                {match[1]}
                                                            </span>
                                                        </div>
                                                        <SyntaxHighlighter
                                                            {...props}
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            customStyle={{ margin: 0, padding: "12px", background: "transparent", fontSize: "12px" }}
                                                        >
                                                            {String(children).replace(/\n$/, "")}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                ) : (
                                                    <code {...props} className="bg-ide-hover px-1.5 py-0.5 rounded-sm text-ide-text-primary font-mono text-[12px]">
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>

                                {message.actions && message.actions.length > 0 && (
                                    <div className="mt-4 space-y-2 pt-3 border-t border-ide-border">
                                        <p className="text-[10px] font-medium text-ide-text-secondary mb-2">Proposed Actions</p>
                                        {message.actions.map((action, idx) => (
                                            <div key={idx} className="bg-ide-sidebar rounded-md p-2.5 border border-ide-border flex flex-col gap-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-ide-bg border border-ide-border">
                                                            {action.type === "run_command" ? <Send className="w-3 h-3 text-ide-text-primary" /> : <FileCode className="w-3 h-3 text-ide-text-primary" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[11px] text-ide-text-primary truncate font-medium">
                                                                {action.type === 'run_command' ? action.command : (action.path ? action.path.split(/[\\/]/).pop() : 'Unnamed Component')}
                                                            </div>
                                                            <div className="text-[10px] text-ide-text-secondary truncate mt-0.5">
                                                                {action.type === 'run_command' ? 'Terminal Command' : (action.path || 'No path specified')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {!message.applied ? (
                                                        <Button
                                                            variant="secondary"
                                                            size="xs"
                                                            className={cn(
                                                                "h-6 px-2.5 text-[10px] rounded-md transition-colors font-medium border",
                                                                ["write_file", "create_file", "replace_range", "insert_at_line"].includes(action.type)
                                                                    ? "bg-ide-accent/10 hover:bg-ide-accent/20 text-ide-accent border-ide-accent/20"
                                                                    : "bg-ide-hover hover:bg-ide-border text-ide-text-primary border-transparent"
                                                            )}
                                                            onClick={() => onApplyAction(action, message.id)}
                                                        >
                                                            {["write_file", "create_file", "replace_range", "insert_at_line"].includes(action.type) 
                                                                ? "Preview in Editor" 
                                                                : "Apply"}
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-ide-hover rounded-md border border-ide-border">
                                                            <CheckCircle className="w-3 h-3 text-ide-text-primary" />
                                                            <span className="text-[10px] text-ide-text-primary font-medium">Applied</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {message.applied && (
                                            <div className="flex justify-end pt-2">
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={() => onRevert(message.id)}
                                                    className="h-6 px-2 text-[10px] gap-1.5 text-ide-text-secondary hover:text-ide-text-primary"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    Revert
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-ide-text-secondary mt-1.5 px-1">
                                {formatTime(message.timestamp)}
                            </p>
                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-ide-bg relative">

                {taggedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3.5 px-1">
                        {taggedFiles.map(file => (
                            <div key={file.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-ide-hover border border-ide-border text-[10px] text-ide-text-primary font-medium tracking-wide">
                                <FileCode className="w-3 h-3 text-ide-text-secondary" />
                                <span className="truncate max-w-[120px]">{file.name}</span>
                                <button type="button" onClick={() => removeFile(file.id)} className="ml-0.5 text-ide-text-secondary hover:text-ide-text-primary transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {attachedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mb-4 px-1">
                        {attachedImages.map((src, idx) => (
                            <div key={idx} className="relative group">
                                <img src={src} alt="Attached" className="h-[72px] w-auto object-cover rounded-md border border-ide-border transition-opacity" />
                                <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 bg-ide-bg text-ide-text-secondary hover:text-ide-text-primary rounded-full p-1 opacity-0 group-hover:opacity-100 border border-ide-border transition-all">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="relative group/form">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="Ask anything... Use @ to tag files"
                        rows={3}
                        className="w-full bg-ide-sidebar border border-ide-border rounded-xl px-3 py-3 text-[13px] text-ide-text-primary placeholder:text-ide-text-secondary/50 resize-none focus:outline-none focus:ring-1 focus:ring-ide-accent/50 focus:border-ide-accent/50 transition-all custom-scrollbar mb-1 shadow-inner"
                    />
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                size="icon-xs"
                                variant="ghost"
                                disabled={isLoading}
                                onClick={triggerFileUpload}
                                className="text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover rounded-md h-7 w-7"
                                title="Visual Input"
                            >
                                <Image className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                type="button"
                                size="icon-xs"
                                variant="ghost"
                                disabled={isLoading}
                                onClick={onAnalyzeScreen}
                                className="text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover rounded-md h-7 w-7"
                                title="Analyze Interface"
                            >
                                <Monitor className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        {isLoading ? (
                            <Button type="button" size="xs" variant="outline" onClick={onStopGeneration} className="h-7 px-3 text-[10px] bg-ide-bg border-ide-border hover:bg-ide-hover text-ide-text-primary rounded-md">
                                <Square className="w-3 h-3 mr-1.5 fill-current" /> Stop
                            </Button>
                        ) : (
                            <Button type="submit" size="xs" disabled={!input.trim() || isLoading} className="h-7 px-3 text-[10px] font-medium bg-ide-accent text-white hover:bg-ide-accent/90 disabled:opacity-50 rounded-md transition-colors premium-glow">
                                <Send className="w-3.5 h-3.5 mr-1" />
                            </Button>
                        )}
                    </div>
                </form>

                <div className="flex justify-between items-center mt-3 px-1">
                    <p className="text-[10px] text-ide-text-secondary opacity-60">
                        {selectedModel}
                    </p>
                </div>
            </div>
        </aside>
    );
}
