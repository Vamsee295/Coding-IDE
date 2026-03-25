package com.example.ide.ai;

import lombok.Data;

@Data
public class AgentAction {
    // Core action fields
    private String type;    // readFile, writeFile, applyDiff, createFile, deleteFile, runCommand, search, listFiles
    private String path;
    private String content;
    private String command;
    private String diff;
    private String query;   // for search

    // Step-level metadata (from LLM response)
    private String step;
    private String plan;
    private String reason;

    // Terminal condition
    private boolean isFinal;
    private String finalSummary;
}
