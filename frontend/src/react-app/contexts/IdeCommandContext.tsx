import { createContext, useContext, ReactNode, useCallback, useEffect, useRef } from "react";

// Known command IDs based on the reference UI
export type IdeCommandId =
    | "file.newTextFile"
    | "file.newFile"
    | "file.newWindow"
    | "file.openFile"
    | "file.openFolder"
    | "file.save"
    | "file.saveAs"
    | "file.saveAll"
    | "file.autoSave"
    | "file.preferences"
    | "file.closeEditor"
    | "file.closeFolder"
    | "file.closeWindow"
    | "file.exit"
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
    | "selection.selectAll"
    | "selection.expandSelection"
    | "selection.shrinkSelection"
    | "selection.copyLineUp"
    | "selection.copyLineDown"
    | "selection.moveLineUp"
    | "selection.moveLineDown"
    | "selection.duplicateSelection"
    | "view.commandPalette"
    | "view.explorer"
    | "view.search"
    | "view.terminal"
    | "view.wordWrap"
    | "go.goToFile"
    | "go.goToSymbol"
    | "go.goToDefinition"
    | "go.goToLine"
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
    | "run.enableAllBreakpoints"
    | "run.disableAllBreakpoints"
    | "run.removeAllBreakpoints"
    | "run.installDebuggers"
    | "terminal.newTerminal"
    | "terminal.splitTerminal"
    | "terminal.newTerminalWindow"
    | "terminal.runTask"
    | "terminal.runBuildTask"
    | "terminal.runActiveFile"
    | "terminal.runSelectedText"
    | "terminal.configureTasks"
    | "help.welcome"
    | "help.showCommands"
    | "help.playground"
    | "help.walkthrough"
    | "help.viewLicense"
    | "help.toggleDevTools"
    | "help.processExplorer"
    | "help.checkUpdates"
    | "help.about";

type CommandListener = (payload?: any) => void;

interface IdeCommandContextType {
    dispatchCommand: (commandId: IdeCommandId, payload?: any) => void;
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

    const dispatchCommand = useCallback((commandId: IdeCommandId, payload?: any) => {
        const listeners = listenersRef.current[commandId];
        if (listeners) {
            listeners.forEach((listener) => listener(payload));
        } else {
            console.log(`[IDE Command] Unhandled command dispatched: ${commandId}`);
        }
    }, []);

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
