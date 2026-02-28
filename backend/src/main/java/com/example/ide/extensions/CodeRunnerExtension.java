package com.example.ide.extensions;

import com.example.ide.core.IDEExtension;
import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.core.commands.IDECommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.file.Files;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Code Runner Extension. Registers runFile / runner.runActiveFile;
 * executes Node, Python, or Java via ProcessBuilder and returns output.
 */
@Component
public class CodeRunnerExtension implements IDEExtension {

    private static final Logger log = LoggerFactory.getLogger(CodeRunnerExtension.class);
    private static final int RUN_TIMEOUT_SEC = 30;

    private final AtomicBoolean enabled = new AtomicBoolean(true);
    private final CommandRegistry commandRegistry;

    public CodeRunnerExtension(CommandRegistry commandRegistry) {
        this.commandRegistry = commandRegistry;
    }

    @Override public String getId()          { return "code-runner"; }
    @Override public String getName()        { return "Code Runner"; }
    @Override public String getDescription() { return "Run Node.js, Java, and Python files directly from the editor"; }
    @Override public String getCategory()    { return "tools"; }
    @Override public boolean isEnabled()     { return enabled.get(); }

    @Override
    public void activate() {
        enabled.set(true);
        IDECommand runFile = new IDECommand() {
            @Override public String getName()  { return "runFile"; }
            @Override public String getLabel() { return "Run File"; }
            @Override public Object execute(Map<String, Object> payload) {
                return runFileFromPayload(payload);
            }
        };
        IDECommand runActive = new IDECommand() {
            @Override public String getName()  { return "runner.runActiveFile"; }
            @Override public String getLabel() { return "Run: Execute Current File"; }
            @Override public Object execute(Map<String, Object> payload) {
                return runFileFromPayload(payload);
            }
        };
        commandRegistry.registerCommand(runFile);
        commandRegistry.registerCommand(runActive);
        log.info("[CodeRunnerExtension] Activated — runFile + runner.runActiveFile registered");
    }

    @Override
    public void deactivate() {
        enabled.set(false);
        commandRegistry.removeCommand("runFile");
        commandRegistry.removeCommand("runner.runActiveFile");
        log.info("[CodeRunnerExtension] Deactivated");
    }

    private String runFileFromPayload(Map<String, Object> payload) {
        String path = payload != null && payload.get("path") != null ? payload.get("path").toString() : "";
        String content = payload != null && payload.get("content") != null ? payload.get("content").toString() : "";
        String language = payload != null && payload.get("language") != null ? payload.get("language").toString() : "";
        if (path.isEmpty() && content.isEmpty()) {
            return "[Code Runner] No path or content provided.";
        }
        try {
            if (!path.isEmpty() && new File(path).exists()) {
                return runByPath(path, language);
            }
            if (!content.isEmpty()) {
                return runByContent(content, language);
            }
            return "[Code Runner] File not found: " + path;
        } catch (Exception e) {
            log.warn("[CodeRunnerExtension] Run failed", e);
            return "[Code Runner] Error: " + e.getMessage();
        }
    }

    private String runByPath(String path, String language) throws IOException, InterruptedException {
        String lang = language;
        if (lang.isEmpty()) {
            String ext = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1).toLowerCase() : "";
            switch (ext) {
                case "js": case "mjs": case "cjs": lang = "javascript"; break;
                case "ts": lang = "typescript"; break;
                case "py": lang = "python"; break;
                case "java": lang = "java"; break;
                default: lang = "plaintext";
            }
        }
        return runProcess(lang, path, null);
    }

    private String runByContent(String content, String language) throws IOException, InterruptedException {
        String lang = language != null ? language : "plaintext";
        String ext;
        switch (lang.toLowerCase()) {
            case "javascript": case "typescript": ext = "js"; break;
            case "python": ext = "py"; break;
            case "java": ext = "java"; break;
            default: ext = "txt";
        }
        java.nio.file.Path temp = Files.createTempFile("ide-run", "." + ext);
        try {
            Files.writeString(temp, content);
            return runProcess(lang, temp.toAbsolutePath().toString(), null);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    private String runProcess(String language, String pathOrFile, String cwd) throws IOException, InterruptedException {
        ProcessBuilder pb;
        String lang = language == null ? "" : language.toLowerCase();
        switch (lang) {
            case "javascript":
            case "typescript":
                pb = new ProcessBuilder("node", pathOrFile);
                break;
            case "python":
                pb = new ProcessBuilder("python", pathOrFile);
                break;
            case "java":
                // Compile then run (simplified: single-file run with same name)
                java.nio.file.Path dir = java.nio.file.Paths.get(pathOrFile).getParent();
                String name = java.nio.file.Paths.get(pathOrFile).getFileName().toString().replace(".java", "");
                ProcessBuilder compile = new ProcessBuilder("javac", pathOrFile).directory(dir != null ? dir.toFile() : new File("."));
                Process p = compile.start();
                String compileOut = readStream(p.getInputStream()) + readStream(p.getErrorStream());
                p.waitFor(RUN_TIMEOUT_SEC, TimeUnit.SECONDS);
                if (p.exitValue() != 0) return "[Compile error]\n" + compileOut;
                ProcessBuilder run = new ProcessBuilder("java", name).directory(dir != null ? dir.toFile() : new File("."));
                run.redirectErrorStream(true);
                Process pr = run.start();
                String out = readStream(pr.getInputStream());
                pr.waitFor(RUN_TIMEOUT_SEC, TimeUnit.SECONDS);
                return out;
            default:
                return "[Code Runner] Unsupported language: " + language;
        }
        pb.redirectErrorStream(true);
        if (cwd != null) pb.directory(new File(cwd));
        Process process = pb.start();
        String output = readStream(process.getInputStream());
        boolean finished = process.waitFor(RUN_TIMEOUT_SEC, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            return output + "\n[Timed out after " + RUN_TIMEOUT_SEC + "s]";
        }
        return output;
    }

    private static String readStream(InputStream is) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(is))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append("\n");
        }
        return sb.toString();
    }
}
