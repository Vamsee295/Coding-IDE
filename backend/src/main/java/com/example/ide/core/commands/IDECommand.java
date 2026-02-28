package com.example.ide.core.commands;

import java.util.Map;

/**
 * Core contract for all IDE commands.
 * Extensions can register commands on activate() so they become
 * available through the CommandRegistry. Use execute(payload) for
 * parameterized commands (e.g. runFile with path/content).
 */
public interface IDECommand {

    /** Unique machine-readable name, e.g. "formatter.formatDocument" */
    String getName();

    /** Human-readable label for command palette */
    default String getLabel() { return getName(); }

    /** Execute with no payload. Default calls execute(Map.of()). */
    default void execute() {
        execute(Map.of());
    }

    /**
     * Execute with payload (e.g. path, content, language). Return value can be
     * sent back to frontend (e.g. run output, formatted content). Use null if no return.
     */
    Object execute(Map<String, Object> payload);
}
