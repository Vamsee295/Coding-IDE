import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import { X, Circle, ChevronRight, Sparkles } from "lucide-react";
import { EditorTab } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import { useIdeCommandListener, useIdeCommand } from "@/react-app/contexts/IdeCommandContext";
import { connectLanguageServer, disconnectLanguageServer } from "@/services/lspClient";
import { getFileIconUrl } from "@/react-app/lib/fileIcons";
import { aiCompletionService } from "@/services/aiCompletionService";

let inlineCompletionsRegistered = false;

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
  onTabRename: (tabId: string, newName: string) => void;
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
    case "sh":
      return "shell";
    default:
      return "plaintext";
  }
};

export default function Editor({ tabs, onTabSelect, onTabClose, onContentChange, onTabRename, onSelectionChange }: EditorProps) {
  const activeTab = tabs.find((t) => t.isActive);
  const { settings } = useSettings();
  const editorRef = useRef<any>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [tempTabName, setTempTabName] = useState("");

  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [floatingMenuPos, setFloatingMenuPos] = useState({ top: 0, left: 0 });

  const { dispatchCommand } = useIdeCommand();

  const selectionDisposeRef = useRef<(() => void) | null>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
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
    // Semantic validation now backed by our actual typescript-language-server

    // Register AI Inline Completions if not already registered globally
    if (!inlineCompletionsRegistered) {
      inlineCompletionsRegistered = true;
      monaco.languages.registerInlineCompletionsProvider('*', {
        provideInlineCompletions: async (model: any, position: any, _context: any, token: any) => {
          // If suggestion was explicitly triggered vs typing
          // We can optimize here, but for now just fetch
          const fullText = model.getValue();
          const offset = model.getOffsetAt(position);
          
          const prefix = fullText.substring(0, offset);
          const suffix = fullText.substring(offset);

          const suggestion = await aiCompletionService.getCompletion(prefix, suffix, token);

          if (!suggestion) {
             return { items: [] };
          }

          return {
             items: [{
               insertText: suggestion,
               range: new monaco.Range(
                 position.lineNumber,
                 position.column,
                 position.lineNumber,
                 position.column
               )
             }]
          };
        },
        freeInlineCompletions: () => { }
      });
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    selectionDisposeRef.current?.();

    if (activeTab) {
      const language = getLanguage(activeTab.name);
      
      if (language === 'typescript' || language === 'javascript') {
          connectLanguageServer(editor as any, language);
      }

      const path = activeTab.path ?? "";
      const name = activeTab.name;
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

        if (selectedText.trim().length > 0 && sel && (sel.endLineNumber !== sel.startLineNumber || sel.endColumn !== sel.startColumn)) {
          setTimeout(() => {
            const currentEditor = editorRef.current;
            if (!currentEditor) return;
            const endPos = sel.getEndPosition();
            const scrolledPos = currentEditor.getScrolledVisiblePosition(endPos);
            if (scrolledPos) {
              setFloatingMenuPos({ top: scrolledPos.top + 35, left: scrolledPos.left });
              setShowFloatingMenu(true);
            }
          }, 100);
        } else {
          setShowFloatingMenu(false);
        }
      });
      selectionDisposeRef.current = () => disposable.dispose();
    }
  };

  const lastContentRef = useRef(activeTab?.content);

  useEffect(() => {
    if (!editorRef.current || !activeTab) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const currentContent = activeTab.content || "";
    if (currentContent !== lastContentRef.current) {
      lastContentRef.current = currentContent;
      if (model.getValue() !== currentContent) {
        const selection = editorRef.current.getSelection();
        editorRef.current.executeEdits("external-update", [{
          range: model.getFullModelRange(),
          text: currentContent,
          forceMoveMarkers: true
        }]);
        if (selection) {
          editorRef.current.setSelection(selection);
        }
      }
    }
  }, [activeTab?.content, activeTab]);


  useEffect(() => () => { 
      selectionDisposeRef.current?.();
      disconnectLanguageServer();
  }, []);

  useIdeCommandListener("edit.undo", () => editorRef.current?.trigger('menu', 'undo', null));
  useIdeCommandListener("edit.redo", () => editorRef.current?.trigger('menu', 'redo', null));
  useIdeCommandListener("edit.find", () => editorRef.current?.trigger('menu', 'actions.find', null));
  useIdeCommandListener("edit.replace", () => editorRef.current?.trigger('menu', 'editor.action.startFindReplaceAction', null));
  useIdeCommandListener("edit.toggleLineComment", () => editorRef.current?.trigger('menu', 'editor.action.commentLine', null));
  useIdeCommandListener("edit.toggleBlockComment", () => editorRef.current?.trigger('menu', 'editor.action.blockComment', null));

  useIdeCommandListener("edit.cut", async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      const text = editor.getModel()?.getValueInRange(selection);
      if (text) {
        await navigator.clipboard.writeText(text);
        editor.executeEdits("clipboard", [{ range: selection, text: "", forceMoveMarkers: true }]);
      }
    }
  });

  useIdeCommandListener("edit.copy", async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      const text = editor.getModel()?.getValueInRange(selection);
      if (text) await navigator.clipboard.writeText(text);
    }
  });

  useIdeCommandListener("edit.paste", async () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      const selection = editor.getSelection();
      editor.executeEdits("clipboard", [{ range: selection, text, forceMoveMarkers: true }]);
    } catch (e) {
      console.error("Paste failed", e);
    }
  });

  useIdeCommandListener("selection.selectAll", () => editorRef.current?.trigger('menu', 'editor.action.selectAll', null));
  useIdeCommandListener("selection.expandSelection", () => editorRef.current?.trigger('menu', 'editor.action.smartSelect.expand', null));
  useIdeCommandListener("selection.shrinkSelection", () => editorRef.current?.trigger('menu', 'editor.action.smartSelect.shrink', null));
  useIdeCommandListener("selection.copyLineUp", () => editorRef.current?.trigger('menu', 'editor.action.copyLinesUpAction', null));
  useIdeCommandListener("selection.copyLineDown", () => editorRef.current?.trigger('menu', 'editor.action.copyLinesDownAction', null));
  useIdeCommandListener("selection.moveLineUp", () => editorRef.current?.trigger('menu', 'editor.action.moveLinesUpAction', null));
  useIdeCommandListener("selection.moveLineDown", () => editorRef.current?.trigger('menu', 'editor.action.moveLinesDownAction', null));
  useIdeCommandListener("selection.duplicateSelection", () => editorRef.current?.trigger('menu', 'editor.action.duplicateSelection', null));
  useIdeCommandListener("selection.addCursorAbove", () => editorRef.current?.trigger('menu', 'editor.action.insertCursorAbove', null));
  useIdeCommandListener("selection.addCursorBelow", () => editorRef.current?.trigger('menu', 'editor.action.insertCursorBelow', null));
  useIdeCommandListener("selection.addCursorsToLineEnds", () => editorRef.current?.trigger('menu', 'editor.action.insertCursorAtEndOfEachLineSelected', null));
  useIdeCommandListener("selection.addNextOccurrence", () => editorRef.current?.trigger('menu', 'editor.action.addSelectionToNextFindMatch', null));

  useIdeCommandListener("view.commandPalette", () => editorRef.current?.trigger('menu', 'editor.action.quickCommand', null));
  useIdeCommandListener("help.showCommands", () => editorRef.current?.trigger('menu', 'editor.action.quickCommand', null));

  useIdeCommandListener("go.goToSymbolInEditor", () => editorRef.current?.trigger('menu', 'editor.action.quickOutline', null));
  useIdeCommandListener("go.goToDefinition", () => editorRef.current?.trigger('menu', 'editor.action.revealDefinition', null));
  useIdeCommandListener("go.goToDeclaration", () => editorRef.current?.trigger('menu', 'editor.action.revealDeclaration', null));
  useIdeCommandListener("go.goToTypeDefinition", () => editorRef.current?.trigger('menu', 'editor.action.goToTypeDefinition', null));
  useIdeCommandListener("go.goToImplementation", () => editorRef.current?.trigger('menu', 'editor.action.goToImplementation', null));
  useIdeCommandListener("go.goToReferences", () => editorRef.current?.trigger('menu', 'editor.action.referenceSearch.trigger', null));
  useIdeCommandListener("go.goToLine", () => editorRef.current?.trigger('menu', 'editor.action.gotoLine', null));
  useIdeCommandListener("go.goToBracket", () => editorRef.current?.trigger('menu', 'editor.action.jumpToBracket', null));
  useIdeCommandListener("go.nextProblem", () => editorRef.current?.trigger('menu', 'editor.action.marker.next', null));
  useIdeCommandListener("go.previousProblem", () => editorRef.current?.trigger('menu', 'editor.action.marker.prev', null));
  useIdeCommandListener("go.nextChange", () => editorRef.current?.trigger('menu', 'editor.action.dirtydiff.next', null));
  useIdeCommandListener("go.previousChange", () => editorRef.current?.trigger('menu', 'editor.action.dirtydiff.previous', null));

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
            onClick={() => {
              if (tab.isActive) {
                // Keep simple
              }
              onTabSelect(tab.id);
            }}
          >
            {renamingTabId === tab.id ? (
              <input
                autoFocus
                className="bg-ide-editor text-sm text-ide-text-primary px-1 border border-indigo-500 rounded focus:outline-none w-24"
                value={tempTabName}
                onChange={(e) => setTempTabName(e.target.value)}
                onBlur={() => {
                  if (tempTabName.trim() && tempTabName !== tab.name) {
                    onTabRename(tab.id, tempTabName);
                  }
                  setRenamingTabId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (tempTabName.trim() && tempTabName !== tab.name) {
                      onTabRename(tab.id, tempTabName);
                    }
                    setRenamingTabId(null);
                  } else if (e.key === 'Escape') {
                    setRenamingTabId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-sm flex items-center gap-1.5 truncate max-w-32 select-none"
                onClick={(e) => {
                  if (tab.isActive) {
                    e.stopPropagation();
                    setRenamingTabId(tab.id);
                    setTempTabName(tab.name);
                  }
                }}
              >
                <img src={getFileIconUrl(tab.name)} alt={tab.name} className="w-3.5 h-3.5 shrink-0" />
                {tab.name}
              </span>
            )}
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

      {/* Breadcrumbs */}
      {settings.breadcrumbs && activeTab && activeTab.path && (
        <div className="h-7 bg-ide-editor border-b border-ide-border flex items-center px-4 gap-2 text-[11px] text-ide-text-secondary select-none">
          {activeTab.path.split(/[/\\]/).filter(Boolean).map((part, idx, arr) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={cn(
                "flex items-center gap-1.5",
                idx === arr.length - 1 ? "text-ide-text-primary" : "hover:text-ide-text-primary cursor-pointer transition-colors"
              )}>
                {idx === arr.length - 1 && <img src={getFileIconUrl(part)} alt={part} className="w-3.5 h-3.5 shrink-0" />}
                {part}
              </span>
              {idx < arr.length - 1 && <ChevronRight className="w-3 h-3 text-ide-text-secondary/50" />}
            </div>
          ))}
        </div>
      )}

      {/* Monaco Editor */}
      {activeTab && (
        <div className="flex-1 min-h-0 relative">
          {/* Floating Refactor Menu */}
          {showFloatingMenu && (
            <div 
              className="absolute z-50 flex items-center gap-1 p-1 bg-ide-sidebar border border-ide-border rounded-md shadow-2xl animate-in fade-in zoom-in-95 duration-100"
              style={{ top: floatingMenuPos.top, left: floatingMenuPos.left }}
            >
              <button 
                onClick={() => {
                  dispatchCommand("view.toggleAiChat");
                  setShowFloatingMenu(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                title="Open AI Chat"
              >
                <Sparkles className="w-3 h-3 text-indigo-300" />
                Explain / Refactor
              </button>
              <button 
                onClick={() => {
                  editorRef.current?.trigger('menu', 'editor.action.clipboardCopyAction', null);
                  setShowFloatingMenu(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-ide-text-secondary hover:text-white hover:bg-ide-hover rounded transition-colors"
              >
                Copy
              </button>
            </div>
          )}
          <MonacoEditor
            height="100%"
            language={getLanguage(activeTab.name)}
            path={activeTab.path || activeTab.name}
            theme={settings.theme === 'snowy-studio' ? "vs-light" : "vs-dark"}
            onChange={(value) => {
              lastContentRef.current = value || "";
              onContentChange(activeTab.id, value || "");
            }}
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
              smoothScrolling: false,
              cursorBlinking: "blink",
              cursorSmoothCaretAnimation: "off",
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
