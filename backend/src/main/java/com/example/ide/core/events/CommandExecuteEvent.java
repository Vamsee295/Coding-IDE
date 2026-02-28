package com.example.ide.core.events;

import java.util.Map;

/**
 * Fired when a command is executed (for logging or chaining).
 */
public final class CommandExecuteEvent implements IDEEvent {

    private final String commandName;
    private final Map<String, Object> payload;
    private final Object result;

    public CommandExecuteEvent(String commandName, Map<String, Object> payload, Object result) {
        this.commandName = commandName;
        this.payload = payload != null ? Map.copyOf(payload) : Map.of();
        this.result = result;
    }

    public String getCommandName() { return commandName; }
    public Map<String, Object> getPayload() { return payload; }
    public Object getResult() { return result; }
}
