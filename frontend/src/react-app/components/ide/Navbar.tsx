import {
    Search,
    Settings,
    Download,
    Maximize2,
    X,
    Minimize2,
    User,
    Bell,
    Cpu,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from "@/react-app/components/ui/dropdown-menu";
import { useSettings } from "@/react-app/contexts/SettingsContext"; // Added for settings dialog
import { IdeCommandId, useIdeCommand } from "@/react-app/contexts/IdeCommandContext";

interface NavbarProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}

type MenuItemDef =
    | { type: "separator" }
    | { type: "item"; label: string; shortcut?: string; commandId?: IdeCommandId; disabled?: boolean }
    | { type: "submenu"; label: string; items: MenuItemDef[] };

interface MenuDef {
    name: string;
    items: MenuItemDef[];
}

const ideMenus: MenuDef[] = [
    {
        name: "File",
        items: [
            { type: "item", label: "New Text File", shortcut: "Ctrl+N", commandId: "file.newTextFile" },
            { type: "item", label: "New File...", shortcut: "Ctrl+Alt+Windows+N", commandId: "file.newFile" },
            { type: "item", label: "New Window", shortcut: "Ctrl+Shift+N", commandId: "file.newWindow" },
            { type: "submenu", label: "New Window with Profile", items: [] },
            { type: "separator" },
            { type: "item", label: "Open File...", shortcut: "Ctrl+O", commandId: "file.openFile" },
            { type: "item", label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O", commandId: "file.openFolder" },
            { type: "item", label: "Open Local Folder...", shortcut: "Ctrl+Shift+O", commandId: "file.openLocalPath" },
            { type: "submenu", label: "Open Recent", items: [] },
            { type: "separator" },
            { type: "item", label: "Add Folder to Workspace..." },
            { type: "item", label: "Save Workspace As..." },
            { type: "item", label: "Duplicate Workspace..." },
            { type: "separator" },
            { type: "item", label: "Save", shortcut: "Ctrl+S", commandId: "file.save" },
            { type: "item", label: "Save As...", shortcut: "Ctrl+Shift+S", commandId: "file.saveAs" },
            { type: "item", label: "Save All", shortcut: "Ctrl+K S", commandId: "file.saveAll" },
            { type: "separator" },
            { type: "submenu", label: "Share", items: [] },
            { type: "separator" },
            { type: "item", label: "Auto Save", commandId: "file.autoSave" },
            { type: "item", label: "Preferences", commandId: "file.preferences" },
            { type: "separator" },
            { type: "item", label: "Revert File" },
            { type: "item", label: "Close Editor", shortcut: "Ctrl+F4", commandId: "file.closeEditor" },
            { type: "item", label: "Close Folder", shortcut: "Ctrl+K F", commandId: "file.closeFolder" },
            { type: "item", label: "Close Window", shortcut: "Alt+F4", commandId: "file.closeWindow" },
            { type: "separator" },
            { type: "item", label: "Exit", commandId: "file.exit" }
        ]
    },
    {
        name: "Edit",
        items: [
            { type: "item", label: "Undo", shortcut: "Ctrl+Z", commandId: "edit.undo" },
            { type: "item", label: "Redo", shortcut: "Ctrl+Y", commandId: "edit.redo" },
            { type: "separator" },
            { type: "item", label: "Cut", shortcut: "Ctrl+X", commandId: "edit.cut" },
            { type: "item", label: "Copy", shortcut: "Ctrl+C", commandId: "edit.copy" },
            { type: "item", label: "Paste", shortcut: "Ctrl+V", commandId: "edit.paste" },
            { type: "separator" },
            { type: "item", label: "Find", shortcut: "Ctrl+F", commandId: "edit.find" },
            { type: "item", label: "Replace", shortcut: "Ctrl+H", commandId: "edit.replace" },
            { type: "separator" },
            { type: "item", label: "Find in Files", shortcut: "Ctrl+Shift+F", commandId: "edit.findInFiles" },
            { type: "item", label: "Replace in Files", shortcut: "Ctrl+Shift+H", commandId: "edit.replaceInFiles" },
            { type: "separator" },
            { type: "item", label: "Toggle Line Comment", shortcut: "Ctrl+/", commandId: "edit.toggleLineComment" },
            { type: "item", label: "Toggle Block Comment", shortcut: "Shift+Alt+A", commandId: "edit.toggleBlockComment" }
        ]
    },
    {
        name: "Selection",
        items: [
            { type: "item", label: "Select All", shortcut: "Ctrl+A", commandId: "selection.selectAll" },
            { type: "item", label: "Expand Selection", shortcut: "Shift+Alt+RightArrow", commandId: "selection.expandSelection" },
            { type: "item", label: "Shrink Selection", shortcut: "Shift+Alt+LeftArrow", commandId: "selection.shrinkSelection" },
            { type: "separator" },
            { type: "item", label: "Copy Line Up", shortcut: "Shift+Alt+UpArrow", commandId: "selection.copyLineUp" },
            { type: "item", label: "Copy Line Down", shortcut: "Shift+Alt+DownArrow", commandId: "selection.copyLineDown" },
            { type: "item", label: "Move Line Up", shortcut: "Alt+UpArrow", commandId: "selection.moveLineUp" },
            { type: "item", label: "Move Line Down", shortcut: "Alt+DownArrow", commandId: "selection.moveLineDown" },
            { type: "item", label: "Duplicate Selection", commandId: "selection.duplicateSelection" },
            { type: "separator" },
            { type: "item", label: "Add Cursor Above", shortcut: "Ctrl+Alt+UpArrow" },
            { type: "item", label: "Add Cursor Below", shortcut: "Ctrl+Alt+DownArrow" },
            { type: "item", label: "Add Cursors to Line Ends", shortcut: "Shift+Alt+I" },
            { type: "item", label: "Add Next Occurrence", shortcut: "Ctrl+D" }
        ]
    },
    {
        name: "View",
        items: [
            { type: "item", label: "Command Palette...", shortcut: "Ctrl+Shift+P", commandId: "view.commandPalette" },
            { type: "separator" },
            { type: "item", label: "Explorer", shortcut: "Ctrl+Shift+E", commandId: "view.explorer" },
            { type: "item", label: "Search", shortcut: "Ctrl+Shift+F", commandId: "view.search" },
            { type: "item", label: "Extensions", shortcut: "Ctrl+Shift+X", commandId: "view.extensions" },
            { type: "separator" },
            { type: "item", label: "Terminal", shortcut: "Ctrl+`", commandId: "view.terminal" },
            { type: "separator" },
            { type: "item", label: "Word Wrap", shortcut: "Alt+Z", commandId: "view.wordWrap" }
        ]
    },
    {
        name: "Go",
        items: [
            { type: "item", label: "Go to File...", shortcut: "Ctrl+P", commandId: "go.goToFile" },
            { type: "item", label: "Go to Symbol in Workspace...", shortcut: "Ctrl+T", commandId: "go.goToSymbol" },
            { type: "item", label: "Go to Symbol in Editor...", shortcut: "Ctrl+Shift+O", commandId: "go.goToSymbol" },
            { type: "separator" },
            { type: "item", label: "Go to Definition", shortcut: "F12", commandId: "go.goToDefinition" },
            { type: "separator" },
            { type: "item", label: "Go to Line/Column...", shortcut: "Ctrl+G", commandId: "go.goToLine" }
        ]
    },
    {
        name: "Run",
        items: [
            { type: "item", label: "Start Debugging", shortcut: "F5", commandId: "run.startDebugging" },
            { type: "item", label: "Run Without Debugging", shortcut: "Ctrl+F5", commandId: "run.runWithoutDebugging" },
            { type: "item", label: "Stop Debugging", shortcut: "Shift+F5", commandId: "run.stopDebugging", disabled: true },
            { type: "item", label: "Restart Debugging", shortcut: "Ctrl+Shift+F5", commandId: "run.restartDebugging", disabled: true },
            { type: "separator" },
            { type: "item", label: "Open Configurations", commandId: "run.openConfigurations" },
            { type: "item", label: "Add Configuration...", commandId: "run.addConfiguration" },
            { type: "separator" },
            { type: "item", label: "Step Over", shortcut: "F10", commandId: "run.stepOver", disabled: true },
            { type: "item", label: "Step Into", shortcut: "F11", commandId: "run.stepInto", disabled: true },
            { type: "item", label: "Step Out", shortcut: "Shift+F11", commandId: "run.stepOut", disabled: true },
            { type: "item", label: "Continue", shortcut: "F5", commandId: "run.continue", disabled: true },
            { type: "separator" },
            { type: "item", label: "Toggle Breakpoint", shortcut: "F9", commandId: "run.toggleBreakpoint" },
            { type: "submenu", label: "New Breakpoint", items: [] },
            { type: "separator" },
            { type: "item", label: "Enable All Breakpoints", commandId: "run.enableAllBreakpoints" },
            { type: "item", label: "Disable All Breakpoints", commandId: "run.disableAllBreakpoints" },
            { type: "item", label: "Remove All Breakpoints", commandId: "run.removeAllBreakpoints" },
            { type: "separator" },
            { type: "item", label: "Install Additional Debuggers...", commandId: "run.installDebuggers" }
        ]
    },
    {
        name: "Terminal",
        items: [
            { type: "item", label: "New Terminal", shortcut: "Ctrl+Shift+`", commandId: "terminal.newTerminal" },
            { type: "item", label: "Split Terminal", shortcut: "Ctrl+Shift+5", commandId: "terminal.splitTerminal" },
            { type: "item", label: "New Terminal Window", shortcut: "Ctrl+Shift+Alt+`", commandId: "terminal.newTerminalWindow" },
            { type: "separator" },
            { type: "item", label: "Run Task...", commandId: "terminal.runTask" },
            { type: "item", label: "Run Build Task...", shortcut: "Ctrl+Shift+B", commandId: "terminal.runBuildTask" },
            { type: "item", label: "Run Active File", commandId: "terminal.runActiveFile" },
            { type: "item", label: "Run Selected Text", commandId: "terminal.runSelectedText" },
            { type: "separator" },
            { type: "item", label: "Show Running Tasks...", commandId: "terminal.runTask" },
            { type: "item", label: "Restart Running Task...", commandId: "terminal.runTask" },
            { type: "item", label: "Terminate Task...", commandId: "terminal.runTask" },
            { type: "separator" },
            { type: "item", label: "Configure Tasks...", commandId: "terminal.configureTasks" },
            { type: "item", label: "Configure Default Build Task...", commandId: "terminal.configureTasks" }
        ]
    },
    {
        name: "Help",
        items: [
            { type: "item", label: "Welcome", commandId: "help.welcome" },
            { type: "item", label: "Show All Commands", shortcut: "Ctrl+Shift+P", commandId: "help.showCommands" },
            { type: "item", label: "Editor Playground", commandId: "help.playground" },
            { type: "item", label: "Open Walkthrough...", commandId: "help.walkthrough" },
            { type: "separator" },
            { type: "item", label: "View License", commandId: "help.viewLicense" },
            { type: "separator" },
            { type: "item", label: "Toggle Developer Tools", commandId: "help.toggleDevTools" },
            { type: "item", label: "Open Process Explorer", commandId: "help.processExplorer" },
            { type: "separator" },
            { type: "item", label: "Check for Updates...", commandId: "help.checkUpdates" },
            { type: "separator" },
            { type: "item", label: "About", commandId: "help.about" }
        ]
    }
];

const models = [
    { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B" },
    { id: "qwen2.5-coder:14b", name: "Qwen 2.5 Coder 14B" },
    { id: "codellama:7b", name: "Code Llama 7B" },
    { id: "deepseek-coder:6.7b", name: "DeepSeek Coder" },
];

function renderMenuItem(item: MenuItemDef, index: number, dispatchMethod: (id: IdeCommandId) => void) {
    if (item.type === "separator") {
        return <DropdownMenuSeparator key={`sep-${index}`} />;
    }
    if (item.type === "submenu") {
        return (
            <DropdownMenuSub key={`sub-${index}-${item.label}`}>
                <DropdownMenuSubTrigger className="text-xs text-ide-text-primary focus:bg-ide-hover data-[state=open]:bg-ide-hover cursor-pointer py-1.5 focus:text-white data-[state=open]:text-white">
                    {item.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-ide-sidebar border-ide-border min-w-[200px] shadow-xl ml-2">
                    {item.items.length === 0 ? (
                        <div className="text-xs text-ide-text-secondary px-3 py-1.5 italic">None available</div>
                    ) : (
                        item.items.map((subItem, subIndex) => renderMenuItem(subItem, subIndex, dispatchMethod))
                    )}
                </DropdownMenuSubContent>
            </DropdownMenuSub>
        );
    }
    return (
        <DropdownMenuItem
            key={`item-${index}-${item.label}`}
            className="text-xs text-ide-text-primary hover:bg-ide-hover focus:bg-ide-hover cursor-pointer py-1.5 focus:text-white"
            disabled={item.disabled}
            onClick={() => item.commandId && dispatchMethod(item.commandId)}
        >
            {item.label}
            {item.shortcut && <DropdownMenuShortcut className="text-ide-text-secondary">{item.shortcut}</DropdownMenuShortcut>}
        </DropdownMenuItem>
    );
}

export default function Navbar({ selectedModel, onModelChange }: NavbarProps) {
    const currentModel = models.find((m) => m.id === selectedModel) || models[0];
    const { setIsSettingsOpen } = useSettings(); // Use context to toggle SettingsView
    const { dispatchCommand } = useIdeCommand();

    return (
        <header className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center shrink-0">
            {/* Left - Menu Items */}
            <div className="flex items-center h-full">
                {ideMenus.map((menu) => (
                    <DropdownMenu key={menu.name}>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="px-3 h-full text-xs text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover transition-colors focus:outline-none focus:bg-ide-hover focus:text-white"
                            >
                                {menu.name}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="min-w-[240px] bg-ide-sidebar border-ide-border shadow-2xl mt-1.5"
                            align="start"
                        >
                            {menu.items.map((item, idx) => renderMenuItem(item, idx, dispatchCommand))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ))}
            </div>

            {/* Center - Title */}
            <div className="flex-1 flex items-center justify-center pointer-events-none">
                <span className="text-xs text-ide-text-secondary font-medium">
                    Ollama IDE - Local AI Code Editor
                </span>
            </div>

            {/* Right - Actions & Model Selector */}
            <div className="flex items-center gap-1 px-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1.5 text-xs text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                        >
                            <Cpu className="w-3.5 h-3.5" />
                            {currentModel.name}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[180px] bg-ide-sidebar border-ide-border shadow-xl mt-1" align="end">
                        {models.map((model) => (
                            <DropdownMenuItem
                                key={model.id}
                                onClick={() => onModelChange(model.id)}
                                className={`text-xs cursor-pointer py-1.5 ${model.id === selectedModel
                                    ? "bg-ide-active text-ide-text-primary"
                                    : "text-ide-text-primary hover:bg-ide-hover focus:bg-ide-hover focus:text-white"
                                    }`}
                            >
                                {model.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-4 bg-ide-border mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => alert("No new notifications")}
                    className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                >
                    <Bell className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => alert("Search functionality coming soon")}
                    className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                >
                    <Search className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => alert("Downloading workspace...")}
                    className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                >
                    <Download className="w-4 h-4" />
                </Button>
                {/* SETTINGS BUTTON OPEN TRIGGERS THE CONTEXT STATE */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                >
                    <Settings className="w-4 h-4" />
                </Button>

                <div className="w-px h-4 bg-ide-border mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => alert("User profile coming soon")}
                    className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                >
                    <User className="w-4 h-4" />
                </Button>

                <div className="w-px h-4 bg-ide-border mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        if (document.fullscreenElement) {
                            document.exitFullscreen().catch(console.error);
                        }
                    }}
                    className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                >
                    <Minimize2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(console.error);
                        }
                    }}
                    className="h-7 w-7 text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover focus-visible:ring-0"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        if (confirm("Are you sure you want to exit the IDE?")) {
                            window.close();
                            // Fallback if window.close() is blocked
                            document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;background:#0f111a;color:#fff;font-family:sans-serif;'>IDE Closed. You can close this tab.</div>";
                        }
                    }}
                    className="h-7 w-7 text-ide-text-secondary hover:text-red-400 hover:bg-ide-hover focus-visible:ring-0"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </header>
    );
}
