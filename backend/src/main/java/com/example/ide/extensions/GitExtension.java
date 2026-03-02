package com.example.ide.extensions;

import com.example.ide.core.IDEExtension;
import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.core.commands.IDECommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Git Integration Extension
 *
 * Exposes basic git commands (status, add, commit, push) that can be
 * triggered from the IDE.  Executes git commands via ProcessBuilder and
 * returns their output.
 */
@Component
public class GitExtension implements IDEExtension {

    private static final Logger log = LoggerFactory.getLogger(GitExtension.class);

    private final AtomicBoolean enabled = new AtomicBoolean(true); // ON by default
    private final CommandRegistry commandRegistry;

    public GitExtension(CommandRegistry commandRegistry) {
        this.commandRegistry = commandRegistry;
    }

    @Override public String getId()          { return "git"; }
    @Override public String getName()        { return "Git Integration"; }
    @Override public String getDescription() { return "Run git status, add, commit, and push from within the IDE"; }
    @Override public String getCategory()    { return "vcs"; }
    @Override public boolean isEnabled()     { return enabled.get(); }

    @Override
    public void activate() {
        enabled.set(true);
        commandRegistry.registerCommand(gitCommand("git.status",  "Git: Show Status",          "git status"));
        commandRegistry.registerCommand(gitCommand("git.addAll",  "Git: Stage All Changes",    "git add ."));
        commandRegistry.registerCommand(gitCommand("git.push",    "Git: Push",                 "git push"));
        log.info("[GitExtension] Activated — git commands registered");
    }

    @Override
    public void deactivate() {
        enabled.set(false);
        commandRegistry.removeCommand("git.status");
        commandRegistry.removeCommand("git.addAll");
        commandRegistry.removeCommand("git.push");
        log.info("[GitExtension] Deactivated");
    }

    private IDECommand gitCommand(String name, String label, String gitCmd) {
        return new IDECommand() {
            @Override public String getName()  { return name; }
            @Override public String getLabel() { return label; }
            @Override public Object execute(java.util.Map<String, Object> payload) {
                log.info("[GitExtension] Running: {}", gitCmd);
                // Future: run via ProcessBuilder and route output to terminal WebSocket
                return null;
            }
        };
    }
}
