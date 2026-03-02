package com.example.ide.extensions.language;

import com.example.ide.core.IDEExtension;
import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.core.commands.IDECommand;
import com.example.ide.workspace.StreamingProcessRunner;
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
 * Extension that registers language installation commands.
 * Commands stream real-time output back via WebSocket using winget (Windows).
 *
 * Commands:
 *   installNode   → winget install OpenJS.NodeJS
 *   installPython → winget install Python.Python.3
 *   installJava   → winget install Microsoft.OpenJDK.21
 *   installMaven  → winget install Apache.Maven
 */
@Component
public class LanguageManagerExtension implements IDEExtension {

    private static final Logger log = LoggerFactory.getLogger(LanguageManagerExtension.class);

    private final CommandRegistry registry;
    private final AtomicBoolean enabled = new AtomicBoolean(true);
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public LanguageManagerExtension(CommandRegistry registry) {
        this.registry = registry;
    }

    // ─── IDEExtension contract ─────────────────────────────────────────────

    @Override public String getId()          { return "language-manager"; }
    @Override public String getName()        { return "Language Manager"; }
    @Override public String getDescription() { return "Install Node, Python, Java, Maven via IDE terminal"; }
    @Override public String getCategory()    { return "tools"; }
    @Override public String getVersion()     { return "1.0.0"; }
    @Override public boolean isEnabled()     { return enabled.get(); }

    @Override
    public void activate() {
        enabled.set(true);
        registerInstallCommand("installNode",   "Install Node.js",  List.of("winget", "install", "--id", "OpenJS.NodeJS",          "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"));
        registerInstallCommand("installPython", "Install Python",   List.of("winget", "install", "--id", "Python.Python.3",        "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"));
        registerInstallCommand("installJava",   "Install Java 21",  List.of("winget", "install", "--id", "Microsoft.OpenJDK.21",   "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"));
        registerInstallCommand("installMaven",  "Install Maven",    List.of("winget", "install", "--id", "Apache.Maven",           "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"));
        log.info("[LanguageManagerExtension] Activated — 4 install commands registered");
    }

    @Override
    public void deactivate() {
        enabled.set(false);
        List.of("installNode", "installPython", "installJava", "installMaven")
            .forEach(registry::removeCommand);
        log.info("[LanguageManagerExtension] Deactivated");
    }

    // ─── Helper ───────────────────────────────────────────────────────────

    private void registerInstallCommand(String name, String label, List<String> cmd) {
        registry.registerCommand(new IDECommand() {
            @Override public String getName()  { return name; }
            @Override public String getLabel() { return label; }

            @Override
            public Object execute(Map<String, Object> payload) {
                WebSocketSession session = (WebSocketSession) payload.get("session");
                if (session == null || !session.isOpen()) {
                    log.warn("[LanguageManagerExtension] No active session for command: {}", name);
                    return null;
                }
                String workDir = (String) payload.getOrDefault("cwd", System.getProperty("user.dir"));
                new StreamingProcessRunner(executor).run(cmd, new File(workDir), session, label);
                return null; // output is streamed async
            }
        });
    }
}
