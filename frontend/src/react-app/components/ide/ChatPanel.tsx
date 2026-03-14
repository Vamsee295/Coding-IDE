import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Wrench, Zap, Bot, User, FileCode, X } from "lucide-react";
import { ChatMessage } from "@/react-app/types/ide";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";

import { AIAction, FileItem } from "@/react-app/types/ide";
import { useExtensions } from "@/react-app/contexts/ExtensionContext";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import FileMentions from "@/react-app/components/ide/FileMentions";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, taggedFiles?: FileItem[], attachedImages?: string[]) => void;
  onActionClick: (action: "explain" | "fix" | "optimize") => void;
  onApplyAction: (action: AIAction) => void;
  isLoading: boolean;
  selectedModel: string;
  files: FileItem[];
  width: number;
  isResizing: boolean;
}

export default function ChatPanel({ messages, onSendMessage, onActionClick, onApplyAction, isLoading, selectedModel, files, width, isResizing }: ChatPanelProps) {
  const { isExtensionEnabled } = useExtensions();
  const { settings } = useSettings();
  const aiEnabled = isExtensionEnabled("ai-enhancer");
  const contextAware = settings.contextualAwareness;

  const [input, setInput] = useState("");
  const [mentionFilter, setMentionFilter] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [taggedFiles, setTaggedFiles] = useState<FileItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    // Access items synchronously to avoid them being cleared in asynchronous contexts
    const items = Array.from(e.clipboardData.items);

    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result && typeof event.target.result === 'string') {
            setAttachedImages(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      } else if (item.kind === "file") {
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const text = await file.text();
          const fakeFileItem: FileItem = {
            id: `pasted-${Date.now()}-${file.name}`,
            name: file.name,
            type: "file",
            content: text,
          };
          setTaggedFiles(prev => [...prev, fakeFileItem]);
        } catch (error) {
          console.error("Failed to read pasted file:", error);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (id: string) => {
    setTaggedFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <aside
      style={{ width }}
      className={cn(
        "bg-ide-chat border-l border-ide-border flex flex-col shrink-0 relative",
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
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-ide-text-primary">AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {contextAware && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
              <span className="text-[10px] font-medium text-indigo-400">Context</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${aiEnabled ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
            <span className="text-[10px] text-ide-text-secondary">{aiEnabled ? "Live" : "Off"}</span>
          </div>
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
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
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
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                message.role === "user"
                  ? "bg-indigo-600"
                  : "bg-gradient-to-br from-indigo-500/20 to-purple-500/20"
              )}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <div
              className={cn(
                "flex-1 min-w-0",
                message.role === "user" ? "text-right" : ""
              )}
            >
              <div
                className={cn(
                  "inline-block px-3 py-2 rounded-xl text-sm max-w-full shadow-sm",
                  message.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-ide-sidebar text-ide-text-primary rounded-tl-sm"
                )}
              >
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.content.split(/(@[\w\.-]+)/g).map((part, i) =>
                    part.startsWith("@") ? (
                      <span key={i} className="text-indigo-300 font-semibold px-1 rounded bg-indigo-400/10">
                        {part}
                      </span>
                    ) : part
                  )}
                </div>

                {/* AI Action Proposals */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-ide-border/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ide-text-secondary mb-1">Proposed Actions</p>
                    {message.actions.map((action, idx) => (
                      <div key={idx} className="bg-ide-bg/50 rounded-lg p-2 border border-ide-border flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {action.type === "run_command" ? (
                              <Send className="w-3 h-3 text-green-400" />
                            ) : (
                              <FileCode className="w-3 h-3 text-blue-400" />
                            )}
                            <span className="text-[11px] font-medium truncate">
                              {action.type === "run_command" ? action.command : action.path}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                            onClick={() => onApplyAction(action)}
                          >
                            Apply
                          </Button>
                        </div>
                        {action.type !== "run_command" && (
                          <div className="text-[9px] text-ide-text-secondary italic">
                            {action.type === "write_file" ? "Modify existing file" : "Create new file"}
                          </div>
                        )}
                      </div>
                    ))}
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
      <div className="p-3 border-t border-ide-border">
        {taggedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 px-1">
            {taggedFiles.map(file => (
              <div key={file.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-medium animate-in fade-in zoom-in-95">
                <FileCode className="w-2.5 h-2.5" />
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
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {attachedImages.map((src, idx) => (
              <div key={idx} className="relative group animate-in fade-in zoom-in-95">
                <img
                  src={src}
                  alt={`Attached ${idx + 1}`}
                  className="h-16 w-auto object-cover rounded-md border border-ide-border shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-600 shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Ask about your code... Paste images/files... Use @ to tag files"
            rows={2}
            className="w-full bg-ide-sidebar border border-ide-border rounded-xl px-4 py-3 pr-12 text-sm text-ide-text-primary placeholder:text-ide-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="w-7 h-7 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </Button>
          </div>
        </form>

        <p className="text-[10px] text-ide-text-secondary mt-2 text-center">
          Model: {selectedModel} • Local Ollama
        </p>
      </div>
    </aside>
  );
}
