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
            return executeWithFallback(endpoint, url -> {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> ollamaBody = new java.util.HashMap<>();
                ollamaBody.put("model", model);
                ollamaBody.put("prompt", prompt);
                ollamaBody.put("stream", false);
                
                if (payload.containsKey("images")) {
                    ollamaBody.put("images", payload.get("images"));
                }

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(ollamaBody, headers);

                return restTemplate.exchange(
                    url + "/api/generate",
                    HttpMethod.POST,
                    request,
                    Map.class
                );
            });
        } catch (Exception e) {
            log.error("[OllamaProxy] Error calling Ollama: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error", "Failed to connect to Ollama at " + endpoint,
                    "details", e.getMessage(),
                    "exception", e.getClass().getSimpleName(),
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
            @RequestParam(name = "endpoint", defaultValue = "http://localhost:11434") String endpoint) {
        try {
            return executeWithFallback(endpoint, url -> restTemplate.getForEntity(url + "/api/tags", String.class));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "connected", false,
                "error", e.getMessage(),
                "hint", "Run: ollama serve"
            ));
        }
    }

    /**
     * GET /ai/models
     * Fetches locally installed models from Ollama.
     */
    @GetMapping("/models")
    public ResponseEntity<?> getModels(
            @RequestParam(name = "endpoint", defaultValue = "http://localhost:11434") String endpoint) {
        try {
            return executeWithFallback(endpoint, url -> restTemplate.getForEntity(url + "/api/tags", Map.class));
        } catch (Exception e) {
            log.error("[OllamaProxy] Error fetching models: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error", "Failed to fetch models from " + endpoint,
                    "details", e.getMessage(),
                    "exception", e.getClass().getSimpleName()
                ));
        }
    }

    /**
     * POST /ai/pull
     * Triggers Ollama to pull a model. Note: This could take a while.
     */
    @PostMapping("/pull")
    public ResponseEntity<?> pullModel(@RequestBody Map<String, Object> payload) {
        String endpoint = "http://localhost:11434";
        Object customEndpoint = payload.get("ollamaEndpoint");
        if (customEndpoint != null && !customEndpoint.toString().isBlank()) {
            endpoint = customEndpoint.toString();
        }

        String modelName = payload.getOrDefault("model", "").toString();
        if (modelName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Model name is required"));
        }

        log.info("[OllamaProxy] Pulling model={} at {}", modelName, endpoint);

        try {
            return executeWithFallback(endpoint, url -> {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> ollamaBody = new java.util.HashMap<>();
                ollamaBody.put("model", modelName);
                // Non-streaming for simpler frontend handling of the response, though for large models streaming is ideal.
                ollamaBody.put("stream", false);

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(ollamaBody, headers);

                return restTemplate.exchange(
                    url + "/api/pull",
                    HttpMethod.POST,
                    request,
                    Map.class
                );
            });
        } catch (Exception e) {
            log.error("[OllamaProxy] Error pulling model: {}", e.getMessage());
            return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error", "Failed to pull model " + modelName,
                    "details", e.getMessage()
                ));
        }
    }

    /**
     * POST /ai/stream
     * Proxies a streaming chat/completion request to Ollama's /api/generate endpoint.
     * Relays NDJSON chunks from Ollama as a streaming HTTP response so the
     * frontend can read tokens in real time via ReadableStream.
     */
    @PostMapping("/stream")
    public ResponseEntity<org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody> stream(
            @RequestBody Map<String, Object> payload) {

        String endpoint = "http://localhost:11434";
        Object customEndpoint = payload.get("ollamaEndpoint");
        if (customEndpoint != null && !customEndpoint.toString().isBlank()) {
            endpoint = customEndpoint.toString();
        }

        String model = payload.getOrDefault("model", "qwen2.5-coder:7b").toString();
        String prompt = payload.getOrDefault("prompt", "").toString();

        log.info("[OllamaProxy] Streaming model={} at {}", model, endpoint);

        // Build Ollama request body
        Map<String, Object> ollamaBody = new java.util.HashMap<>();
        ollamaBody.put("model", model);
        ollamaBody.put("prompt", prompt);
        ollamaBody.put("stream", true);

        if (payload.containsKey("images")) {
            ollamaBody.put("images", payload.get("images"));
        }

        String bodyJson;
        try {
            bodyJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(ollamaBody);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize request", e);
        }

        // Try localhost, fallback to 127.0.0.1
        final String primaryUrl = endpoint + "/api/generate";
        final String fallbackUrl = endpoint.contains("localhost")
                ? endpoint.replace("localhost", "127.0.0.1") + "/api/generate"
                : null;

        org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody responseBody = outputStream -> {
            java.net.HttpURLConnection conn = null;
            try {
                try {
                    conn = tryConnect(primaryUrl, bodyJson);
                } catch (Exception e) {
                    if (fallbackUrl != null) {
                        log.warn("[OllamaProxy] Streaming fallback to 127.0.0.1");
                        conn = tryConnect(fallbackUrl, bodyJson);
                    } else {
                        throw e;
                    }
                }

                try (java.io.InputStream inputStream = conn.getInputStream()) {
                    byte[] buffer = new byte[1024];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                        outputStream.flush();
                    }
                } finally {
                    if (conn != null) conn.disconnect();
                }
            } catch (Exception e) {
                log.error("[OllamaProxy] Streaming error: {}", e.getMessage());
                // For StreamingResponseBody, we can't easily change the status code here
                // as the headers might have already been sent, but we can log it.
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_NDJSON)
                .body(responseBody);
    }

    private java.net.HttpURLConnection tryConnect(String url, String bodyJson) throws Exception {
        java.net.URL apiUrl = new java.net.URI(url).toURL();
        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) apiUrl.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(300000); // 5 min for long generations
        try (java.io.OutputStream os = conn.getOutputStream()) {
            os.write(bodyJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            os.flush();
        }
        return conn;
    }


    /**
     * Executes the given provider with the provided endpoint.
     * If the endpoint contains "localhost" and the request fails, it automatically retries with "127.0.0.1".
     * This handles common IPv6 resolution issues on Windows.
     */
    private <T> ResponseEntity<T> executeWithFallback(String endpoint, java.util.function.Function<String, ResponseEntity<T>> provider) {
        try {
            return provider.apply(endpoint);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            if (endpoint.contains("localhost")) {
                log.warn("[OllamaProxy] Failed to connect using localhost, retrying with 127.0.0.1...");
                String fallbackEndpoint = endpoint.replace("localhost", "127.0.0.1");
                return provider.apply(fallbackEndpoint);
            }
            throw e;
        }
    }
}
