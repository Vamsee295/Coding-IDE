package com.example.ide.extensions;

import com.example.ide.core.IDEExtension;
import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.core.commands.IDECommand;
import com.example.ide.core.events.IDEEvent;
import com.example.ide.core.events.SelectionChangeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * AI Code Enhancer Extension. Reacts to SelectionChangeEvent; exposes
 * ai.enhanceSelection and ai.explainCode (can call Ollama when configured).
 */
@Component
public class AIEnhancerExtension implements IDEExtension {

    private static final Logger log = LoggerFactory.getLogger(AIEnhancerExtension.class);

    private final AtomicBoolean enabled = new AtomicBoolean(false);
    private final AtomicReference<SelectionChangeEvent> lastSelection = new AtomicReference<>();
    private final CommandRegistry commandRegistry;

    public AIEnhancerExtension(CommandRegistry commandRegistry) {
        this.commandRegistry = commandRegistry;
    }

    @Override public String getId()          { return "ai-enhancer"; }
    @Override public String getName()        { return "AI Code Enhancer"; }
    @Override public String getDescription() { return "Inline AI suggestions and smart refactoring via Ollama"; }
    @Override public String getCategory()    { return "ai"; }
    @Override public boolean isEnabled()     { return enabled.get(); }

    @Override
    public void onEvent(IDEEvent event) {
        if (event instanceof SelectionChangeEvent && enabled.get()) {
            lastSelection.set((SelectionChangeEvent) event);
            log.debug("[AIEnhancerExtension] Selection updated ({} chars)", ((SelectionChangeEvent) event).getSelectedText().length());
        }
    }

    @Override
    public void activate() {
        enabled.set(true);
        commandRegistry.registerCommand(new IDECommand() {
            @Override public String getName()  { return "ai.enhanceSelection"; }
            @Override public String getLabel() { return "AI: Enhance Code"; }
            @Override public Object execute(java.util.Map<String, Object> payload) {
                log.info("[AIEnhancerExtension] Enhancing selection via Ollama...");
                // Future: call OllamaService with selection context
                return null;
            }
        });
        commandRegistry.registerCommand(new IDECommand() {
            @Override public String getName()  { return "ai.explainCode"; }
            @Override public String getLabel() { return "AI: Explain Code"; }
            @Override public Object execute(java.util.Map<String, Object> payload) {
                log.info("[AIEnhancerExtension] Explaining selection via Ollama...");
                return null;
            }
        });
        log.info("[AIEnhancerExtension] Activated — selection hooks + AI commands registered");
    }

    @Override
    public void deactivate() {
        enabled.set(false);
        lastSelection.set(null);
        commandRegistry.removeCommand("ai.enhanceSelection");
        commandRegistry.removeCommand("ai.explainCode");
        log.info("[AIEnhancerExtension] Deactivated");
    }

}
