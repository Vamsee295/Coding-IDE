import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Wrench, Zap, Bot, User, Plus } from "lucide-react";
import { ChatMessage } from "@/react-app/types/ide";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onActionClick: (action: "explain" | "fix" | "optimize") => void;
  isLoading: boolean;
}

export default function ChatPanel({ messages, onSendMessage, onActionClick, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <aside className="w-80 bg-ide-chat border-l border-ide-border flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-ide-text-primary">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-ide-text-secondary">Connected</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-ide-border flex gap-2">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-sm font-medium text-ide-text-primary mb-1">AI Assistant Ready</h3>
            <p className="text-xs text-ide-text-secondary">
              Select code and click an action, or ask me anything about your code.
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
                  "inline-block px-3 py-2 rounded-xl text-sm max-w-full",
                  message.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-ide-sidebar text-ide-text-primary rounded-tl-sm"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
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
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your code..."
            rows={2}
            className="w-full bg-ide-sidebar border border-ide-border rounded-xl px-4 py-3 pr-12 text-sm text-ide-text-primary placeholder:text-ide-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
            >
              <Plus className="w-4 h-4" />
            </Button>
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
          Model: Qwen 2.5 Coder • Local Ollama
        </p>
      </div>
    </aside>
  );
}
