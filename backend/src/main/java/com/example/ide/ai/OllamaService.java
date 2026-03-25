package com.example.ide.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class OllamaService {

    private static final Logger log = LoggerFactory.getLogger(OllamaService.class);
    private final RestTemplate restTemplate = new RestTemplate();
    private final String OLLAMA_URL = "http://localhost:11434/api/generate";

    /**
     * Helper method to call the LLM and return the raw string response block.
     * We assume the model is passed or default to "qwen2.5-coder:7b" (or whichever the user prefers).
     */
    public String callLLM(String prompt, String modelName) {
        log.info("[Agent Loop] Calling Ollama model: {}", modelName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("model", modelName);
        body.put("prompt", prompt);
        body.put("stream", false);

        // Can experiment with options like low temperature for agent reliability
        Map<String, Object> options = new HashMap<>();
        options.put("temperature", 0.0);
        body.put("options", options);

        try {
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.exchange(OLLAMA_URL, HttpMethod.POST, request, Map.class);
            
            if (response.getBody() != null && response.getBody().containsKey("response")) {
                 return response.getBody().get("response").toString();
            }
            return "{}";
        } catch (Exception e) {
            log.error("[Agent Loop] Error calling Ollama: ", e);
            throw new RuntimeException("LLM call failed: " + e.getMessage());
        }
    }
}
