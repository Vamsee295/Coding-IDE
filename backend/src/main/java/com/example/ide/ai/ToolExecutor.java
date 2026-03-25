package com.example.ide.ai;

import org.springframework.stereotype.Service;


import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class ToolExecutor {

    public String execute(AgentAction action, String workspaceRoot) {
        if (action == null || action.getType() == null) {
            return "Error: Invalid action — missing type";
        }

        switch (action.getType()) {
            case "read_file":
            case "readFile":
                return readFile(action.getPath(), workspaceRoot);

            case "write_file":
            case "writeFile":
            case "create_file":
            case "createFile":
                return writeFile(action.getPath(), action.getContent(), workspaceRoot);

            case "applyDiff":
            case "apply_diff":
                return applyDiff(action.getPath(), action.getDiff(), workspaceRoot);

            case "delete_file":
            case "deleteFile":
                return deleteFile(action.getPath(), workspaceRoot);

            case "run_command":
            case "runCommand":
                return runCommand(action.getCommand(), workspaceRoot);

            case "search":
                return search(action.getQuery(), workspaceRoot);

            case "list_files":
            case "listFiles":
                return listFiles(action.getPath(), workspaceRoot);

            default:
                return "Error: Unknown action type: " + action.getType();
        }
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    private String readFile(String filePath, String workspaceRoot) {
        if (filePath == null) return "Error: path is null";
        try {
            Path targetPath = resolvePath(filePath, workspaceRoot);
            if (!Files.exists(targetPath)) {
                return "Error: File does not exist at " + targetPath;
            }
            String content = Files.readString(targetPath);
            // Truncate very large files to avoid overloading the context window
            if (content.length() > 20000) {
                content = content.substring(0, 20000) + "\n\n[... truncated — file too large ...]";
            }
            return content;
        } catch (Exception e) {
            return "Error reading file: " + e.getMessage();
        }
    }

    // ─── Write / Create ───────────────────────────────────────────────────────

    private String writeFile(String filePath, String content, String workspaceRoot) {
        if (filePath == null || content == null) return "Error: path or content is null";
        try {
            Path targetPath = resolvePath(filePath, workspaceRoot);
            Files.createDirectories(targetPath.getParent());
            Files.writeString(targetPath, content);
            return "OK: File written at " + targetPath;
        } catch (Exception e) {
            return "Error writing file: " + e.getMessage();
        }
    }

    // ─── Apply Diff ───────────────────────────────────────────────────────────

    private String applyDiff(String filePath, String diffPatch, String workspaceRoot) {
        if (filePath == null || diffPatch == null) return "Error: path or diff is null";
        try {
            Path targetPath = resolvePath(filePath, workspaceRoot);
            if (!Files.exists(targetPath)) {
                return "Error: File does not exist: " + targetPath;
            }
            String original = Files.readString(targetPath);
            String updated = DiffUtil.applyDiff(original, diffPatch);
            Files.writeString(targetPath, updated);
            return "OK: Diff applied successfully to " + targetPath;
        } catch (Exception e) {
            return "Error applying diff: " + e.getMessage();
        }
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    private String deleteFile(String filePath, String workspaceRoot) {
        if (filePath == null) return "Error: path is null";
        try {
            Path targetPath = resolvePath(filePath, workspaceRoot);
            // Safety guard — must be inside workspace
            if (workspaceRoot != null && !targetPath.toAbsolutePath().startsWith(Paths.get(workspaceRoot).toAbsolutePath())) {
                return "Error: Cannot delete files outside workspace root.";
            }
            if (!Files.exists(targetPath)) return "Error: File does not exist: " + targetPath;
            Files.delete(targetPath);
            return "OK: Deleted " + targetPath;
        } catch (Exception e) {
            return "Error deleting file: " + e.getMessage();
        }
    }

    // ─── List Files ───────────────────────────────────────────────────────────

    private String listFiles(String dirPath, String workspaceRoot) {
        try {
            Path startPath = dirPath != null && !dirPath.isBlank()
                    ? resolvePath(dirPath, workspaceRoot)
                    : Paths.get(workspaceRoot);

            if (!Files.exists(startPath)) return "Error: Directory does not exist: " + startPath;

            try (Stream<Path> walk = Files.walk(startPath, 4)) {
                return walk
                        .filter(p -> !p.toString().contains("node_modules")
                                && !p.toString().contains(".git")
                                && !p.toString().contains("target")
                                && !p.toString().contains(".class"))
                        .map(p -> {
                            String rel = startPath.relativize(p).toString();
                            return Files.isDirectory(p) ? "[DIR] " + rel : "- " + rel;
                        })
                        .collect(Collectors.joining("\n"));
            }
        } catch (Exception e) {
            return "Error listing files: " + e.getMessage();
        }
    }

    // ─── Search ───────────────────────────────────────────────────────────────

    private String search(String query, String workspaceRoot) {
        if (query == null || query.isBlank()) return "Error: search query is empty";
        try {
            Path root = Paths.get(workspaceRoot);
            List<String> matches = new ArrayList<>();
            String lq = query.toLowerCase();

            try (Stream<Path> walk = Files.walk(root, 8)) {
                walk.filter(Files::isRegularFile)
                    .filter(p -> {
                        String ps = p.toString();
                        return !ps.contains("node_modules") && !ps.contains(".git")
                                && !ps.contains("target") && !ps.endsWith(".class");
                    })
                    .forEach(p -> {
                        try {
                            List<String> lines = Files.readAllLines(p);
                            for (int i = 0; i < lines.size(); i++) {
                                if (lines.get(i).toLowerCase().contains(lq)) {
                                    String rel = root.relativize(p).toString();
                                    matches.add(rel + ":" + (i + 1) + ": " + lines.get(i).trim());
                                    if (matches.size() >= 30) return; // cap results
                                }
                            }
                        } catch (Exception ignored) {}
                    });
            }

            if (matches.isEmpty()) return "No matches found for: " + query;
            return String.join("\n", matches);
        } catch (Exception e) {
            return "Error searching: " + e.getMessage();
        }
    }

    // ─── Run Command ──────────────────────────────────────────────────────────

    private String runCommand(String cmd, String workspaceRoot) {
        if (cmd == null) return "Error: command is null";

        // Safety guard against destructive commands
        String lower = cmd.toLowerCase();
        if (lower.contains("rm -rf /") || lower.contains("del /s /q c:\\")
                || lower.contains("format c:") || lower.contains("mkfs")) {
            return "Error: Blocked dangerous command: " + cmd;
        }

        try {
            ProcessBuilder pb = new ProcessBuilder();
            if (System.getProperty("os.name").toLowerCase().contains("win")) {
                pb.command("cmd.exe", "/c", cmd);
            } else {
                pb.command("bash", "-c", cmd);
            }

            if (workspaceRoot != null && !workspaceRoot.isEmpty()) {
                pb.directory(Paths.get(workspaceRoot).toFile());
            }
            pb.redirectErrorStream(false);

            Process p = pb.start();
            byte[] out = p.getInputStream().readAllBytes();
            byte[] err = p.getErrorStream().readAllBytes();
            int exitCode = p.waitFor();

            String output = new String(out);
            String error = new String(err);

            if (output.length() > 5000) output = output.substring(0, 5000) + "\n[... truncated ...]";
            if (error.length() > 2000) error  = error.substring(0, 2000) + "\n[... truncated ...]";

            if (exitCode != 0 && !error.isEmpty()) {
                return "Exit " + exitCode + " | STDERR:\n" + error + (output.isEmpty() ? "" : "\nSTDOUT:\n" + output);
            }
            return output.isEmpty() ? "OK: Command executed (exit code " + exitCode + ")" : output;
        } catch (Exception e) {
            return "Error running command: " + e.getMessage();
        }
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    private Path resolvePath(String filePath, String workspaceRoot) {
        Path path = Paths.get(filePath);
        if (path.isAbsolute()) return path;
        if (workspaceRoot != null && !workspaceRoot.isEmpty()) {
            return Paths.get(workspaceRoot, filePath).normalize();
        }
        return path.normalize();
    }
}
