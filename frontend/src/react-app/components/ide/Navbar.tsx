import { useEffect, useState } from "react";
import {
    Search,
    Settings,
    Maximize2,
    X,
    Minimize2,
    User,
    Bell,
    Sparkles,
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
import { getTranslation } from "@/react-app/lib/i18n";
import { useChatStore } from "@/react-app/store/useChatStore";

interface NavbarProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}

// Dynamic model list is now managed in useChatStore

type MenuItemDef =
    | { type: "separator" }
    | { type: "item"; label: string; shortcut?: string; commandId?: IdeCommandId; disabled?: boolean; onClick?: () => void }
    | { type: "submenu"; label: string; items: MenuItemDef[] };

interface MenuDef {
    name: string;
    items: MenuItemDef[];
}

function renderMenuItem(item: MenuItemDef, index: number, dispatchMethod: (id: IdeCommandId, payload?: any) => void) {
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
            onClick={() => {
                if (item.onClick) {
                    item.onClick();
                } else if (item.commandId) {
                    dispatchMethod(item.commandId);
                }
            }}
        >
            {item.label}
            {item.shortcut && <DropdownMenuShortcut className="text-ide-text-secondary">{item.shortcut}</DropdownMenuShortcut>}
        </DropdownMenuItem>
    );
}

export default function Navbar({ selectedModel, onModelChange }: NavbarProps) {
    const { availableModels: models } = useChatStore();
    const currentModel = models.find((m) => m.value === selectedModel) || models[0] || { label: 'None', value: 'none' };
    const { settings, setIsSettingsOpen } = useSettings(); // Use context to toggle SettingsView and read autoSave
    const { dispatchCommand } = useIdeCommand();
    const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([]);

    const t = (key: string) => getTranslation(settings.language, key);

    useEffect(() => {
        try {
            const history = localStorage.getItem("ide-recent-workspaces");
            if (history) {
                setRecentWorkspaces(JSON.parse(history));
            }
        } catch (e) { }
    }, []);

    // Reconstruct the Menu array dynamically to parse states
    const ideMenus: MenuDef[] = [
        {
            name: t("menu.file"),
            items: [
                { type: "item", label: t("menu.file.newTextFile"), shortcut: "Ctrl+N", commandId: "file.newTextFile" },
                { type: "item", label: t("menu.file.newFile"), shortcut: "Ctrl+Alt+Windows+N", commandId: "file.newFile" },
                { type: "item", label: t("menu.file.newWindow"), shortcut: "Ctrl+Shift+N", commandId: "file.newWindow" },
                { type: "submenu", label: t("menu.file.newWindowProfile"), items: [] },
                { type: "separator" },
                { type: "item", label: t("menu.file.openFile"), shortcut: "Ctrl+O", commandId: "file.openFile" },
                { type: "item", label: t("menu.file.openFolder"), shortcut: "Ctrl+K+O", commandId: "file.openFolder" },
                { type: "item", label: t("menu.file.openLocalFolder"), shortcut: "Ctrl+Shift+O", commandId: "file.openLocalPath" },
                {
                    type: "submenu", label: t("menu.file.openRecent"), items: recentWorkspaces.map((path: string) => ({
                        type: "item",
                        label: path,
                        onClick: () => dispatchCommand("file.openRecent", path)
                    }))
                },
                { type: "separator" },
                { type: "item", label: t("menu.file.addFolderToWorkspace"), commandId: "file.addFolderToWorkspace" },
                { type: "item", label: t("menu.file.saveWorkspaceAs"), commandId: "file.saveWorkspaceAs" },
                { type: "item", label: t("menu.file.duplicateWorkspace"), commandId: "file.duplicateWorkspace" },
                { type: "separator" },
                { type: "item", label: t("menu.file.save"), shortcut: "Ctrl+S", commandId: "file.save" },
                { type: "item", label: t("menu.file.saveAs"), shortcut: "Ctrl+Shift+S", commandId: "file.saveAs" },
                { type: "item", label: t("menu.file.saveAll"), shortcut: "Ctrl+K S", commandId: "file.saveAll" },
                { type: "separator" },
                { type: "submenu", label: t("menu.file.share"), items: [] },
                { type: "separator" },
                { type: "item", label: `${t("settings.label.autoSave")} ${settings.autoSave ? "✓" : ""}`, commandId: "file.autoSave" },
                { type: "item", label: t("menu.file.preferences"), commandId: "file.preferences" },
                { type: "separator" },
                { type: "item", label: t("menu.file.revertFile"), commandId: "file.revertFile" },
                { type: "item", label: t("menu.file.closeEditor"), shortcut: "Ctrl+F4", commandId: "file.closeEditor" },
                { type: "item", label: t("menu.file.closeFolder"), shortcut: "Ctrl+K F", commandId: "file.closeFolder" },
                { type: "item", label: t("menu.file.closeWindow"), shortcut: "Alt+F4", commandId: "file.closeWindow" },
                { type: "separator" },
                { type: "item", label: t("menu.file.exit"), commandId: "file.exit" }
            ]
        },
        {
            name: t("menu.edit"),
            items: [
                { type: "item", label: t("menu.edit.undo"), shortcut: "Ctrl+Z", commandId: "edit.undo" },
                { type: "item", label: t("menu.edit.redo"), shortcut: "Ctrl+Y", commandId: "edit.redo" },
                { type: "separator" },
                { type: "item", label: t("menu.edit.cut"), shortcut: "Ctrl+X", commandId: "edit.cut" },
                { type: "item", label: t("menu.edit.copy"), shortcut: "Ctrl+C", commandId: "edit.copy" },
                { type: "item", label: t("menu.edit.paste"), shortcut: "Ctrl+V", commandId: "edit.paste" },
                { type: "separator" },
                { type: "item", label: t("menu.edit.find"), shortcut: "Ctrl+F", commandId: "edit.find" },
                { type: "item", label: t("menu.edit.replace"), shortcut: "Ctrl+H", commandId: "edit.replace" },
                { type: "separator" },
                { type: "item", label: t("menu.edit.toggleLineComment"), shortcut: "Ctrl+/", commandId: "edit.toggleLineComment" },
                { type: "item", label: t("menu.edit.toggleBlockComment"), shortcut: "Shift+Alt+A", commandId: "edit.toggleBlockComment" }
            ]
        },
        {
            name: t("menu.selection"),
            items: [
                { type: "item", label: t("menu.selection.selectAll"), shortcut: "Ctrl+A", commandId: "selection.selectAll" },
                { type: "item", label: t("menu.selection.expandSelection"), shortcut: "Shift+Alt+RightArrow", commandId: "selection.expandSelection" },
                { type: "item", label: t("menu.selection.shrinkSelection"), shortcut: "Shift+Alt+LeftArrow", commandId: "selection.shrinkSelection" },
                { type: "separator" },
                { type: "item", label: t("menu.selection.copyLineUp"), shortcut: "Shift+Alt+UpArrow", commandId: "selection.copyLineUp" },
                { type: "item", label: t("menu.selection.copyLineDown"), shortcut: "Shift+Alt+DownArrow", commandId: "selection.copyLineDown" },
                { type: "item", label: t("menu.selection.moveLineUp"), shortcut: "Alt+UpArrow", commandId: "selection.moveLineUp" },
                { type: "item", label: t("menu.selection.moveLineDown"), shortcut: "Alt+DownArrow", commandId: "selection.moveLineDown" },
                { type: "item", label: t("menu.selection.duplicateSelection"), commandId: "selection.duplicateSelection" },
                { type: "separator" },
                { type: "item", label: t("menu.selection.addCursorAbove"), shortcut: "Ctrl+Alt+UpArrow", commandId: "selection.addCursorAbove" },
                { type: "item", label: t("menu.selection.addCursorBelow"), shortcut: "Ctrl+Alt+DownArrow", commandId: "selection.addCursorBelow" },
                { type: "item", label: t("menu.selection.addCursorsToLineEnds"), shortcut: "Shift+Alt+I", commandId: "selection.addCursorsToLineEnds" },
                { type: "item", label: t("menu.selection.addNextOccurrence"), shortcut: "Ctrl+D", commandId: "selection.addNextOccurrence" }
            ]
        },
        {
            name: t("menu.view"),
            items: [
                { type: "item", label: t("menu.view.commandPalette"), shortcut: "Ctrl+Shift+P", commandId: "view.commandPalette" },
                { type: "separator" },
                { type: "item", label: t("menu.view.explorer"), shortcut: "Ctrl+Shift+E", commandId: "view.explorer" },
                { type: "item", label: t("menu.view.search"), shortcut: "Ctrl+Shift+F", commandId: "view.search" },
                { type: "item", label: t("menu.view.extensions"), shortcut: "Ctrl+Shift+X", commandId: "view.extensions" },
                { type: "separator" },
                { type: "item", label: t("menu.view.aiChat"), commandId: "view.toggleAiChat" },
                { type: "item", label: t("menu.view.terminal"), shortcut: "Ctrl+`", commandId: "view.terminal" },
                { type: "separator" },
                { type: "item", label: t("settings.label.wordWrap"), shortcut: "Alt+Z", commandId: "view.wordWrap" }
            ]
        },
        {
            name: t("menu.go"),
            items: [
                { type: "item", label: t("menu.go.back"), shortcut: "Alt+LeftArrow", commandId: "go.back" },
                { type: "item", label: t("menu.go.forward"), shortcut: "Alt+RightArrow", commandId: "go.forward" },
                { type: "item", label: t("menu.go.lastEditLocation"), shortcut: "Ctrl+K Ctrl+Q", commandId: "go.lastEditLocation" },
                { type: "separator" },
                { type: "item", label: t("menu.go.switchEditor"), shortcut: "Ctrl+Tab", commandId: "go.switchEditor" },
                { type: "item", label: t("menu.go.switchGroup"), shortcut: "Ctrl+1", commandId: "go.switchGroup" },
                { type: "separator" },
                { type: "item", label: t("menu.go.goToFile"), shortcut: "Ctrl+P", commandId: "go.goToFile" },
                { type: "item", label: t("menu.go.goToSymbolInWorkspace"), shortcut: "Ctrl+T", commandId: "go.goToSymbolInWorkspace" },
                { type: "item", label: t("menu.go.goToSymbolInEditor"), shortcut: "Ctrl+Shift+O", commandId: "go.goToSymbolInEditor" },
                { type: "separator" },
                { type: "item", label: t("menu.go.goToDefinition"), shortcut: "F12", commandId: "go.goToDefinition" },
                { type: "item", label: t("menu.go.goToDeclaration"), commandId: "go.goToDeclaration" },
                { type: "item", label: t("menu.go.goToTypeDefinition"), commandId: "go.goToTypeDefinition" },
                { type: "item", label: t("menu.go.goToImplementation"), shortcut: "Ctrl+F12", commandId: "go.goToImplementation" },
                { type: "item", label: t("menu.go.goToReferences"), shortcut: "Shift+F12", commandId: "go.goToReferences" },
                { type: "separator" },
                { type: "item", label: t("menu.go.goToLine"), shortcut: "Ctrl+G", commandId: "go.goToLine" },
                { type: "item", label: t("menu.go.goToBracket"), shortcut: "Ctrl+Shift+\\", commandId: "go.goToBracket" },
                { type: "separator" },
                { type: "item", label: t("menu.go.nextProblem"), shortcut: "F8", commandId: "go.nextProblem" },
                { type: "item", label: t("menu.go.previousProblem"), shortcut: "Shift+F8", commandId: "go.previousProblem" },
                { type: "separator" },
                { type: "item", label: t("menu.go.nextChange"), shortcut: "Alt+F3", commandId: "go.nextChange" },
                { type: "item", label: t("menu.go.previousChange"), shortcut: "Shift+Alt+F3", commandId: "go.previousChange" }
            ]
        },
        {
            name: t("menu.run"),
            items: [
                { type: "item", label: t("menu.run.startDebugging"), shortcut: "F5", commandId: "run.startDebugging" },
                { type: "item", label: t("menu.run.runWithoutDebugging"), shortcut: "Ctrl+F5", commandId: "run.runWithoutDebugging" },
                { type: "item", label: t("menu.run.stopDebugging"), shortcut: "Shift+F5", commandId: "run.stopDebugging", disabled: true },
                { type: "item", label: t("menu.run.restartDebugging"), shortcut: "Ctrl+Shift+F5", commandId: "run.restartDebugging", disabled: true },
                { type: "separator" },
                { type: "item", label: t("menu.run.openConfigurations"), commandId: "run.openConfigurations" },
                { type: "item", label: t("menu.run.addConfiguration"), commandId: "run.addConfiguration" },
                { type: "separator" },
                { type: "item", label: t("menu.run.stepOver"), shortcut: "F10", commandId: "run.stepOver", disabled: true },
                { type: "item", label: t("menu.run.stepInto"), shortcut: "F11", commandId: "run.stepInto", disabled: true },
                { type: "item", label: t("menu.run.stepOut"), shortcut: "Shift+F11", commandId: "run.stepOut", disabled: true },
                { type: "item", label: t("menu.run.continue"), shortcut: "F5", commandId: "run.continue", disabled: true },
                { type: "separator" },
                { type: "item", label: t("menu.run.toggleBreakpoint"), shortcut: "F9", commandId: "run.toggleBreakpoint" },
                { type: "item", label: t("menu.run.addConditionalBreakpoint"), commandId: "run.addConditionalBreakpoint" },
                { type: "separator" },
                { type: "item", label: t("menu.run.enableAllBreakpoints"), commandId: "run.enableAllBreakpoints" },
                { type: "item", label: t("menu.run.disableAllBreakpoints"), commandId: "run.disableAllBreakpoints" },
                { type: "item", label: t("menu.run.removeAllBreakpoints"), commandId: "run.removeAllBreakpoints" },
                { type: "separator" },
                { type: "item", label: t("menu.run.installDebuggers"), commandId: "run.installDebuggers" }
            ]
        },
        {
            name: t("menu.terminal"),
            items: [
                { type: "item", label: t("menu.terminal.newTerminal"), shortcut: "Ctrl+Shift+`", commandId: "terminal.newTerminal" },
                { type: "item", label: t("menu.terminal.newTerminalWindow"), shortcut: "Ctrl+Shift+Alt+`", commandId: "terminal.newTerminalWindow" },
                { type: "item", label: t("menu.terminal.splitTerminal"), shortcut: "Ctrl+Shift+5", commandId: "terminal.splitTerminal" },
                { type: "separator" },
                {
                    type: "item",
                    label: "PowerShell",
                    onClick: () => dispatchCommand("terminal.newWithProfile", "PowerShell")
                },
                {
                    type: "item",
                    label: "Git Bash",
                    onClick: () => dispatchCommand("terminal.newWithProfile", "Git Bash")
                },
                {
                    type: "item",
                    label: "Command Prompt",
                    onClick: () => dispatchCommand("terminal.newWithProfile", "Command Prompt")
                },
                {
                    type: "item",
                    label: "Ubuntu (WSL)",
                    onClick: () => dispatchCommand("terminal.newWithProfile", "Ubuntu (WSL)")
                },
                {
                    type: "item",
                    label: "JavaScript Debug Terminal",
                    onClick: () => dispatchCommand("terminal.newWithProfile", "JavaScript Debug Terminal")
                },
                { type: "submenu", label: t("menu.terminal.splitTerminal"), items: [] },
                { type: "separator" },
                { type: "item", label: t("menu.terminal.killTerminal"), commandId: "terminal.killTerminal" },
                { type: "item", label: t("menu.terminal.clearTerminal"), commandId: "terminal.clearTerminal" },
                { type: "separator" },
                {
                    type: "item",
                    label: t("menu.terminal.configureSettings"),
                    onClick: () => alert("Terminal Settings coming soon!")
                },
                {
                    type: "item",
                    label: t("menu.terminal.selectDefaultProfile"),
                    onClick: () => alert("Select Default Profile coming soon!")
                },
                { type: "separator" },
                { type: "item", label: t("menu.terminal.runTask"), commandId: "terminal.runTask" },
                { type: "item", label: t("menu.terminal.runActiveFile"), commandId: "terminal.runActiveFile" },
                {
                    type: "item",
                    label: t("menu.terminal.configureTasks"),
                    onClick: () => alert("Configure Tasks coming soon!")
                },
            ]
        },
        {
            name: t("menu.help"),
            items: [
                { type: "item", label: t("menu.help.documentation"), commandId: "help.documentation" },
                { type: "item", label: t("menu.help.welcome"), commandId: "help.welcome" },
                { type: "item", label: t("menu.help.showReleaseNotes"), commandId: "help.releaseNotes" },
                { type: "item", label: t("menu.help.keyboardShortcuts"), commandId: "help.keyboardShortcuts" },
                { type: "item", label: t("menu.help.videoTutorials"), commandId: "help.videoTutorials" },
                { type: "separator" },
                { type: "item", label: t("menu.help.reportIssue"), commandId: "help.reportIssue" },
                { type: "item", label: t("menu.help.searchFeatureRequests"), commandId: "help.searchFeatureRequests" },
                { type: "separator" },
                { type: "item", label: t("menu.help.viewLicense"), commandId: "help.viewLicense" },
                { type: "item", label: t("menu.help.privacyStatement"), commandId: "help.privacyStatement" },
                { type: "separator" },
                { type: "item", label: t("menu.help.toggleDevTools"), commandId: "help.toggleDevTools" },
                { type: "item", label: t("menu.help.processExplorer"), commandId: "help.processExplorer" },
                { type: "separator" },
                { type: "item", label: t("menu.help.checkUpdates"), commandId: "help.checkUpdates" },
                { type: "separator" },
                { type: "item", label: t("menu.help.about"), commandId: "help.about" }
            ]
        }
    ];

    return (
        <header className="h-9 bg-gradient-to-b from-[hsl(225_22%_9%)] to-[hsl(225_18%_7%)] border-b border-ide-border/80 flex items-center shrink-0 z-50 sticky top-0 shadow-[0_1px_0_hsl(228_18%_14%/0.5)] backdrop-blur-sm">
            {/* Left - Menu Items */}
            <div className="flex items-center h-full pl-2 pr-1 gap-1">

                {ideMenus.map((menu) => (
                    <DropdownMenu key={menu.name}>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="px-3 h-8 text-[11px] font-medium text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover/90 rounded-md transition-all duration-200 focus:outline-none focus:bg-ide-hover focus:text-white"
                            >
                                {menu.name}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="min-w-[240px] bg-ide-bg border border-ide-border shadow-xl mt-0 animate-in fade-in slide-in-from-top-1 duration-150"
                            align="start"
                        >
                            {menu.items.map((item, idx) => renderMenuItem(item, idx, dispatchCommand))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ))}
            </div>

            {/* Center — quick search / command */}
            <div className="flex-1 flex items-center justify-center px-4 pointer-events-auto">
                <button
                    type="button"
                    onClick={() => dispatchCommand("view.commandPalette")}
                    className="flex items-center gap-2 h-7 max-w-md w-full min-w-[200px] px-3 rounded-full border border-ide-border/60 bg-ide-panel/40 text-left text-[11px] text-ide-text-secondary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] hover:border-ide-border hover:bg-ide-hover/50 hover:text-ide-text-primary transition-all duration-200"
                >
                    <Search className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="flex-1 truncate opacity-90">Search or run commands…</span>
                    <kbd className="hidden sm:inline text-[9px] font-sans px-1.5 py-0.5 rounded bg-ide-bg/80 border border-ide-border/50 text-ide-text-secondary/80">⌘⇧P</kbd>
                </button>
            </div>

            {/* Right - Actions & Model Selector */}
            <div className="flex items-center gap-1.5 px-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1.5 text-[10px] font-medium text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover border-transparent rounded-md transition-colors"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-ide-text-secondary" />
                            {currentModel.label}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[180px] bg-ide-bg border border-ide-border shadow-xl mt-1 animate-in fade-in slide-in-from-top-1 duration-150" align="end">
                        <div className="px-3 py-2 text-[10px] font-bold text-ide-text-secondary/50 uppercase tracking-widest">Select Intelligence</div>
                        <DropdownMenuSeparator className="bg-white/5" />
                        {models.map((model) => (
                            <DropdownMenuItem
                                key={model.value}
                                onClick={() => onModelChange(model.value)}
                                className={`text-[11px] cursor-pointer py-1.5 px-3 rounded-md mx-1 my-0.5 transition-colors ${model.value === selectedModel
                                    ? "bg-ide-active text-ide-text-primary"
                                    : "text-ide-text-secondary hover:bg-ide-hover hover:text-ide-text-primary"
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    {model.label}
                                    {model.value === selectedModel && <div className="w-1 h-1 rounded-full bg-ide-text-primary" />}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => alert("No new notifications")}
                        className="text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all"
                        title="Notifications"
                    >
                        <Bell className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => dispatchCommand("view.search")}
                        className="text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all"
                        title="Search"
                    >
                        <Search className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => dispatchCommand("view.toggleAiChat")}
                        className="text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover transition-colors"
                        title="AI Assistant"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all"
                        title="Settings"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => alert("User profile coming soon")}
                        className="text-ide-text-secondary hover:text-white hover:bg-white/10 transition-all"
                        title="Profile"
                    >
                        <User className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                            if (document.fullscreenElement) {
                                document.exitFullscreen().catch(console.error);
                            }
                        }}
                        className="text-ide-text-secondary hover:text-white transition-all"
                    >
                        <Minimize2 className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                            if (!document.fullscreenElement) {
                                document.documentElement.requestFullscreen().catch(console.error);
                            }
                        }}
                        className="text-ide-text-secondary hover:text-white transition-all"
                    >
                        <Maximize2 className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                            if (confirm("Are you sure you want to exit the IDE?")) {
                                window.close();
                                document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;background:#000000;color:#fff;font-family:sans-serif;'>IDE Closed. You can close this tab.</div>";
                            }
                        }}
                        className="text-ide-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
