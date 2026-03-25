import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import { X, Circle, ChevronRight, Sparkles, Check } from "lucide-react";
import { EditorTab, PendingEditProposal } from "@/react-app/types/ide";
import { cn } from "@/react-app/lib/utils";
import { useSettings } from "@/react-app/contexts/SettingsContext";
import { useIdeCommandListener, useIdeCommand } from "@/react-app/contexts/IdeCommandContext";
import { connectLanguageServer, disconnectLanguageServer } from "@/services/lspClient";
import { getFileIconUrl } from "@/react-app/lib/fileIcons";
import { aiCompletionService } from "@/services/aiCompletionService";
import { DiffPreview } from "./DiffPreview";

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
  pendingEdit?: PendingEditProposal | null;
  onAcceptEdit?: () => void;
  onRejectEdit?: () => void;
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

export default function Editor({ tabs, onTabSelect, onTabClose, onContentChange, onTabRename, onSelectionChange, pendingEdit, onAcceptEdit, onRejectEdit }: EditorProps) {
  const activeTab = tabs.find((t) => t.isActive);
  const { settings } = useSettings();
  const editorRef = useRef<any>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [tempTabName, setTempTabName] = useState("");

  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [floatingMenuPos, setFloatingMenuPos] = useState({ top: 0, left: 0 });
  const [inlinePrompt, setInlinePrompt] = useState("");
  const [isInlineLoading, setIsInlineLoading] = useState(false);
  const decoratorsRef = useRef<any[]>([]);

  const { dispatchCommand } = useIdeCommand();

  const selectionDisposeRef = useRef<(() => void) | null>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
    // Custom Monaco theme to better match the IDE design system.
    monaco.editor.defineTheme("stackflow-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0c0f14",
        "editorLineNumber.foreground": "#6f7583",
        "editorLineNumber.activeForeground": "#cfd5e1",
        "editorLineHighlightBackground": "rgba(124, 92, 255, 0.12)",
        "editorLineHighlightBorder": "rgba(124, 92, 255, 0.18)",
        "editor.selectionBackground": "rgba(124, 92, 255, 0.22)",
        "editor.inactiveSelectionBackground": "rgba(124, 92, 255, 0.16)",
        "editorCursor.foreground": "#f0f2ff",
        "editorCursor.background": "#f0f2ff",
        "editorWhitespace.foreground": "#2b3140",
      },
    });

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
          setInlinePrompt("");
        }
      });
      selectionDisposeRef.current = () => disposable.dispose();
    }
  };

  const handleInlineSubmit = async () => {
    if (!inlinePrompt.trim() || !editorRef.current) return;
    
    setIsInlineLoading(true);
    const sel = editorRef.current.getSelection();
    const model = editorRef.current.getModel();
    const selectedText = sel && model ? model.getValueInRange(sel) : "";
    
    // Fire off the inline edit command to the parent/orchestrator
    onSelectionChangeRef.current?.({
      path: activeTab?.path,
      name: activeTab?.name,
      selectedText,
      language: activeTab ? getLanguage(activeTab.name) : "plaintext",
      startLine: sel?.startLineNumber ?? 0,
      endLine: sel?.endLineNumber ?? 0,
    });
    
    // Simulate dispatching to AI
    dispatchCommand("ai.inlineEdit", { prompt: inlinePrompt, selectedText });
    
    setInlinePrompt("");
    setShowFloatingMenu(false);
    setIsInlineLoading(false);
  };

  const lastContentRef = useRef(activeTab?.content);

  useEffect(() => {
    if (!editorRef.current || !activeTab) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const currentContent = activeTab.content;
    if (currentContent !== undefined && currentContent !== lastContentRef.current) {
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

  // Handle AI Inline Diff Preview
  useEffect(() => {
    if (!editorRef.current || !activeTab) return;
    const editor = editorRef.current;
    
    // Clear previous decorations if any
    decoratorsRef.current = editor.deltaDecorations(decoratorsRef.current, []);

    if (!pendingEdit || pendingEdit.tabId !== activeTab.id) {
       return;
    }

    const model = editor.getModel();
    if (!model) return;

    // A simple line-by-line diff approximation to highlight proposed changes
    const origLines = pendingEdit.originalContent.split('\n');
    const propLines = pendingEdit.proposedContent.split('\n');
    const newDecorations: any[] = [];
    const monaco = (window as any).monaco;

    if (monaco) {
      for (let i = 0; i < propLines.length; i++) {
          if (i >= origLines.length || propLines[i] !== origLines[i]) {
              newDecorations.push({
                  range: new monaco.Range(i + 1, 1, i + 1, 1),
                  options: {
                      isWholeLine: true,
                      className: "ai-diff-added",
                      marginClassName: "ai-diff-added-margin"
                  }
              });
          }
      }
    }
    
    // If the model hasn't been updated to proposed content yet, do it now
    if (model.getValue() === pendingEdit.originalContent) {
        editor.executeEdits("ai-suggestion", [{
            range: model.getFullModelRange(),
            text: pendingEdit.proposedContent,
            forceMoveMarkers: true
        }]);
    }

    decoratorsRef.current = editor.deltaDecorations([], newDecorations);

    // Bind Tab and Esc for the inline diff
    const disposableTab = monaco ? editor.addCommand(monaco.KeyCode.Tab, () => {
        onAcceptEdit?.();
    }) : null;
    
    // On Escape, we must restore the original content inside the editor if they reject
    const disposableEsc = monaco ? editor.addCommand(monaco.KeyCode.Escape, () => {
        const curModel = editor.getModel();
        if (curModel) {
            editor.executeEdits("ai-suggestion", [{
                range: curModel.getFullModelRange(),
                text: pendingEdit.originalContent,
                forceMoveMarkers: true
            }]);
        }
        onRejectEdit?.();
    }) : null;

    return () => {
        disposableTab?.dispose();
        disposableEsc?.dispose();
    };
  }, [pendingEdit, activeTab, onAcceptEdit, onRejectEdit]);


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
      <div className="flex-1 ide-editor-surface flex items-center justify-center relative shadow-[inset_1px_0_0_hsl(var(--ide-border))]">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-ide-panel to-ide-sidebar border border-ide-border/80 flex items-center justify-center shadow-[0_0_40px_-12px_hsl(var(--ide-accent-blue))]">
            <span className="text-3xl opacity-90">⌘</span>
          </div>
          <h3 className="text-base font-semibold text-ide-text-primary mb-2 tracking-tight">No editor open</h3>
          <p className="text-sm text-ide-text-secondary leading-relaxed">
            Open a file from the explorer or create a new file to start.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 ide-editor-surface flex flex-col min-w-0 relative shadow-[inset_1px_0_0_hsl(var(--ide-border))]">
      {/* Tabs */}
      <div className="h-10 bg-gradient-to-b from-ide-sidebar to-[hsl(225_20%_9%)] flex items-center overflow-x-auto px-2 pt-1 border-b border-ide-border/60">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "h-full flex items-center gap-2 px-3 mx-0.5 rounded-t-md cursor-pointer group transition-all duration-200 border-b-[2px]",
              tab.isActive
                ? "bg-ide-bg/80 text-ide-text-primary border-ide-accent-blue shadow-[0_-8px_24px_-12px_hsl(var(--ide-accent-blue)/0.35)]"
                : "bg-transparent text-ide-text-secondary border-transparent hover:text-ide-text-primary hover:bg-ide-hover/40"
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
        <div className="h-7 bg-ide-bg flex items-center px-4 gap-2 text-[11px] text-ide-text-secondary select-none border-b border-ide-border/30">
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
          
          {/* AI Inline Diff Sticky Action Bar */}
          {pendingEdit && pendingEdit.tabId === activeTab.id && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-ide-panel/95 backdrop-blur-md border border-ide-accent/50 p-1.5 rounded-lg shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-200">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-ide-accent/10 rounded-md border border-ide-accent/20">
                <Sparkles className="w-4 h-4 text-ide-accent" />
                <span className="text-xs font-semibold text-ide-text-primary">AI Suggestion</span>
                <span className="text-xs text-ide-text-secondary ml-1 max-w-[150px] truncate">{pendingEdit.tabName}</span>
              </div>
              <div className="w-px h-5 bg-ide-border mx-1" />
              <button
                onClick={onAcceptEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-emerald-400 border border-green-500/20 rounded-md transition-colors text-xs font-medium min-w-[120px] justify-center"
              >
                <Check className="w-3.5 h-3.5" />
                Accept (Tab)
              </button>
              <button
                onClick={() => {
                  const editor = editorRef.current;
                  if (editor) {
                    const curModel = editor.getModel();
                    editor.executeEdits("ai-suggestion", [{
                        range: curModel.getFullModelRange(),
                        text: pendingEdit.originalContent,
                        forceMoveMarkers: true
                    }]);
                  }
                  onRejectEdit?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ide-hover hover:bg-ide-border text-ide-text-secondary border border-transparent hover:border-ide-border rounded-md transition-colors text-xs font-medium min-w-[120px] justify-center"
              >
                <X className="w-3.5 h-3.5" />
                Reject (Esc)
              </button>
            </div>
          )}

          {/* Floating Refactor Menu */}
          {pendingEdit && pendingEdit.tabId === activeTab.id ? (
            <div className="absolute inset-0 z-10 flex flex-col bg-ide-bg">
              <DiffPreview
                originalContent={pendingEdit.originalContent}
                modifiedContent={pendingEdit.proposedContent}
                onAccept={() => onAcceptEdit?.()}
                onReject={() => onRejectEdit?.()}
              />
            </div>
          ) : null}

          {showFloatingMenu && (
            <div 
              className="absolute z-20 bg-[#252526] border border-[#454545] rounded-md shadow-xl flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-200 min-w-[300px]"
              style={{ 
                top: Math.min(floatingMenuPos.top, window.innerHeight - 150), 
                left: Math.min(floatingMenuPos.left, window.innerWidth - 350) 
              }}
            >
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <input 
                  type="text"
                  placeholder="Ask AI to edit this code..."
                  value={inlinePrompt}
                  onChange={(e) => setInlinePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineSubmit();
                    if (e.key === 'Escape') setShowFloatingMenu(false);
                  }}
                  className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-500"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center justify-between border-t border-[#333] pt-1 px-1 mt-1">
                <button 
                  onClick={() => {
                    editorRef.current?.trigger('menu', 'editor.action.clipboardCopyAction', null);
                    setShowFloatingMenu(false);
                  }}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={handleInlineSubmit}
                  disabled={!inlinePrompt.trim() || isInlineLoading}
                  className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isInlineLoading ? <Circle className="w-3 h-3 animate-spin" /> : "Submit"}
                  <span className="text-[10px] text-indigo-200 ml-1">⏎</span>
                </button>
              </div>
            </div>
          )}
          <MonacoEditor
            height="100%"
            language={getLanguage(activeTab.name)}
            // Ensure path is treated as a URI for consistent model management across reloads
            path={activeTab.path ? `file:///${activeTab.path.replace(/\\/g, '/')}` : activeTab.name}
            value={activeTab.content || ""}
            theme={settings.theme === 'snowy-studio' ? "vs-light" : "stackflow-dark"}
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
