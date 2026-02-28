package com.example.ide.core.commands;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Central registry for IDE commands.
 * Extensions call registerCommand() in their activate() method
 * and removeCommand() in deactivate().
 */
@Service
public class CommandRegistry {

    private static final Logger log = LoggerFactory.getLogger(CommandRegistry.class);

    private final Map<String, IDECommand> commands = new ConcurrentHashMap<>();

    public void registerCommand(IDECommand command) {
        commands.put(command.getName(), command);
        log.debug("[CommandRegistry] Registered: {}", command.getName());
    }

    public void removeCommand(String name) {
        commands.remove(name);
        log.debug("[CommandRegistry] Removed: {}", name);
    }

    /** Execute with no payload. */
    public void executeCommand(String name) {
        executeCommand(name, Map.of());
    }

    /** Execute with payload; returns command result (e.g. run output, formatted content). */
    public Object executeCommand(String name, Map<String, Object> payload) {
        IDECommand cmd = commands.get(name);
        if (cmd == null) {
            throw new NoSuchElementException("Command not found: " + name);
        }
        Map<String, Object> safePayload = payload != null ? Map.copyOf(payload) : Map.of();
        log.info("[CommandRegistry] Executing: {}", name);
        return cmd.execute(safePayload);
    }

    public Collection<IDECommand> getAllCommands() {
        return commands.values();
    }
}
