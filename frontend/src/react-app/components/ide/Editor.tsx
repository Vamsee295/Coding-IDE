import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import { X, Circle } from "lucide-react";
import { EditorTab } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import { useIdeCommandListener } from "@/react-app/contexts/IdeCommandContext";

export type SelectionChangePayload = {
  path?: string;
  name?: string;
  selectedText?: string;
  language?: string;
  startLine?: number;
  endLine?: number;
};

interface EditorProps {
  tabs: EditorTab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onContentChange: (tabId: string, content: string) => void;
  onSelectionChange?: (payload: SelectionChangePayload) => void;
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
    case "php":
      return "php";
    case "sh":
      return "shell";
    default:
      return "plaintext";
  }
};

export default function Editor({ tabs, onTabSelect, onTabClose, onContentChange, onSelectionChange }: EditorProps) {
  const activeTab = tabs.find((t) => t.isActive);
  const { settings } = useSettings();
  const editorRef = useRef<any>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const selectionDisposeRef = useRef<(() => void) | null>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
    // Configure TypeScript compiler options to work without node_modules
    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;

    const compilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      jsxImportSource: "react",
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
      experimentalDecorators: true,
      lib: ["esnext", "dom", "dom.iterable"],
    };

    tsDefaults.setCompilerOptions(compilerOptions);
    jsDefaults.setCompilerOptions(compilerOptions);

    // Disable semantic validation (type errors) — Monaco doesn't have access
    // to user's node_modules, so these would all be false positives
    tsDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });
    jsDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    selectionDisposeRef.current?.();
    if (onSelectionChangeRef.current && activeTab) {
      const path = activeTab.path ?? "";
      const name = activeTab.name;
      const language = activeTab.language || getLanguage(activeTab.name);
      const disposable = editor.onDidChangeCursorSelection(() => {
        const sel = editor.getSelection();
        const model = editor.getModel();
        const selectedText = sel && model ? model.getValueInRange(sel) : "";
        onSelectionChangeRef.current?.({
          path,
          name,
          selectedText,
          language,
          startLine: sel?.startLineNumber ?? 0,
          endLine: sel?.endLineNumber ?? 0,
        });
      });
      selectionDisposeRef.current = () => disposable.dispose();
    }
  };

  useEffect(() => () => { selectionDisposeRef.current?.(); }, []);

  // Bind IDE Commands to Monaco editor actions
  useIdeCommandListener("edit.undo", () => editorRef.current?.trigger('menu', 'undo', null));
  useIdeCommandListener("edit.redo", () => editorRef.current?.trigger('menu', 'redo', null));
  useIdeCommandListener("edit.find", () => editorRef.current?.trigger('menu', 'actions.find', null));
  useIdeCommandListener("edit.replace", () => editorRef.current?.trigger('menu', 'editor.action.startFindReplaceAction', null));
  useIdeCommandListener("edit.toggleLineComment", () => editorRef.current?.trigger('menu', 'editor.action.commentLine', null));
  useIdeCommandListener("edit.toggleBlockComment", () => editorRef.current?.trigger('menu', 'editor.action.blockComment', null));

  useIdeCommandListener("selection.selectAll", () => editorRef.current?.trigger('menu', 'editor.action.selectAll', null));
  useIdeCommandListener("selection.expandSelection", () => editorRef.current?.trigger('menu', 'editor.action.smartSelect.expand', null));
  useIdeCommandListener("selection.shrinkSelection", () => editorRef.current?.trigger('menu', 'editor.action.smartSelect.shrink', null));
  useIdeCommandListener("selection.copyLineUp", () => editorRef.current?.trigger('menu', 'editor.action.copyLinesUpAction', null));
  useIdeCommandListener("selection.copyLineDown", () => editorRef.current?.trigger('menu', 'editor.action.copyLinesDownAction', null));
  useIdeCommandListener("selection.moveLineUp", () => editorRef.current?.trigger('menu', 'editor.action.moveLinesUpAction', null));
  useIdeCommandListener("selection.moveLineDown", () => editorRef.current?.trigger('menu', 'editor.action.moveLinesDownAction', null));

  useIdeCommandListener("view.commandPalette", () => editorRef.current?.trigger('menu', 'editor.action.quickCommand', null));
  useIdeCommandListener("help.showCommands", () => editorRef.current?.trigger('menu', 'editor.action.quickCommand', null));

  useIdeCommandListener("go.goToSymbol", () => editorRef.current?.trigger('menu', 'editor.action.quickOutline', null));
  useIdeCommandListener("go.goToDefinition", () => editorRef.current?.trigger('menu', 'editor.action.revealDefinition', null));
  useIdeCommandListener("go.goToLine", () => editorRef.current?.trigger('menu', 'editor.action.gotoLine', null));

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
            path={activeTab.path || activeTab.name}
            value={activeTab.content}
            theme={settings.theme === 'snowy-studio' ? "vs-light" : "vs-dark"}
            onChange={(value) => onContentChange(activeTab.id, value || "")}
            onMount={handleEditorDidMount}
            beforeMount={handleBeforeMount}
            options={{
              fontSize: settings.fontSize,
              fontFamily: settings.fontFamily,
              minimap: { enabled: settings.minimap, scale: 1 },
              wordWrap: settings.wordWrap ? "on" : "off",
              lineNumbers: settings.lineNumbers ? "on" : "off",
              bracketPairColorization: { enabled: settings.bracketPairColorization },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: "all",
              autoIndent: "full",
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
            }}
          />
        </div>
      )}
    </div>
  );
}
