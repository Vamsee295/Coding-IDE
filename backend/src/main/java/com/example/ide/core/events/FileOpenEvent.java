package com.example.ide.core.events;

import java.util.Objects;

/** Fired when a file is opened in the editor. */
public final class FileOpenEvent implements IDEEvent {

    private final String path;
    private final String name;
    private final String language;

    public FileOpenEvent(String path, String name, String language) {
        this.path = path;
        this.name = name;
        this.language = language != null ? language : "plaintext";
    }

    public String getPath() { return path; }
    public String getName() { return name; }
    public String getLanguage() { return language; }
}
