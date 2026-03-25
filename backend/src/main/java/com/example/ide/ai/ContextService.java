package com.example.ide.ai;

import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Collectors;

@Service
public class ContextService {

    /**
     * Builds a detailed context string representing the project structure and active state.
     * Including the active file content and current selection makes the Agent "aware".
     */
    public String buildContext(String workspaceRoot, String currentState, String activeFilePath, String activeFileContent, String selection) {
        StringBuilder ctx = new StringBuilder();
        
        ctx.append("--- PROJECT CONTEXT ---\n");
        if (workspaceRoot != null && !workspaceRoot.isEmpty()) {
             ctx.append("Workspace Root: ").append(workspaceRoot).append("\n");
             ctx.append("Files in Root:\n");
             ctx.append(getProjectFiles(workspaceRoot));
        }

        if (activeFilePath != null && !activeFilePath.isEmpty()) {
            ctx.append("\n--- ACTIVE FILE ---\n");
            ctx.append("Path: ").append(activeFilePath).append("\n");
            if (activeFileContent != null) {
                ctx.append("Content:\n").append(activeFileContent).append("\n");
            }
        }

        if (selection != null && !selection.isEmpty()) {
            ctx.append("\n--- CURRENT SELECTION ---\n");
            ctx.append(selection).append("\n");
        }
        
        ctx.append("\n--- AGENT STATE LOG ---\n");
        ctx.append(currentState).append("\n");
        
        ctx.append("-----------------------\n");

        return ctx.toString();
    }

    private String getProjectFiles(String root) {
        try {
            Path startPath = Paths.get(root);
            if (!Files.exists(startPath)) return "Root does not exist.";
            
            // Just get top level files/folders to avoid huge context windows for now.
            return Files.list(startPath)
                    .map(p -> {
                        File f = p.toFile();
                        return (f.isDirectory() ? "[DIR] " : "- ") + f.getName();
                    })
                    .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            return "Error scanning files: " + e.getMessage();
        }
    }
}
