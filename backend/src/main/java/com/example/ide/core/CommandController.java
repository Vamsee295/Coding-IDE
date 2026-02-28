package com.example.ide.core;

import com.example.ide.core.commands.CommandRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

/**
 * REST API to execute IDE commands (e.g. runFile, formatter.formatDocument).
 * Frontend calls POST /commands/{name} with optional payload; returns command result.
 */
@RestController
@RequestMapping("/commands")
public class CommandController {

    private final CommandRegistry commandRegistry;

    public CommandController(CommandRegistry commandRegistry) {
        this.commandRegistry = commandRegistry;
    }

    @PostMapping("/{name}")
    public ResponseEntity<?> execute(@PathVariable String name, @RequestBody(required = false) Map<String, Object> body) {
        try {
            Map<String, Object> payload = body != null ? body : Map.of();
            Object result = commandRegistry.executeCommand(name, payload);
            return ResponseEntity.ok(Map.of("result", result != null ? result : ""));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
