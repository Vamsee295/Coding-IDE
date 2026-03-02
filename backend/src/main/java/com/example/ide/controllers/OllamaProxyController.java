package com.example.ide.controllers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Proxy controller for Ollama API.
 * Relays requests from the frontend to the local Ollama instance,
 * bypassing CORS restrictions that prevent the browser from directly
 * calling localhost:11434.
 */
@RestController
@RequestMapping("/ai")
public class OllamaProxyController {

    private static final Logger log = LoggerFactory.getLogger(OllamaProxyController.class);
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * POST /ai/generate
     * Proxies a chat/completion request to Ollama's /api/generate endpoint.
     * Accepts: { model, prompt }
     * Returns: Ollama's raw response or an error message.
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody Map<String, Object> payload) {
        String endpoint = "http://localhost:11434";
        Object customEndpoint = payload.get("ollamaEndpoint");
        if (customEndpoint != null && !customEndpoint.toString().isBlank()) {
            endpoint = customEndpoint.toString();
        }

        String model = payload.getOrDefault("model", "qwen2.5-coder:7b").toString();
        String prompt = payload.getOrDefault("prompt", "").toString();

        log.info("[OllamaProxy] Calling model={} at {}", model, endpoint);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> ollamaBody = Map.of(
                "model", model,
                "prompt", prompt,
                "stream", false
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(ollamaBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                endpoint + "/api/generate",
                HttpMethod.POST,
                request,
                Map.class
            );

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            log.error("[OllamaProxy] Error calling Ollama: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error", "Failed to connect to Ollama at " + endpoint,
                    "details", e.getMessage(),
                    "hint", "Make sure Ollama is running (ollama serve) and the model is pulled: ollama pull " + model
                ));
        }
    }

    /**
     * GET /ai/status
     * Checks if Ollama is reachable.
     */
    @GetMapping("/status")
    public ResponseEntity<?> status(
            @RequestParam(defaultValue = "http://localhost:11434") String endpoint) {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(endpoint + "/api/tags", String.class);
            return ResponseEntity.ok(Map.of("connected", true, "status", response.getStatusCode().value()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "connected", false,
                "error", e.getMessage(),
                "hint", "Run: ollama serve"
            ));
        }
    }
}
