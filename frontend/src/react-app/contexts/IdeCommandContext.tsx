import { createContext, useContext, ReactNode, useCallback, useEffect, useRef } from "react";
import { defaultKeymap } from "./keymap";

// Known command IDs based on the reference UI
export type IdeCommandId =
    // File Menu Commands
    | "file.newTextFile"
    | "file.newFile"
    | "file.newWindow"
    | "file.openFile"
    | "file.openFolder"
    | "file.openLocalPath"
    | "file.openRecent"
    | "file.addFolderToWorkspace"
    | "file.saveWorkspaceAs"
    | "file.duplicateWorkspace"
    | "file.save"
    | "file.saveAs"
    | "file.saveAll"
    | "file.autoSave"
    | "file.preferences"
    | "file.revertFile"
    | "file.closeEditor"
    | "file.closeFolder"
    | "file.closeWindow"
    | "file.exit"

    // Edit Menu Commands
    | "edit.undo"
    | "edit.redo"
    | "edit.cut"
    | "edit.copy"
    | "edit.paste"
    | "edit.find"
    | "edit.replace"
    | "edit.findInFiles"
    | "edit.replaceInFiles"
    | "edit.toggleLineComment"
    | "edit.toggleBlockComment"

    // Selection Menu Commands
    | "selection.selectAll"
    | "selection.expandSelection"
    | "selection.shrinkSelection"
    | "selection.copyLineUp"
    | "selection.copyLineDown"
    | "selection.moveLineUp"
    | "selection.moveLineDown"
    | "selection.duplicateSelection"
    | "selection.addCursorAbove"
    | "selection.addCursorBelow"
    | "selection.addCursorsToLineEnds"
    | "selection.addNextOccurrence"

    // View/Panel Commands
    | "view.commandPalette"
    | "view.explorer"
    | "view.search"
    | "view.aiAssistant"
    | "view.extensions"
    | "view.scm"
    | "view.debug"
    | "view.terminal"
    | "view.toggleAiChat"
    | "ai.inlineEdit"
    | "ai.explainSelection"
    | "view.wordWrap"
    | "view.toggleActivityBar"
    | "view.toggleStatusBar"
    | "view.toggleZenMode"
    | "view.moveSidebarLeft"
    | "view.moveSidebarRight"

    // Go/Navigation Commands
    | "go.back"
    | "go.forward"
    | "go.lastEditLocation"
    | "go.switchEditor"
    | "go.switchGroup"
    | "go.goToFile"
    | "go.goToSymbolInWorkspace"
    | "go.goToSymbolInEditor"
    | "go.goToDefinition"
    | "go.goToDeclaration"
    | "go.goToTypeDefinition"
    | "go.goToImplementation"
    | "go.goToReferences"
    | "go.goToLine"
    | "go.goToBracket"
    | "go.nextProblem"
    | "go.previousProblem"
    | "go.nextChange"
    | "go.previousChange"

    // Run/Debug Commands
    | "run.startDebugging"
    | "run.runWithoutDebugging"
    | "run.stopDebugging"
    | "run.restartDebugging"
    | "run.openConfigurations"
    | "run.addConfiguration"
    | "run.stepOver"
    | "run.stepInto"
    | "run.stepOut"
    | "run.continue"
    | "run.toggleBreakpoint"
    | "run.addConditionalBreakpoint"
    | "run.enableAllBreakpoints"
    | "run.disableAllBreakpoints"
    | "run.removeAllBreakpoints"
    | "run.installDebuggers"

    // Terminal Commands
    | "terminal.newTerminal"
    | "terminal.newWithProfile"
    | "terminal.splitTerminal"
    | "terminal.newTerminalWindow"
    | "terminal.killTerminal"
    | "terminal.clearTerminal"
    | "terminal.runTask"
    | "terminal.runBuildTask"
    | "terminal.runActiveFile"
    | "terminal.runSelectedText"
    | "terminal.configureTasks"

    // Help Commands
    | "help.documentation"
    | "help.welcome"
    | "help.releaseNotes"
    | "help.keyboardShortcuts"
    | "help.videoTutorials"
    | "help.reportIssue"
    | "help.searchFeatureRequests"
    | "help.viewLicense"
    | "help.privacyStatement"
    | "help.toggleDevTools"
    | "help.about"
    | "help.showCommands"
    | "help.playground"
    | "help.walkthrough"
    | "help.processExplorer"
    | "help.checkUpdates";

type CommandListener = (payload?: any) => void;

interface IdeCommandContextType {
    dispatchCommand: (commandId: IdeCommandId, payload?: any) => boolean;
    registerListener: (commandId: IdeCommandId, listener: CommandListener) => () => void;
}

const IdeCommandContext = createContext<IdeCommandContextType | undefined>(undefined);

export function IdeCommandProvider({ children }: { children: ReactNode }) {
    const listenersRef = useRef<Record<string, Set<CommandListener>>>({});

    const registerListener = useCallback((commandId: IdeCommandId, listener: CommandListener) => {
        if (!listenersRef.current[commandId]) {
            listenersRef.current[commandId] = new Set();
        }
        listenersRef.current[commandId].add(listener);

        return () => {
            listenersRef.current[commandId]?.delete(listener);
        };
    }, []);

    const dispatchCommand = useCallback((commandId: IdeCommandId, payload?: any): boolean => {
        const listeners = listenersRef.current[commandId];
        if (listeners && listeners.size > 0) {
            listeners.forEach((listener) => listener(payload));
            return true;
        } else {
            console.log(`[CommandRegistry] Unhandled command dispatched: ${commandId}`);
            return false;
        }
    }, []);

    // ------------------------------------------------------------------
    // Keybinding Manager - intercepts global keydown events
    // ------------------------------------------------------------------
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore keypresses inside input or textarea unless it is a generic shortcut

            // Check against defaultKeymap array
            for (const binding of defaultKeymap) {
                const matchKey = binding.key.toLowerCase() === e.key.toLowerCase();
                const matchCtrl = !!binding.ctrlKey === (e.ctrlKey || e.metaKey); // metaKey for Mac support
                const matchShift = !!binding.shiftKey === e.shiftKey;
                const matchAlt = !!binding.altKey === e.altKey;
                // Allow exact match of modifiers

                if (matchKey && matchCtrl && matchShift && matchAlt) {
                    console.log(`[KeybindingManager] Matched ${e.key} -> Dispatching ${binding.commandId}`);
                    const handled = dispatchCommand(binding.commandId);
                    
                    // Only prevent default if the command was actually handled by a listener
                    // or if it's explicitly marked to always prevent default
                    if (handled && binding.preventDefault !== false) {
                        e.preventDefault();
                    } else if (!handled) {
                         console.log(`[KeybindingManager] ${binding.commandId} not handled, letting browser process ${e.key}`);
                    }
                    return; // Stop after first match
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [dispatchCommand]);

    return (
        <IdeCommandContext.Provider value={{ dispatchCommand, registerListener }}>
            {children}
        </IdeCommandContext.Provider>
    );
}

// Hook to dispatch commands easily
export function useIdeCommand() {
    const context = useContext(IdeCommandContext);
    if (!context) {
        throw new Error("useIdeCommand must be used within an IdeCommandProvider");
    }
    return context;
}

// Hook to listen to commands easily
export function useIdeCommandListener(commandId: IdeCommandId, listener: CommandListener) {
    const { registerListener } = useIdeCommand();

    useEffect(() => {
        const unsubscribe = registerListener(commandId, listener);
        return () => unsubscribe();
    }, [commandId, listener, registerListener]);
}
