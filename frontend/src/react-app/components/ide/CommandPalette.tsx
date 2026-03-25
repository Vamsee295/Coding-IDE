import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent } from "@/react-app/components/ui/dialog";
import { ScrollArea } from "@/react-app/components/ui/scroll-area";
import { Search, TerminalSquare, FileIcon, Puzzle } from "lucide-react";
import { IdeCommandId, useIdeCommandListener, useIdeCommand } from "@/react-app/contexts/IdeCommandContext";
import { defaultKeymap } from "@/react-app/contexts/keymap";
import { FileItem } from "@/react-app/types/ide";
import { getExtensionCommands } from "@/services/extensionService";

// Helper to format shortcut strings nicely 
const formatShortcut = (commandId: IdeCommandId): string => {
    const binding = defaultKeymap.find(b => b.commandId === commandId);
    if (!binding) return "";
    const parts = [];
    if (binding.ctrlKey) parts.push("Ctrl");
    if (binding.shiftKey) parts.push("Shift");
    if (binding.altKey) parts.push("Alt");
    if (binding.metaKey) parts.push("Win/Cmd");
    parts.push(binding.key.toUpperCase());
    return parts.join("+");
};

// Global Command Registry mapped for the palette
const COMMAND_REGISTRY: { id: IdeCommandId; label: string; category: string }[] = [
    { id: "file.newFile", label: "New File", category: "File" },
    { id: "file.newWindow", label: "New Window", category: "File" },
    { id: "file.openFile", label: "Open File", category: "File" },
    { id: "file.openFolder", label: "Open Folder", category: "File" },
    { id: "file.save", label: "Save", category: "File" },
    { id: "file.saveAs", label: "Save As", category: "File" },
    { id: "file.saveAll", label: "Save All", category: "File" },
    { id: "file.autoSave", label: "Toggle Auto Save", category: "File" },
    { id: "file.preferences", label: "Preferences / Settings", category: "File" },
    { id: "file.revertFile", label: "Revert File", category: "File" },
    { id: "file.closeEditor", label: "Close Editor", category: "File" },
    { id: "file.closeWindow", label: "Close Window", category: "File" },
    { id: "file.exit", label: "Exit IDE", category: "File" },

    { id: "edit.undo", label: "Undo", category: "Edit" },
    { id: "edit.redo", label: "Redo", category: "Edit" },
    { id: "edit.cut", label: "Cut", category: "Edit" },
    { id: "edit.copy", label: "Copy", category: "Edit" },
    { id: "edit.paste", label: "Paste", category: "Edit" },
    { id: "edit.find", label: "Find", category: "Edit" },
    { id: "edit.replace", label: "Replace", category: "Edit" },
    { id: "edit.findInFiles", label: "Find in Files", category: "Edit" },
    { id: "edit.replaceInFiles", label: "Replace in Files", category: "Edit" },
    { id: "edit.toggleLineComment", label: "Toggle Line Comment", category: "Edit" },
    { id: "edit.toggleBlockComment", label: "Toggle Block Comment", category: "Edit" },

    { id: "selection.selectAll", label: "Select All", category: "Selection" },
    { id: "selection.expandSelection", label: "Expand Selection", category: "Selection" },
    { id: "selection.shrinkSelection", label: "Shrink Selection", category: "Selection" },
    { id: "selection.copyLineUp", label: "Copy Line Up", category: "Selection" },
    { id: "selection.copyLineDown", label: "Copy Line Down", category: "Selection" },
    { id: "selection.moveLineUp", label: "Move Line Up", category: "Selection" },
    { id: "selection.moveLineDown", label: "Move Line Down", category: "Selection" },
    { id: "selection.duplicateSelection", label: "Duplicate Selection", category: "Selection" },
    { id: "selection.addCursorAbove", label: "Add Cursor Above", category: "Selection" },
    { id: "selection.addCursorBelow", label: "Add Cursor Below", category: "Selection" },
    { id: "selection.addCursorsToLineEnds", label: "Add Cursors to Line Ends", category: "Selection" },
    { id: "selection.addNextOccurrence", label: "Add Next Occurrence", category: "Selection" },

    { id: "view.commandPalette", label: "Show Command Palette", category: "View" },
    { id: "view.explorer", label: "Toggle Explorer", category: "View" },
    { id: "view.search", label: "Toggle Search", category: "View" },
    { id: "view.aiAssistant", label: "Toggle AI Assistant Sidebar", category: "View" },
    { id: "view.extensions", label: "Toggle Extensions", category: "View" },
    { id: "view.scm", label: "Toggle Source Control", category: "View" },
    { id: "view.debug", label: "Toggle Debug Runner", category: "View" },
    { id: "view.terminal", label: "Toggle Terminal Panel", category: "View" },
    { id: "view.toggleAiChat", label: "Toggle AI Chat Panel", category: "View" },
    { id: "view.wordWrap", label: "Toggle Word Wrap", category: "View" },

    { id: "go.back", label: "Back", category: "Go" },
    { id: "go.forward", label: "Forward", category: "Go" },
    { id: "go.lastEditLocation", label: "Last Edit Location", category: "Go" },
    { id: "go.switchEditor", label: "Switch Editor", category: "Go" },
    { id: "go.switchGroup", label: "Switch Group", category: "Go" },
    { id: "go.goToFile", label: "Go to File", category: "Go" },
    { id: "go.goToSymbolInWorkspace", label: "Go to Symbol in Workspace", category: "Go" },
    { id: "go.goToSymbolInEditor", label: "Go to Symbol in Editor", category: "Go" },
    { id: "go.goToDefinition", label: "Go to Definition", category: "Go" },
    { id: "go.goToDeclaration", label: "Go to Declaration", category: "Go" },
    { id: "go.goToTypeDefinition", label: "Go to Type Definition", category: "Go" },
    { id: "go.goToImplementation", label: "Go to Implementation", category: "Go" },
    { id: "go.goToReferences", label: "Go to References", category: "Go" },
    { id: "go.goToLine", label: "Go to Line", category: "Go" },
    { id: "go.goToBracket", label: "Go to Bracket", category: "Go" },
    { id: "go.nextProblem", label: "Next Problem", category: "Go" },
    { id: "go.previousProblem", label: "Previous Problem", category: "Go" },
    { id: "go.nextChange", label: "Next Change", category: "Go" },
    { id: "go.previousChange", label: "Previous Change", category: "Go" },

    { id: "run.startDebugging", label: "Start Debugging", category: "Run" },
    { id: "run.runWithoutDebugging", label: "Run Without Debugging", category: "Run" },
    { id: "run.stopDebugging", label: "Stop Debugging", category: "Run" },
    { id: "run.restartDebugging", label: "Restart Debugging", category: "Run" },
    { id: "run.openConfigurations", label: "Open Configurations", category: "Run" },
    { id: "run.addConfiguration", label: "Add Configuration", category: "Run" },
    { id: "run.stepOver", label: "Step Over", category: "Run" },
    { id: "run.stepInto", label: "Step Into", category: "Run" },
    { id: "run.stepOut", label: "Step Out", category: "Run" },
    { id: "run.continue", label: "Continue", category: "Run" },
    { id: "run.toggleBreakpoint", label: "Toggle Breakpoint", category: "Run" },
    { id: "run.addConditionalBreakpoint", label: "Add Conditional Breakpoint", category: "Run" },
    { id: "run.enableAllBreakpoints", label: "Enable All Breakpoints", category: "Run" },
    { id: "run.disableAllBreakpoints", label: "Disable All Breakpoints", category: "Run" },
    { id: "run.removeAllBreakpoints", label: "Remove All Breakpoints", category: "Run" },
    { id: "run.installDebuggers", label: "Install Additional Debuggers", category: "Run" },

    { id: "terminal.newTerminal", label: "New Terminal", category: "Terminal" },
    { id: "terminal.splitTerminal", label: "Split Terminal", category: "Terminal" },
    { id: "terminal.killTerminal", label: "Kill Terminal", category: "Terminal" },
    { id: "terminal.clearTerminal", label: "Clear Terminal", category: "Terminal" },
    { id: "terminal.runTask", label: "Run Task", category: "Terminal" },
    { id: "terminal.runBuildTask", label: "Run Build Task", category: "Terminal" },
    { id: "terminal.runActiveFile", label: "Run Active File", category: "Terminal" },

    { id: "help.documentation", label: "Documentation", category: "Help" },
    { id: "help.welcome", label: "Welcome", category: "Help" },
    { id: "help.releaseNotes", label: "Release Notes", category: "Help" },
    { id: "help.keyboardShortcuts", label: "Keyboard Shortcuts Reference", category: "Help" },
    { id: "help.videoTutorials", label: "Video Tutorials", category: "Help" },
    { id: "help.reportIssue", label: "Report Issue", category: "Help" },
    { id: "help.searchFeatureRequests", label: "Search Feature Requests", category: "Help" },
    { id: "help.viewLicense", label: "View License", category: "Help" },
    { id: "help.privacyStatement", label: "Privacy Statement", category: "Help" },
    { id: "help.toggleDevTools", label: "Toggle Developer Tools", category: "Help" },
    { id: "help.showCommands", label: "Show Commands", category: "Help" },
    { id: "help.processExplorer", label: "Open Process Explorer", category: "Help" },
    { id: "help.checkUpdates", label: "Check for Updates...", category: "Help" },
    { id: "help.about", label: "About", category: "Help" },
];

interface CommandPaletteProps {
    files: FileItem[];
    onOpenFile: (file: FileItem) => void;
}

export default function CommandPalette({ files, onOpenFile }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { dispatchCommand } = useIdeCommand();

    // Open Handlers
    useIdeCommandListener("view.commandPalette", () => {
        setQuery("> ");
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    });

    useIdeCommandListener("go.goToFile", () => {
        setQuery("");
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    });

    const isCommandMode = query.startsWith(">");
    const cleanQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : query.toLowerCase();

    // Flatten the files tree for searching
    const flattenedFiles = useMemo(() => {
        const flatten = (items: FileItem[]): FileItem[] => {
            let result: FileItem[] = [];
            for (const item of items) {
                if (item.type === "file") {
                    result.push(item);
                } else if (item.children) {
                    result = result.concat(flatten(item.children));
                }
            }
            return result;
        };
        return flatten(files);
    }, [files]);

    const filteredResults = useMemo(() => {
        if (isCommandMode) {
            // Merge built-in commands with dynamically injected extension commands
            const extensionCmds = getExtensionCommands().map(c => ({
                id: c.id as IdeCommandId,
                label: c.title,
                category: "Extension"
            }));
            const allCmds = [...COMMAND_REGISTRY, ...extensionCmds];
            if (!cleanQuery) return allCmds;
            return allCmds.filter(cmd =>
                cmd.label.toLowerCase().includes(cleanQuery) ||
                cmd.category.toLowerCase().includes(cleanQuery)
            );
        } else {
            if (!cleanQuery) return flattenedFiles.slice(0, 50); // Show recent or top 50 if empty
            return flattenedFiles.filter(f =>
                f.name.toLowerCase().includes(cleanQuery) ||
                (f.path && f.path.toLowerCase().includes(cleanQuery))
            ).slice(0, 50); // Cap for performance
        }
    }, [isCommandMode, cleanQuery, flattenedFiles]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [cleanQuery, isCommandMode]);

    const handleSelect = (item: any) => {
        setOpen(false);
        if (isCommandMode) {
            dispatchCommand(item.id);
        } else {
            onOpenFile(item as FileItem);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredResults.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredResults[selectedIndex]) {
                handleSelect(filteredResults[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    };

    // Auto-scroll to selected index
    useEffect(() => {
        if (scrollRef.current) {
            const selectedEl = scrollRef.current.querySelector('[data-selected="true"]') as HTMLElement;
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex, filteredResults]);

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[600px] p-0 top-[20%] translate-y-0 translate-x-[-50%] bg-ide-sidebar border-ide-border shadow-2xl flex flex-col overflow-hidden !rounded-xl">
                <div className="flex items-center px-4 py-3 border-b border-ide-border bg-ide-editor/50">
                    <Search className="w-4 h-4 text-ide-text-secondary mr-3 shrink-0" />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent outline-none text-ide-text-primary text-sm placeholder:text-ide-text-secondary/50"
                        placeholder={isCommandMode ? "Type a command..." : "Type a file name or path to open..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {isCommandMode && (
                        <div className="text-[10px] text-ide-text-secondary font-medium ml-2 uppercase truncate max-w-24">Command Mode</div>
                    )}
                </div>

                <ScrollArea className="max-h-[300px] overflow-y-auto" ref={scrollRef}>
                    {filteredResults.length === 0 ? (
                        <div className="py-6 text-center text-sm text-ide-text-secondary">
                            No results found.
                        </div>
                    ) : (
                        <div className="py-2">
                            {filteredResults.map((item, index) => {
                                const isSelected = index === selectedIndex;

                                if (isCommandMode) {
                                    const cmd = item as typeof COMMAND_REGISTRY[0];
                                    const shortcut = formatShortcut(cmd.id);
                                    const isExtension = cmd.category === 'Extension';
                                    return (
                                        <div
                                            key={cmd.id}
                                            data-selected={isSelected}
                                            className={`flex items-center justify-between px-4 py-2 cursor-pointer text-sm ${isSelected ? 'bg-indigo-500/10 text-ide-text-primary' : 'text-ide-text-secondary hover:bg-ide-hover'}`}
                                            onClick={() => handleSelect(cmd)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExtension
                                                    ? <Puzzle className="w-4 h-4 opacity-70 text-purple-400" />
                                                    : <TerminalSquare className="w-4 h-4 opacity-70" />
                                                }
                                                <div>
                                                    <span>{cmd.label}</span>
                                                    <span className={`ml-3 text-xs opacity-50 ${isExtension ? 'text-purple-400' : ''}`}>{cmd.category}</span>
                                                </div>
                                            </div>
                                            {shortcut && (
                                                <div className="text-xs bg-ide-editor/80 px-1.5 py-0.5 rounded opacity-60">
                                                    {shortcut}
                                                </div>
                                            )}
                                        </div>
                                    );
                                } else {
                                    const file = item as FileItem;
                                    return (
                                        <div
                                            key={file.id}
                                            data-selected={isSelected}
                                            className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm ${isSelected ? 'bg-indigo-500/10 text-ide-text-primary' : 'text-ide-text-secondary hover:bg-ide-hover'}`}
                                            onClick={() => handleSelect(file)}
                                        >
                                            <FileIcon className="w-4 h-4 opacity-70" />
                                            <div>
                                                <span>{file.name}</span>
                                                {file.path && (
                                                    <div className="text-xs opacity-50 -mt-0.5 truncate max-w-[400px]">
                                                        {file.path}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    )}
                </ScrollArea>
                <div className="px-4 py-2 border-t border-ide-border bg-ide-editor/30 text-xs text-ide-text-secondary flex justify-between items-center flex-wrap gap-2">
                    <span><strong>↑/↓</strong> to navigate</span>
                    <span><strong>Enter</strong> to select</span>
                    <span><strong>Esc</strong> to close</span>
                    <span>Type <strong>{`>`}</strong> for commands</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
