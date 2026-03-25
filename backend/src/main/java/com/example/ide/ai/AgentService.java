package com.example.ide.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@Service
public class AgentService {

    private static final Logger log = LoggerFactory.getLogger(AgentService.class);
    private static final int MAX_ITERATIONS = 10;

    @Autowired private OllamaService ollamaService;
    @Autowired private ToolExecutor toolExecutor;
    @Autowired private ContextService contextService;

    private final ObjectMapper mapper = new ObjectMapper();

    // ─── Streaming Agent (primary entry point) ───────────────────────────────

    public void runAgentStream(String userPrompt, String workspaceRoot, String modelName,
                               String activeFilePath, String activeFileContent,
                               String selection, SseEmitter emitter) {
        log.info("=== Agent Stream Start: {} ===", userPrompt);

        String stateLog = "User Request: " + userPrompt + "\n";
        int iterations = 0;
        String finalOutput = "";

        try {
            for (int i = 1; i <= MAX_ITERATIONS; i++) {
                iterations = i;
                log.info("--- Iteration {} ---", i);

                // ── Think ──────────────────────────────────────────────────
                emit(emitter, Map.of(
                    "type", "thought",
                    "message", "Thinking... (Step " + i + ")"
                ));

                String context = contextService.buildContext(
                    workspaceRoot, stateLog, activeFilePath, activeFileContent, selection);
                String fullPrompt = buildMasterPrompt(context);
                String llmResponse = ollamaService.callLLM(fullPrompt, modelName);
                log.debug("LLM raw:\n{}", llmResponse);

                // ── Parse ──────────────────────────────────────────────────
                AgentAction action = parseSingleAction(llmResponse);

                if (action == null) {
                    log.info("No action returned — agent stalled.");
                    finalOutput = extractFinalSummary(llmResponse);
                    if (finalOutput == null) finalOutput = llmResponse.trim();
                    break;
                }

                // Emit the plan/step metadata
                if (action.getStep() != null || action.getPlan() != null) {
                    emit(emitter, Map.of(
                        "type", "step",
                        "step",  action.getStep()  != null ? action.getStep()  : "",
                        "plan",  action.getPlan()  != null ? action.getPlan()  : "",
                        "reason",action.getReason()!= null ? action.getReason(): ""
                    ));
                }

                // ── Terminal check ─────────────────────────────────────────
                if (action.isFinal()) {
                    finalOutput = action.getFinalSummary() != null ? action.getFinalSummary() : "Task complete.";
                    log.info("Agent marked isFinal. Summary: {}", finalOutput);
                    break;
                }

                // ── Execute Tool ───────────────────────────────────────────
                if (action.getType() != null) {
                    String label = buildActionLabel(action);
                    emit(emitter, Map.of(
                        "type",  "action",
                        "tool",  action.getType(),
                        "label", label,
                        "path",  action.getPath()    != null ? action.getPath()    : "",
                        "command", action.getCommand()!= null ? action.getCommand() : "",
                        "query", action.getQuery()   != null ? action.getQuery()   : ""
                    ));

                    String result = toolExecutor.execute(action, workspaceRoot);
                    boolean success = !result.startsWith("Error");

                    // Add to state so LLM sees what happened
                    stateLog += "[Step " + i + "] Tool: " + action.getType()
                              + (action.getPath() != null ? " on " + action.getPath() : "")
                              + "\nResult: " + truncate(result, 2000) + "\n\n";

                    emit(emitter, Map.of(
                        "type",    "result",
                        "success", success,
                        "tool",    action.getType(),
                        "result",  truncate(result, 800)
                    ));

                    if (!success) {
                        log.warn("Tool error at step {}: {}", i, result);
                        stateLog += "[ERROR — agent should recover]\n";
                    }
                }
            }

            // ── Done ────────────────────────────────────────────────────────
            emit(emitter, Map.of(
                "type",       "done",
                "success",    true,
                "output",     finalOutput != null ? finalOutput : "",
                "iterations", iterations
            ));
            emitter.complete();

        } catch (Exception e) {
            log.error("Agent stream error", e);
            try {
                emit(emitter, Map.of("type", "error", "message", e.getMessage()));
            } catch (Exception ignored) {}
            emitter.completeWithError(e);
        }
    }

    // ─── Synchronous fallback ─────────────────────────────────────────────────

    public String runAgent(String userPrompt, String workspaceRoot, String modelName,
                           String activeFilePath, String activeFileContent, String selection) {
        log.info("=== Agent Sync Start: {} ===", userPrompt);
        String stateLog = "User Request: " + userPrompt + "\n";
        String finalOutput = "";

        for (int i = 1; i <= MAX_ITERATIONS; i++) {
            String context = contextService.buildContext(
                workspaceRoot, stateLog, activeFilePath, activeFileContent, selection);
            String llmResponse = ollamaService.callLLM(buildMasterPrompt(context), modelName);
            AgentAction action = parseSingleAction(llmResponse);

            if (action == null || action.isFinal()) {
                finalOutput = action != null ? action.getFinalSummary() : extractFinalSummary(llmResponse);
                break;
            }
            String result = toolExecutor.execute(action, workspaceRoot);
            stateLog += "[Step " + i + "] " + action.getType() + ": " + truncate(result, 2000) + "\n";
        }
        return "Agent Run Complete.\n\n" + (finalOutput != null ? finalOutput : "No summary provided.");
    }

    // ─── Master System Prompt ─────────────────────────────────────────────────

    private String buildMasterPrompt(String context) {
        return
            "You are an autonomous AI software engineer integrated inside a local IDE.\n" +
            "Your role is to act like a Cursor/Antigravity AI agent that can understand, modify, and execute code inside a project.\n\n" +

            "🧠 SYSTEM CAPABILITIES\n" +
            "You have access to the following tools:\n" +
            "1. readFile(path)        → Returns full content of a file\n" +
            "2. writeFile(path, content) → Overwrites file with updated content\n" +
            "3. applyDiff(path, diff)    → Applies a unified diff patch to a file (preferred over full rewrite)\n" +
            "4. createFile(path, content) → Creates a new file\n" +
            "5. deleteFile(path)      → Deletes a file\n" +
            "6. runCommand(command)   → Executes a terminal command\n" +
            "7. search(query)         → Finds relevant files/snippets in project\n" +
            "8. listFiles(path)       → Lists all files in a directory (depth 4)\n\n" +

            "🎯 YOUR OBJECTIVE\n" +
            "Given a user request, you must:\n" +
            "1. Understand the problem clearly\n" +
            "2. Identify relevant files using search or listFiles\n" +
            "3. Read necessary files BEFORE making changes\n" +
            "4. Plan minimal and correct modifications\n" +
            "5. Execute ONE action per response\n" +
            "6. Verify the result by re-reading if needed\n" +
            "7. Set isFinal: true ONLY when the task is fully complete\n\n" +

            "📏 STRICT RULES\n" +
            "* NEVER modify a file without reading it first\n" +
            "* NEVER assume code — always verify with readFile or search\n" +
            "* ALWAYS prefer applyDiff over writeFile for edits\n" +
            "* ONLY modify files relevant to the task\n" +
            "* DO NOT delete files unless absolutely required\n" +
            "* KEEP changes minimal and safe\n" +
            "* ONE action per JSON response\n\n" +

            "⚠️ SAFETY RULES\n" +
            "* DO NOT run destructive commands\n" +
            "* DO NOT access files outside the project workspace\n" +
            "* DO NOT break existing working code\n\n" +

            "📤 OUTPUT FORMAT — STRICT JSON ONLY (no other text)\n" +
            "```json\n" +
            "{\n" +
            "  \"step\": \"short description of current step\",\n" +
            "  \"plan\": \"what you are trying to do overall\",\n" +
            "  \"action\": {\n" +
            "    \"type\": \"readFile | writeFile | applyDiff | createFile | deleteFile | runCommand | search | listFiles\",\n" +
            "    \"path\": \"file path if applicable\",\n" +
            "    \"content\": \"full content if writeFile/createFile\",\n" +
            "    \"diff\": \"patch diff if applyDiff\",\n" +
            "    \"command\": \"terminal command if runCommand\",\n" +
            "    \"query\": \"search query if search\"\n" +
            "  },\n" +
            "  \"reason\": \"why this action is needed\",\n" +
            "  \"isFinal\": false,\n" +
            "  \"finalSummary\": \"When isFinal is true, explain what was done. Otherwise leave empty.\"\n" +
            "}\n" +
            "```\n\n" +

            "📌 When task is complete, set isFinal to true and fill finalSummary.\n\n" +
            "--- CURRENT PROJECT CONTEXT & STATE ---\n" +
            context;
    }

    // ─── Parsing ──────────────────────────────────────────────────────────────

    /**
     * Parses the LLM response to extract a SINGLE AgentAction.
     * Handles the "action" wrapper from the new schema.
     */
    private AgentAction parseSingleAction(String response) {
        try {
            String json = extractJson(response);
            if (json == null) {
                log.warn("No JSON block found in LLM response");
                return null;
            }

            JsonNode root = mapper.readTree(json);

            AgentAction wrapper = new AgentAction();

            if (root.has("step"))   wrapper.setStep(root.get("step").asText());
            if (root.has("plan"))   wrapper.setPlan(root.get("plan").asText());
            if (root.has("reason")) wrapper.setReason(root.get("reason").asText());
            if (root.has("isFinal")) wrapper.setFinal(root.get("isFinal").asBoolean(false));
            if (root.has("finalSummary")) wrapper.setFinalSummary(root.get("finalSummary").asText());

            // If isFinal without action, just return the wrapper
            if (wrapper.isFinal()) return wrapper;

            // Parse nested action object
            if (root.has("action") && !root.get("action").isNull()) {
                JsonNode actionNode = root.get("action");
                if (actionNode.has("type")) wrapper.setType(actionNode.get("type").asText());
                if (actionNode.has("path")) wrapper.setPath(actionNode.get("path").asText());
                if (actionNode.has("content")) wrapper.setContent(actionNode.get("content").asText());
                if (actionNode.has("diff")) wrapper.setDiff(actionNode.get("diff").asText());
                if (actionNode.has("command")) wrapper.setCommand(actionNode.get("command").asText());
                if (actionNode.has("query")) wrapper.setQuery(actionNode.get("query").asText());
            }

            // Fallback: flat structure (old format)
            if (wrapper.getType() == null && root.has("type")) {
                return mapper.treeToValue(root, AgentAction.class);
            }

            return wrapper.getType() != null || wrapper.isFinal() ? wrapper : null;

        } catch (Exception e) {
            log.warn("Failed to parse LLM JSON: {}", e.getMessage());
            return null;
        }
    }

    private String extractJson(String response) {
        if (response == null) return null;
        // Try ```json ... ```
        if (response.contains("```json")) {
            int start = response.indexOf("```json") + 7;
            int end = response.indexOf("```", start);
            if (end > start) return response.substring(start, end).trim();
        }
        // Try bare { ... }
        int start = response.indexOf('{');
        int end   = response.lastIndexOf('}');
        if (start >= 0 && end > start) return response.substring(start, end + 1);
        return null;
    }

    private String extractFinalSummary(String response) {
        try {
            String json = extractJson(response);
            if (json == null) return null;
            JsonNode root = mapper.readTree(json);
            if (root.has("finalSummary") && !root.get("finalSummary").asText().isBlank()) {
                return root.get("finalSummary").asText();
            }
            if (root.has("finalMessage") && !root.get("finalMessage").asText().isBlank()) {
                return root.get("finalMessage").asText();
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String buildActionLabel(AgentAction a) {
        switch (a.getType() != null ? a.getType() : "") {
            case "readFile":   case "read_file":   return "Reading " + a.getPath();
            case "writeFile":  case "write_file":  return "Writing " + a.getPath();
            case "createFile": case "create_file": return "Creating " + a.getPath();
            case "applyDiff":  case "apply_diff":  return "Patching " + a.getPath();
            case "deleteFile": case "delete_file": return "Deleting " + a.getPath();
            case "runCommand": case "run_command": return "Running: " + a.getCommand();
            case "search":                         return "Searching: " + a.getQuery();
            case "listFiles":  case "list_files":  return "Listing " + (a.getPath() != null ? a.getPath() : "workspace");
            default: return a.getType();
        }
    }

    private void emit(SseEmitter emitter, Map<String, Object> data) {
        try {
            emitter.send(SseEmitter.event().data(mapper.writeValueAsString(data)));
        } catch (Exception e) {
            log.warn("Failed to emit SSE event: {}", e.getMessage());
        }
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) + "..." : s;
    }
}
