import MonacoEditor from "@monaco-editor/react";
import { X, Circle } from "lucide-react";
import { EditorTab } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";

interface EditorProps {
  tabs: EditorTab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onContentChange: (tabId: string, content: string) => void;
}

const getLanguage = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "md":
      return "markdown";
    case "py":
      return "python";
    case "java":
      return "java";
    default:
      return "plaintext";
  }
};

export default function Editor({ tabs, onTabSelect, onTabClose, onContentChange }: EditorProps) {
  const activeTab = tabs.find((t) => t.isActive);

  if (tabs.length === 0) {
    return (
      <div className="flex-1 bg-ide-editor flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ide-sidebar flex items-center justify-center">
            <span className="text-3xl">📝</span>
          </div>
          <h3 className="text-lg font-medium text-ide-text-primary mb-2">No file open</h3>
          <p className="text-sm text-ide-text-secondary">
            Select a file from the explorer to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-ide-editor flex flex-col min-w-0">
      {/* Tabs */}
      <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "h-full flex items-center gap-2 px-3 border-r border-ide-border cursor-pointer group transition-colors",
              tab.isActive
                ? "bg-ide-editor text-ide-text-primary"
                : "text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
            )}
            onClick={() => onTabSelect(tab.id)}
          >
            <span className="text-sm truncate max-w-32">{tab.name}</span>
            {tab.isDirty && <Circle className="w-2 h-2 fill-indigo-400 text-indigo-400" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="w-4 h-4 flex items-center justify-center rounded hover:bg-ide-border opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Monaco Editor */}
      {activeTab && (
        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={getLanguage(activeTab.name)}
            value={activeTab.content}
            theme="vs-dark"
            onChange={(value) => onContentChange(activeTab.id, value || "")}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              padding: { top: 16, bottom: 16 },
              lineNumbers: "on",
              renderLineHighlight: "all",
              bracketPairColorization: { enabled: true },
              autoIndent: "full",
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
              wordWrap: "on",
            }}
          />
        </div>
      )}
    </div>
  );
}
