import { useState, useEffect } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { X, Check } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";

interface DiffPreviewModalProps {
  isOpen: boolean;
  fileName: string;
  originalContent: string;
  modifiedContent: string;
  onAccept: (editedContent?: string) => void;
  onCancel: () => void;
}

export default function DiffPreviewModal({
  isOpen,
  fileName,
  originalContent,
  modifiedContent,
  onAccept,
  onCancel,
}: DiffPreviewModalProps) {
  const [currentModifiedContent, setCurrentModifiedContent] = useState(modifiedContent);

  useEffect(() => {
    setCurrentModifiedContent(modifiedContent);
  }, [modifiedContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[90vw] h-[85vh] bg-ide-bg border border-ide-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border bg-ide-sidebar">
          <div>
            <h2 className="text-sm font-semibold text-ide-text-primary">Review Proposed Changes</h2>
            <p className="text-xs text-ide-text-secondary mt-0.5">File: <span className="text-indigo-400 font-medium">{fileName}</span></p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-ide-text-secondary hover:text-white hover:bg-ide-hover rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 min-h-0 bg-ide-editor p-1">
          <div className="px-4 py-2 bg-ide-sidebar/50 border-b border-ide-border text-xs text-ide-text-secondary flex items-center justify-between">
            <span>You can edit the right panel to partially accept changes.</span>
          </div>
          <DiffEditor
            original={originalContent}
            modified={currentModifiedContent}
            language={getLanguageFromFileName(fileName)}
            theme="vs-dark"
            options={{
              renderSideBySide: true,
              minimap: { enabled: false },
              readOnly: false,
              originalEditable: false,
              fontSize: 13,
              fontFamily: "'Inter', 'JetBrains Mono', monospace",
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              useInlineViewWhenSpaceIsLimited: false,
            }}
            onMount={(editor) => {
              const modifiedEditor = editor.getModifiedEditor();
              modifiedEditor.onDidChangeModelContent(() => {
                setCurrentModifiedContent(modifiedEditor.getValue());
              });
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-ide-border bg-ide-sidebar">
          <Button variant="ghost" onClick={onCancel} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button onClick={() => onAccept(currentModifiedContent)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6">
            <Check className="w-4 h-4" />
            Accept Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

const getLanguageFromFileName = (filename: string): string => {
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
    case "c":
      return "c";
    case "cpp":
    case "cc":
      return "cpp";
    case "go":
      return "go";
    case "rust":
    case "rs":
      return "rust";
    case "rb":
      return "ruby";
    case "sh":
      return "shell";
    default:
      return "plaintext";
  }
};
