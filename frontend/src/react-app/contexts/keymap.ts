import { IdeCommandId } from "./IdeCommandContext";

export interface KeybindingDef {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    commandId: IdeCommandId;
    preventDefault?: boolean; // Default true for IDE shortcuts
}

// VS Code style default shortcuts
export const defaultKeymap: KeybindingDef[] = [
    // File Menu
    { key: "n", ctrlKey: true, commandId: "file.newTextFile" },
    { key: "n", ctrlKey: true, altKey: true, metaKey: true, commandId: "file.newFile" }, // Windows key as metaKey
    { key: "n", ctrlKey: true, shiftKey: true, commandId: "file.newWindow" },
    { key: "o", ctrlKey: true, commandId: "file.openFile" },
    { key: "o", ctrlKey: true, shiftKey: true, commandId: "file.openLocalPath" }, // Or Ctrl+K Ctrl+O for folder, we'll keep simple one-chords here
    { key: "s", ctrlKey: true, commandId: "file.save" },
    { key: "s", ctrlKey: true, shiftKey: true, commandId: "file.saveAs" },
    // F4 logic isn't exactly standard across OS but we can map it
    { key: "f4", ctrlKey: true, commandId: "file.closeEditor" },
    { key: "f4", altKey: true, commandId: "file.closeWindow" },

    // Edit Menu
    { key: "z", ctrlKey: true, commandId: "edit.undo" },
    { key: "y", ctrlKey: true, commandId: "edit.redo" },
    { key: "z", ctrlKey: true, shiftKey: true, commandId: "edit.redo" }, // Alt diff
    { key: "x", ctrlKey: true, commandId: "edit.cut" },
    { key: "c", ctrlKey: true, commandId: "edit.copy" },
    { key: "v", ctrlKey: true, commandId: "edit.paste" },
    { key: "f", ctrlKey: true, commandId: "edit.find" },
    { key: "h", ctrlKey: true, commandId: "edit.replace" },
    { key: "f", ctrlKey: true, shiftKey: true, commandId: "edit.findInFiles" },
    { key: "h", ctrlKey: true, shiftKey: true, commandId: "edit.replaceInFiles" },
    { key: "/", ctrlKey: true, commandId: "edit.toggleLineComment" },
    { key: "a", shiftKey: true, altKey: true, commandId: "edit.toggleBlockComment" },

    // Selection
    { key: "a", ctrlKey: true, commandId: "selection.selectAll" },
    { key: "arrowright", shiftKey: true, altKey: true, commandId: "selection.expandSelection" },
    { key: "arrowleft", shiftKey: true, altKey: true, commandId: "selection.shrinkSelection" },
    { key: "arrowup", shiftKey: true, altKey: true, commandId: "selection.copyLineUp" },
    { key: "arrowdown", shiftKey: true, altKey: true, commandId: "selection.copyLineDown" },
    { key: "arrowup", altKey: true, commandId: "selection.moveLineUp" },
    { key: "arrowdown", altKey: true, commandId: "selection.moveLineDown" },
    { key: "arrowup", ctrlKey: true, altKey: true, commandId: "selection.addCursorAbove" },
    { key: "arrowdown", ctrlKey: true, altKey: true, commandId: "selection.addCursorBelow" },
    { key: "i", shiftKey: true, altKey: true, commandId: "selection.addCursorsToLineEnds" },
    { key: "d", ctrlKey: true, commandId: "selection.addNextOccurrence" },

    // View
    { key: "p", ctrlKey: true, shiftKey: true, commandId: "view.commandPalette" },
    { key: "e", ctrlKey: true, shiftKey: true, commandId: "view.explorer" },
    { key: "x", ctrlKey: true, shiftKey: true, commandId: "view.extensions" },
    { key: "`", ctrlKey: true, commandId: "view.terminal" },
    { key: "z", altKey: true, commandId: "view.wordWrap" },

    // Go
    { key: "arrowleft", altKey: true, commandId: "go.back" },
    { key: "arrowright", altKey: true, commandId: "go.forward" },
    { key: "q", ctrlKey: true, commandId: "go.lastEditLocation" },
    { key: "p", ctrlKey: true, commandId: "go.goToFile" },
    { key: "t", ctrlKey: true, commandId: "go.goToSymbolInWorkspace" },
    { key: "o", ctrlKey: true, shiftKey: true, commandId: "go.goToSymbolInEditor" },
    { key: "f12", commandId: "go.goToDefinition" },
    { key: "f12", ctrlKey: true, commandId: "go.goToImplementation" },
    { key: "f12", shiftKey: true, commandId: "go.goToReferences" },
    { key: "g", ctrlKey: true, commandId: "go.goToLine" },
    { key: "\\", ctrlKey: true, shiftKey: true, commandId: "go.goToBracket" },
    { key: "f8", commandId: "go.nextProblem" },
    { key: "f8", shiftKey: true, commandId: "go.previousProblem" },
    { key: "f3", altKey: true, commandId: "go.nextChange" },
    { key: "f3", shiftKey: true, altKey: true, commandId: "go.previousChange" },

    // Run
    { key: "f5", commandId: "run.startDebugging" },
    { key: "f5", ctrlKey: true, commandId: "run.runWithoutDebugging" },
    { key: "f5", shiftKey: true, commandId: "run.stopDebugging" },
    { key: "f5", ctrlKey: true, shiftKey: true, commandId: "run.restartDebugging" },
    { key: "f10", commandId: "run.stepOver" },
    { key: "f11", commandId: "run.stepInto" },
    { key: "f11", shiftKey: true, commandId: "run.stepOut" },
    { key: "f9", commandId: "run.toggleBreakpoint" },

    // Terminal
    { key: "`", ctrlKey: true, shiftKey: true, commandId: "terminal.newTerminal" },
    { key: "5", ctrlKey: true, shiftKey: true, commandId: "terminal.splitTerminal" }
];
