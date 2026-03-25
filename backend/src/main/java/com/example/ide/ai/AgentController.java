package com.example.ide.ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/ai/agent")
public class AgentController {

    @Autowired
    private AgentService agentService;

    @PostMapping
    public SseEmitter runAgentStream(@RequestBody Map<String, String> request) {
        String prompt = request.getOrDefault("prompt", "");
        String workspaceRoot = request.getOrDefault("workspaceRoot", "");
        String modelName = request.getOrDefault("model", "qwen2.5-coder:7b");
        String activeFilePath = request.get("activeFilePath");
        String activeFileContent = request.get("activeFileContent");
        String selection = request.get("selection");

        SseEmitter emitter = new SseEmitter(600000L); // 10 minutes timeout

        if (prompt.isBlank()) {
            try {
                emitter.send(SseEmitter.event().data(Map.of("type", "error", "message", "Prompt is required")));
                emitter.complete();
            } catch (Exception e) {}
            return emitter;
        }

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                agentService.runAgentStream(prompt, workspaceRoot, modelName, activeFilePath, activeFileContent, selection, emitter);
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }
}
