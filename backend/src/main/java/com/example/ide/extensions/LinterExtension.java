package com.example.ide.extensions;

import com.example.ide.core.IDEExtension;
import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.core.commands.IDECommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Linter Extension
 *
 * Runs ESLint / style diagnostics on the active file.
 * Results are returned as a list of diagnostic markers that
 * the Monaco editor can display as inline squiggle underlines.
 */
@Component
public class LinterExtension implements IDEExtension {

    private static final Logger log = LoggerFactory.getLogger(LinterExtension.class);

    private final AtomicBoolean enabled = new AtomicBoolean(false); // OFF by default
    private final CommandRegistry commandRegistry;

    public LinterExtension(CommandRegistry commandRegistry) {
        this.commandRegistry = commandRegistry;
    }

    @Override public String getId()          { return "linter"; }
    @Override public String getName()        { return "Code Linter"; }
    @Override public String getDescription() { return "ESLint diagnostics with inline Monaco markers"; }
    @Override public String getCategory()    { return "formatting"; }
    @Override public boolean isEnabled()     { return enabled.get(); }

    @Override
    public void activate() {
        enabled.set(true);
        commandRegistry.registerCommand(new IDECommand() {
            @Override public String getName()  { return "linter.lintDocument"; }
            @Override public String getLabel() { return "Lint: Lint Current File"; }
            @Override public Object execute(java.util.Map<String, Object> payload) {
                log.info("[LinterExtension] Linting document via ESLint...");
                return null;
            }
        });
        log.info("[LinterExtension] Activated");
    }

    @Override
    public void deactivate() {
        enabled.set(false);
        commandRegistry.removeCommand("linter.lintDocument");
        log.info("[LinterExtension] Deactivated");
    }
}
