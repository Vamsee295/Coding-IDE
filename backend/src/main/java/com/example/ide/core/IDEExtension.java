package com.example.ide.core;

import com.example.ide.core.events.IDEEvent;

/**
 * Core contract that every IDE extension must implement.
 * Extensions are discovered by Spring via component scanning and
 * auto-registered into the ExtensionManager on startup.
 * Implement onEvent() to react to editor lifecycle events (file-save, selection-change, etc.).
 */
public interface IDEExtension {

    /** Unique machine-readable identifier, e.g. "formatter" */
    String getId();

    /** Human-readable display name */
    String getName();

    /** Short one-line description shown in the Extensions panel */
    String getDescription();

    /** Category shown in UI: "formatting", "ai", "tools", "vcs" */
    default String getCategory() { return "tools"; }

    /** Semantic version string, e.g. "1.0.0" */
    default String getVersion() { return "1.0.0"; }

    /** Whether the extension is currently active */
    boolean isEnabled();

    /** Called when the extension is switched ON */
    void activate();

    /** Called when the extension is switched OFF */
    void deactivate();

    /**
     * Called when an IDE event is published. Only invoked when this extension is enabled.
     * Override to react to FileSaveEvent, SelectionChangeEvent, etc.
     */
    default void onEvent(IDEEvent event) {}
}
