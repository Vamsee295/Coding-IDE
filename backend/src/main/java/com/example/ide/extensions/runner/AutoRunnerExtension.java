package com.example.ide.extensions.runner;

import com.example.ide.core.IDEExtension;
import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.core.commands.IDECommand;
import com.example.ide.workspace.StreamingProcessRunner;
import com.example.ide.workspace.WorkspaceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Extension that registers the "autoRun" command.
 * Picks the correct dev server / build command based on detected project type.
 *
 * NODE   → npm install (if needed) then npm run dev
 * MAVEN  → mvn spring-boot:run
 * GRADLE → ./gradlew bootRun
 * PYTHON → python main.py (or app.py)
 * RUST   → cargo run
 */
@Component
public class AutoRunnerExtension implements IDEExtension {

    private static final Logger log = LoggerFactory.getLogger(AutoRunnerExtension.class);

    private final CommandRegistry registry;
    private final WorkspaceService workspaceService;
    private final AtomicBoolean enabled = new AtomicBoolean(true);
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public AutoRunnerExtension(CommandRegistry registry, WorkspaceService workspaceService) {
        this.registry = registry;
        this.workspaceService = workspaceService;
    }

    @Override public String getId()          { return "auto-runner"; }
    @Override public String getName()        { return "Auto Runner"; }
    @Override public String getDescription() { return "Starts the appropriate dev server for the detected project type"; }
    @Override public String getCategory()    { return "runner"; }
    @Override public String getVersion()     { return "1.0.0"; }
    @Override public boolean isEnabled()     { return enabled.get(); }

    @Override
    public void activate() {
        enabled.set(true);
        registry.registerCommand(new IDECommand() {
            @Override public String getName()  { return "autoRun"; }
            @Override public String getLabel() { return "Run Project"; }

            @Override
            public Object execute(Map<String, Object> payload) {
                WebSocketSession session = (WebSocketSession) payload.get("session");
                if (session == null || !session.isOpen()) {
                    log.warn("[AutoRunnerExtension] No active session for autoRun");
                    return null;
                }
                String cwd = workspaceService.getWorkspacePath();
                File workDir = new File(cwd);
                StreamingProcessRunner runner = new StreamingProcessRunner(executor);

                switch (workspaceService.getProjectType()) {
                    case NODE -> {
                        // Install deps if node_modules is missing, then run dev
                        executor.submit(() -> {
                            if (!new File(workDir, "node_modules").isDirectory()) {
                                runner.run(List.of("npm", "install"), workDir, session, "npm install");
                            }
                            runner.run(List.of("npm", "run", "dev"), workDir, session, "npm run dev");
                        });
                    }
                    case MAVEN  -> runner.run(List.of("mvn", "spring-boot:run"), workDir, session, "mvn spring-boot:run");
                    case GRADLE -> runner.run(List.of(isWindows() ? "gradlew.bat" : "./gradlew", "bootRun"), workDir, session, "gradlew bootRun");
                    case PYTHON -> {
                        String entryPoint = new File(workDir, "main.py").isFile() ? "main.py"
                                         : new File(workDir, "app.py").isFile()  ? "app.py"
                                         : "main.py";
                        runner.run(List.of("python", entryPoint), workDir, session, "python " + entryPoint);
                    }
                    case RUST   -> runner.run(List.of("cargo", "run"), workDir, session, "cargo run");
                    default     -> {
                        try {
                            synchronized (session) {
                                if (session.isOpen()) {
                                    session.sendMessage(new org.springframework.web.socket.TextMessage(
                                        "\r\n\u001B[1;33m[AutoRunner]\u001B[0m Could not detect project type in: " + cwd +
                                        "\r\nRun 'ide help' for available commands.\r\n"
                                    ));
                                }
                            }
                        } catch (Exception ex) { log.warn("Failed to send unknown-type message", ex); }
                    }
                }
                return null;
            }
        });
        log.info("[AutoRunnerExtension] Activated — autoRun command registered");
    }

    @Override
    public void deactivate() {
        enabled.set(false);
        registry.removeCommand("autoRun");
        log.info("[AutoRunnerExtension] Deactivated");
    }

    private boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }
}
