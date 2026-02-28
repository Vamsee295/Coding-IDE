package com.example.ide.core;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * REST API for managing IDE extensions.
 *
 * Endpoints:
 *   GET  /api/extensions              — list all extensions
 *   GET  /api/extensions/enabled      — list only enabled
 *   POST /api/extensions/{id}/enable  — enable a specific extension
 *   POST /api/extensions/{id}/disable — disable a specific extension
 */
@RestController
@RequestMapping("/extensions")
public class ExtensionController {

    private final ExtensionManager extensionManager;

    public ExtensionController(ExtensionManager extensionManager) {
        this.extensionManager = extensionManager;
    }

    /** Returns all registered extensions */
    @GetMapping
    public List<ExtensionDTO> getAllExtensions() {
        return extensionManager.getAllExtensions();
    }

    /** Returns only currently enabled extensions */
    @GetMapping("/enabled")
    public List<ExtensionDTO> getEnabledExtensions() {
        return extensionManager.getEnabledExtensions();
    }

    /** Enable an extension by ID */
    @PostMapping("/{id}/enable")
    public ResponseEntity<?> enable(@PathVariable String id) {
        try {
            extensionManager.enableExtension(id);
            return extensionManager.findById(id)
                    .map(ext -> ResponseEntity.ok(ExtensionDTO.from(ext)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** Disable an extension by ID */
    @PostMapping("/{id}/disable")
    public ResponseEntity<?> disable(@PathVariable String id) {
        try {
            extensionManager.disableExtension(id);
            return extensionManager.findById(id)
                    .map(ext -> ResponseEntity.ok(ExtensionDTO.from(ext)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
