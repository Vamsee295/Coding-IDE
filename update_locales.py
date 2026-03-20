import json
import os

locales_dir = os.path.join(os.path.dirname(__file__), "frontend", "src", "locales")
locales = ["en.json", "es.json", "ja.json", "zh-CN.json"]

missing_keys = {
    "menu.file.newWindowProfile": "New Window Profile",
    "menu.file.openLocalFolder": "Open Local Folder...",
    "menu.file.addFolderToWorkspace": "Add Folder to Workspace...",
    "menu.file.saveWorkspaceAs": "Save Workspace As...",
    "menu.file.duplicateWorkspace": "Duplicate Workspace",
    "menu.file.share": "Share",
    "menu.file.revertFile": "Revert File",
    "menu.file.closeEditor": "Close Editor",
    "menu.file.closeFolder": "Close Folder",
    "menu.file.closeWindow": "Close Window",
    
    "menu.edit.toggleLineComment": "Toggle Line Comment",
    "menu.edit.toggleBlockComment": "Toggle Block Comment",
    
    "menu.selection.copyLineUp": "Copy Line Up",
    "menu.selection.copyLineDown": "Copy Line Down",
    "menu.selection.moveLineUp": "Move Line Up",
    "menu.selection.moveLineDown": "Move Line Down",
    "menu.selection.duplicateSelection": "Duplicate Selection",
    "menu.selection.addCursorAbove": "Add Cursor Above",
    "menu.selection.addCursorBelow": "Add Cursor Below",
    "menu.selection.addCursorsToLineEnds": "Add Cursors to Line Ends",
    "menu.selection.addNextOccurrence": "Add Next Occurrence",

    "menu.view.aiChat": "AI Chat",

    "menu.go.lastEditLocation": "Last Edit Location",
    "menu.go.switchEditor": "Switch Editor",
    "menu.go.switchGroup": "Switch Group",
    "menu.go.goToSymbolInWorkspace": "Go to Symbol in Workspace...",
    "menu.go.goToSymbolInEditor": "Go to Symbol in Editor...",

    "menu.run.stopDebugging": "Stop Debugging",
    "menu.run.restartDebugging": "Restart Debugging",
    "menu.run.openConfigurations": "Open Configurations",
    "menu.run.addConfiguration": "Add Configuration",
    "menu.run.stepOver": "Step Over",
    "menu.run.stepInto": "Step Into",
    "menu.run.stepOut": "Step Out",
    "menu.run.continue": "Continue",
    "menu.run.toggleBreakpoint": "Toggle Breakpoint",
    "menu.run.addConditionalBreakpoint": "Add Conditional Breakpoint",
    "menu.run.enableAllBreakpoints": "Enable All Breakpoints",
    "menu.run.disableAllBreakpoints": "Disable All Breakpoints",
    "menu.run.removeAllBreakpoints": "Remove All Breakpoints",
    "menu.run.installDebuggers": "Install Debuggers",

    "menu.terminal.newTerminalWindow": "New Terminal Window",
    "menu.terminal.killTerminal": "Kill Terminal",
    "menu.terminal.clearTerminal": "Clear Terminal",
    "menu.terminal.configureSettings": "Configure Terminal Settings",
    "menu.terminal.selectDefaultProfile": "Select Default Profile",
    "menu.terminal.runTask": "Run Task",
    "menu.terminal.runActiveFile": "Run Active File",
    "menu.terminal.configureTasks": "Configure Tasks"
}

for locale in locales:
    path = os.path.join(locales_dir, locale)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Add missing keys if they don't exist
        for key, value in missing_keys.items():
            if key not in data:
                data[key] = value
                
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Updated {locale}")
