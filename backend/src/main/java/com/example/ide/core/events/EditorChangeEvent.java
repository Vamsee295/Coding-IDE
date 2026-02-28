package com.example.ide.core.events;

/**
 * Fired when editor content changes (debounced from frontend).
 */
public final class EditorChangeEvent implements IDEEvent {

    private final String path;
    private final String name;
    private final String content;
    private final String language;

    public EditorChangeEvent(String path, String name, String content, String language) {
        this.path = path;
        this.name = name;
        this.content = content != null ? content : "";
        this.language = language != null ? language : "plaintext";
    }

    public String getPath() { return path; }
    public String getName() { return name; }
    public String getContent() { return content; }
    public String getLanguage() { return language; }
}
