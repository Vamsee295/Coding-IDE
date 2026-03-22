import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Wrench, Zap, Bot, User, FileCode, X, Plus, Clock, RotateCcw, Monitor, Image, Square } from "lucide-react";
import { ChatMessage } from "@/react-app/types/ide";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { AIAction, FileItem } from "@/react-app/types/ide";
import { useExtensions } from "@/react-app/contexts/ExtensionContext";
import FileMentions from "@/react-app/components/ide/FileMentions";

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
  onStopGeneration
}: ChatPanelProps) {
  const { isExtensionEnabled } = useExtensions();
  const aiEnabled = isExtensionEnabled("ai-enhancer");

  const [input, setInput] = useState("");
  const [mentionFilter, setMentionFilter] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [taggedFiles, setTaggedFiles] = useState<FileItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAtBottom = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Check if within 50px of bottom
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

    // Detect @ mention trigger
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1 && (lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === " ")) {
      const filter = textBeforeCursor.substring(lastAtSymbol + 1).toLowerCase();
      setMentionFilter(filter);
      setShowMentions(true);

      // Simple position calculation
      const rect = e.target.getBoundingClientRect();
      setMentionPosition({
        top: rect.top,
        left: rect.left + (cursorPosition * 6) % rect.width // Rough estimate
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
      // Keys handled by FileMentions' window listener
      if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) {
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const files = Array.from(e.clipboardData.files || []);
    let handled = false;

    // Process items (for data snippets, browser images)
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
      } else if (item.kind === "file") {
         // This might be a file copied from file explorer
         const file = item.getAsFile();
         if (file && file.type.startsWith('image/')) {
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
    }

    // Process high-level files if items didn't catch them
    if (files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          handled = true;
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result && typeof event.target.result === 'string') {
              setAttachedImages(prev => [...prev, event.target!.result as string]);
            }
          };
          reader.readAsDataURL(file);
        } else {
          // Non-image files: tag them for context
          handled = true;
          const text = await file.text();
          const fakeFileItem: FileItem = {
            id: `pasted-${Date.now()}-${file.name}`,
            name: file.name,
            type: "file",
            content: text,
          };
          setTaggedFiles(prev => [...prev, fakeFileItem]);
        }
      }
    }

    // If we handled any files/images, don't let the browser paste the binary name/junk into the text
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result && typeof event.target.result === 'string') {
            setAttachedImages(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <aside
      style={{ width }}
      className={cn(
        "glass-panel-dark border-l border-ide-border flex flex-col shrink-0 relative z-10",
        !isResizing && "transition-all duration-300"
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
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-ide-text-primary">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="w-7 h-7 text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all rounded-lg"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onViewHistory}
            className="w-7 h-7 text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all rounded-lg"
            title="Chat History"
          >
            <Clock className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions — only shown if AI extension is enabled */}
      {aiEnabled && (
        <div className="px-3 py-2 border-b border-ide-border flex gap-2 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onActionClick("explain")}
            className="h-7 px-2 text-xs gap-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Explain
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onActionClick("fix")}
            className="h-7 px-2 text-xs gap-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          >
            <Wrench className="w-3.5 h-3.5 text-blue-400" />
            Fix
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onActionClick("optimize")}
            className="h-7 px-2 text-xs gap-1.5 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            Optimize
          </Button>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-sm font-medium text-ide-text-primary mb-1">AI Assistant Ready</h3>
            <p className="text-xs text-ide-text-secondary">
              Select code and click an action, or ask me anything about your code. Use <span className="text-indigo-400">@</span> to tag files.
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
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-transform hover:scale-105",
                message.role === "user"
                  ? "bg-indigo-600 ring-2 ring-indigo-500/20"
                  : "bg-white/10 backdrop-blur-md border border-white/10"
              )}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
              )}
            </div>
            <div
              className={cn(
                "flex-1 min-w-0 max-w-[85%]",
                message.role === "user" ? "text-right" : ""
              )}
            >
              <div
                className={cn(
                  "inline-block px-4 py-3 rounded-2xl text-[13px] shadow-xl border transition-all duration-300",
                  message.role === "user"
                    ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-none"
                    : "glass-panel-dark text-ide-text-primary border-white/5 rounded-tl-none hover:border-white/10"
                )}
              >
                <div className="markdown-body text-sm leading-relaxed prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <div className="rounded-md overflow-x-auto my-2 border border-ide-border">
                            <div className="flex items-center justify-between px-3 py-1 bg-ide-bg text-xs text-ide-text-secondary border-b border-ide-border">
                              <span>{match[1]}</span>
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
                          <code {...props} className="bg-black/30 px-1 py-0.5 rounded text-indigo-300 font-mono text-xs">
                            {children}
                          </code>
                        );
                      },
                      p({ children }) {
                        return <p className="mb-2 last:mb-0">{children}</p>;
                      },
                      a({ children, href }) {
                        return <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{children}</a>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
                      }
                    }}
                  >
                    {/* Pre-process text to style @mentions */}
                    {message.content.replace(/(@[\w\.-]+)/g, "`$1`")}
                  </ReactMarkdown>
                </div>

                {/* AI Action Proposals */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-ide-border/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary mb-1">Proposed Actions</p>
                    {message.actions.map((action, idx) => (
                      <div 
                        key={idx} 
                        className="bg-ide-bg/50 rounded-lg p-2 border border-ide-border flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
                        style={{ animationDuration: '400ms', animationDelay: `${idx * 150}ms` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {action.type === "run_command" ? (
                              <Send className="w-3 h-3 text-green-400" />
                            ) : (
                              <FileCode className="w-3 h-3 text-blue-400" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-ide-text-primary truncate">
                                     {action.type === 'run_command' ? action.command : (action.path ? action.path.split(/[\\/]/).pop() : 'Unnamed File')}
                                </div>
                                <div className="text-[10px] text-ide-text-secondary truncate mt-0.5 opacity-60">
                                    {action.type === 'run_command' ? 'Terminal Command' : (action.path || 'No path specified')}
                                </div>
                            </div>
                          </div>
                          {!message.applied ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-6 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                              onClick={() => onApplyAction(action, message.id)}
                            >
                              Apply
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="h-6 px-2 text-[10px] text-green-400 bg-green-400/10 hover:bg-green-400/10 border-none opacity-100"
                            >
                              Applied
                            </Button>
                          )}
                        </div>
                        {action.type !== "run_command" && (
                          <div className="text-[9px] text-ide-text-secondary italic">
                            {action.type === "write_file" ? "Modify existing file" : "Create new file"}
                          </div>
                        )}
                      </div>
                    ))}
                    {message.applied && (
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRevert(message.id)}
                          className="h-6 px-2 text-[10px] gap-1 text-ide-text-secondary hover:text-white"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Revert Changes
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-ide-text-secondary mt-1 px-1">
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-ide-sidebar rounded-xl rounded-tl-sm px-3 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-ide-text-secondary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-ide-text-secondary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-ide-text-secondary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-ide-border bg-white/5 backdrop-blur-sm">
        {taggedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 px-1">
            {taggedFiles.map(file => (
              <div key={file.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-semibold animate-in fade-in zoom-in-95 backdrop-blur-sm">
                <FileCode className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {attachedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 px-1">
            {attachedImages.map((src, idx) => (
              <div key={idx} className="relative group animate-in fade-in zoom-in-95">
                <img
                  src={src}
                  alt={`Attached ${idx + 1}`}
                  className="h-20 w-auto object-cover rounded-xl border border-white/10 shadow-lg transition-transform group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all border border-white/10 shadow-xl"
                >
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
            placeholder="Ask about your code... Use @ to tag files"
            rows={2}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 pr-16 text-sm text-ide-text-primary placeholder:text-ide-text-secondary/60 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xl custom-scrollbar"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={isLoading}
              onClick={triggerFileUpload}
              className="w-7 h-7 text-ide-text-secondary hover:text-indigo-400 hover:bg-indigo-400/10"
              title="Upload Image"
            >
              <Image className="w-3.5 h-3.5" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={isLoading}
              onClick={onAnalyzeScreen}
              className="w-7 h-7 text-ide-text-secondary hover:text-indigo-400 hover:bg-indigo-400/10"
              title="Analyze Screen"
            >
              <Monitor className="w-3.5 h-3.5" />
            </Button>
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                onClick={onStopGeneration}
                className="w-7 h-7 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 animate-pulse"
                title="Stop Generating"
              >
                <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="w-7 h-7 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </Button>
            )}
          </div>
        </form>

        <p className="text-[10px] text-ide-text-secondary mt-2 text-center">
          Model: {selectedModel} • Local Ollama
        </p>
      </div>
    </aside>
  );
}
