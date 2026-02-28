package com.example.ide.core;

import com.example.ide.core.events.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST endpoint for editor lifecycle events. Frontend sends events here;
 * backend publishes to EventBus so extensions (formatter, linter, etc.) can react.
 * For file-save, the response body is the possibly-modified content (e.g. after format).
 */
@RestController
@RequestMapping("/events")
public class EventController {

    private final EventBus eventBus;

    public EventController(EventBus eventBus) {
        this.eventBus = eventBus;
    }

    @PostMapping("/file-open")
    public ResponseEntity<Void> fileOpen(@RequestBody Map<String, String> body) {
        String path = body.get("path");
        String name = body.get("name");
        String language = body.get("language");
        eventBus.publish(new FileOpenEvent(path != null ? path : "", name != null ? name : "", language));
        return ResponseEntity.ok().build();
    }

    /**
     * File save: request body contains path, name, language, content.
     * Extensions (e.g. Formatter) may mutate content; we return the final content.
     */
    @PostMapping("/file-save")
    public ResponseEntity<Map<String, String>> fileSave(@RequestBody Map<String, Object> body) {
        String path = string(body.get("path"));
        String name = string(body.get("name"));
        String language = string(body.get("language"));
        String content = string(body.get("content"));
        FileSaveEvent event = new FileSaveEvent(path, name, language, content);
        eventBus.publish(event);
        return ResponseEntity.ok(Map.of("content", event.getContent()));
    }

    @PostMapping("/editor-change")
    public ResponseEntity<Void> editorChange(@RequestBody Map<String, Object> body) {
        String path = string(body.get("path"));
        String name = string(body.get("name"));
        String content = string(body.get("content"));
        String language = string(body.get("language"));
        eventBus.publish(new EditorChangeEvent(path, name, content, language));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/selection-change")
    public ResponseEntity<Void> selectionChange(@RequestBody Map<String, Object> body) {
        String path = string(body.get("path"));
        String name = string(body.get("name"));
        String selectedText = string(body.get("selectedText"));
        String language = string(body.get("language"));
        int startLine = intVal(body.get("startLine"), 0);
        int endLine = intVal(body.get("endLine"), 0);
        eventBus.publish(new SelectionChangeEvent(path, name, selectedText, language, startLine, endLine));
        return ResponseEntity.ok().build();
    }

    private static String string(Object o) {
        return o != null ? o.toString() : "";
    }

    private static int intVal(Object o, int def) {
        if (o == null) return def;
        if (o instanceof Number) return ((Number) o).intValue();
        try {
            return Integer.parseInt(o.toString());
        } catch (NumberFormatException e) {
            return def;
        }
    }
}
