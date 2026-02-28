package com.example.ide.core.events;

/**
 * Fired when the user changes selection in the editor (e.g. for AI enhance/explain).
 */
public final class SelectionChangeEvent implements IDEEvent {

    private final String path;
    private final String name;
    private final String selectedText;
    private final String language;
    private final int startLine;
    private final int endLine;

    public SelectionChangeEvent(String path, String name, String selectedText, String language, int startLine, int endLine) {
        this.path = path;
        this.name = name;
        this.selectedText = selectedText != null ? selectedText : "";
        this.language = language != null ? language : "plaintext";
        this.startLine = startLine;
        this.endLine = endLine;
    }

    public String getPath() { return path; }
    public String getName() { return name; }
    public String getSelectedText() { return selectedText; }
    public String getLanguage() { return language; }
    public int getStartLine() { return startLine; }
    public int getEndLine() { return endLine; }
}
