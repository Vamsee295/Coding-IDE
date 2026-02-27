import { useState, useRef, useEffect } from "react";
import { Terminal, X, Plus, ChevronDown, Trash2, Split } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { cn } from "@/react-app/lib/utils";

interface TerminalTab {
  id: string;
  name: string;
  output: string[];
  isActive: boolean;
}

interface TerminalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
}

export default function TerminalPanel({
  isVisible,
  onClose,
  height,
  onHeightChange,
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: "terminal-1",
      name: "bash",
      output: [
        "Welcome to Ollama IDE Terminal",
        "Type your commands here...",
        "",
        "$ ",
      ],
      isActive: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tabs]);

  const activeTab = tabs.find((t) => t.isActive);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      const command = input.trim();
      setTabs((prev) =>
        prev.map((tab) =>
          tab.isActive
            ? {
                ...tab,
                output: [
                  ...tab.output,
                  `$ ${command}`,
                  `Command '${command}' executed (demo mode)`,
                  "",
                  "$ ",
                ],
              }
            : tab
        )
      );
      setInput("");
    }
  };

  const handleNewTab = () => {
    const newTab: TerminalTab = {
      id: `terminal-${Date.now()}`,
      name: "bash",
      output: ["$ "],
      isActive: true,
    };
    setTabs((prev) => [...prev.map((t) => ({ ...t, isActive: false })), newTab]);
  };

  const handleCloseTab = (tabId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (filtered.length > 0 && prev.find((t) => t.id === tabId)?.isActive) {
        filtered[filtered.length - 1].isActive = true;
      }
      return filtered;
    });
  };

  const handleSelectTab = (tabId: string) => {
    setTabs((prev) => prev.map((t) => ({ ...t, isActive: t.id === tabId })));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const delta = resizeStartY.current - e.clientY;
        const newHeight = Math.max(150, Math.min(600, resizeStartHeight.current + delta));
        onHeightChange(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, height, onHeightChange]);

  if (!isVisible) return null;

  return (
    <div
      className="bg-ide-bg border-t border-ide-border flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-ide-border hover:bg-indigo-500 cursor-row-resize transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "h-7 flex items-center gap-2 px-3 rounded-t text-xs transition-colors cursor-pointer group",
                  tab.isActive
                    ? "bg-ide-bg text-ide-text-primary"
                    : "text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
                )}
                onClick={() => handleSelectTab(tab.id)}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.id);
                    }}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-ide-border opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewTab}
            className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          >
            <Split className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-sm text-ide-text-primary bg-ide-bg">
        {activeTab?.output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-words">
            {line}
          </div>
        ))}
        <div ref={outputEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-2 border-t border-ide-border bg-ide-bg">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-green-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-ide-text-primary placeholder:text-ide-text-secondary outline-none"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
