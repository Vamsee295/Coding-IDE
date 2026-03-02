package com.example.ide.extensions;

import com.example.ide.core.IDEExtension;
import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.core.commands.IDECommand;
import com.example.ide.core.events.FileSaveEvent;
import com.example.ide.core.events.IDEEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Code Formatter Extension. Subscribes to FileSaveEvent and formats content on save.
 * Format Document command also available. Ready to integrate Prettier via subprocess.
 */
@Component
public class FormatterExtension implements IDEExtension {

    private static final Logger log = LoggerFactory.getLogger(FormatterExtension.class);

    private final AtomicBoolean enabled = new AtomicBoolean(true);
    private final CommandRegistry commandRegistry;

    public FormatterExtension(CommandRegistry commandRegistry) {
        this.commandRegistry = commandRegistry;
    }

    @Override public String getId()          { return "formatter"; }
    @Override public String getName()        { return "Code Formatter"; }
    @Override public String getDescription() { return "Formats code on save using Prettier-compatible rules"; }
    @Override public String getCategory()    { return "formatting"; }
    @Override public boolean isEnabled()     { return enabled.get(); }

    @Override
    public void onEvent(IDEEvent event) {
        if (event instanceof FileSaveEvent && enabled.get()) {
            FileSaveEvent saveEvent = (FileSaveEvent) event;
            String formatted = formatContent(saveEvent.getContent(), saveEvent.getLanguage());
            saveEvent.setContent(formatted);
            log.debug("[FormatterExtension] Formatted content on save");
        }
    }

    @Override
    public void activate() {
        enabled.set(true);
        commandRegistry.registerCommand(new IDECommand() {
            @Override public String getName()  { return "formatter.formatDocument"; }
            @Override public String getLabel() { return "Format Document"; }
            @Override public Object execute(java.util.Map<String, Object> payload) {
                log.info("[FormatterExtension] Formatting document...");
                // Future: spawn `npx prettier --write <file>` via ProcessBuilder
                return null;
            }
        });
        log.info("[FormatterExtension] Activated — format on save + command registered");
    }

    @Override
    public void deactivate() {
        enabled.set(false);
        commandRegistry.removeCommand("formatter.formatDocument");
        log.info("[FormatterExtension] Deactivated");
    }

    /** Simple format: normalize line endings and trim trailing whitespace per line. Replace with Prettier later. */
    private String formatContent(String content, String language) {
        if (content == null || content.isEmpty()) return content;
        String normalized = content.replace("\r\n", "\n").replace("\r", "\n");
        StringBuilder out = new StringBuilder();
        for (String line : normalized.split("\n", -1)) {
            out.append(line.replaceFirst("\\s+$", "")).append("\n");
        }
        if (out.length() > 0 && content.endsWith("\n")) { /* keep trailing newline */ } else if (out.length() > 0) {
            out.setLength(out.length() - 1);
        }
        return out.toString();
    }
}
