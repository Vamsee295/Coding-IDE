package com.example.ide.core.events;

/**
 * Fired when a file is saved. Content is mutable so extensions (e.g. Formatter)
 * can replace it; the controller returns the final content to the frontend.
 */
public final class FileSaveEvent implements IDEEvent {

    private final String path;
    private final String name;
    private final String language;
    private String content;

    public FileSaveEvent(String path, String name, String language, String content) {
        this.path = path;
        this.name = name;
        this.language = language != null ? language : "plaintext";
        this.content = content != null ? content : "";
    }

    public String getPath() { return path; }
    public String getName() { return name; }
    public String getLanguage() { return language; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content != null ? content : ""; }
}
