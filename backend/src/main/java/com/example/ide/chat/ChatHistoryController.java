package com.example.ide.chat;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat/history")
public class ChatHistoryController {

    @Autowired
    private ChatHistoryService chatHistoryService;

    @PostMapping("/save")
    public ResponseEntity<?> saveChat(@RequestBody Map<String, String> request) {
        String projectPath = request.get("projectPath");
        String chatId = request.get("chatId");
        String messageJson = request.get("messageJson");

        if (projectPath == null || chatId == null || messageJson == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
        }

        chatHistoryService.saveMessage(projectPath, chatId, messageJson);
        return ResponseEntity.ok(Map.of("status", "success"));
    }

    @GetMapping("/dates")
    public ResponseEntity<?> getAvailableDates(@RequestParam String projectPath) {
        if (projectPath == null || projectPath.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "projectPath is required"));
        }
        List<String> dates = chatHistoryService.getAvailableDates(projectPath);
        return ResponseEntity.ok(dates);
    }

    @GetMapping("/chats")
    public ResponseEntity<?> getChatsByDate(@RequestParam String projectPath, @RequestParam String date) {
        if (projectPath == null || date == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "projectPath and date are required"));
        }
        List<String> chats = chatHistoryService.getChatsByDate(projectPath, date);
        return ResponseEntity.ok(chats);
    }

    @GetMapping("/chat")
    public ResponseEntity<?> loadChat(@RequestParam String projectPath, @RequestParam String date, @RequestParam String id) {
        if (projectPath == null || date == null || id == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "projectPath, date, and id are required"));
        }
        String chatJson = chatHistoryService.loadChat(projectPath, date, id);
        
        // Return as raw string since it's already a JSON string, or let Spring auto-serialize a map
        // For simplicity and to avoid double-serialization, we wrap it in a standard response format or return raw string with correct content type.
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(chatJson);
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteChat(@RequestParam String projectPath, @RequestParam String date, @RequestParam String id) {
        if (projectPath == null || date == null || id == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "projectPath, date, and id are required"));
        }
        chatHistoryService.deleteChat(projectPath, date, id);
        return ResponseEntity.ok(Map.of("status", "success"));
    }

    @PostMapping("/rename")
    public ResponseEntity<?> renameChat(@RequestBody Map<String, String> request) {
        String projectPath = request.get("projectPath");
        String date = request.get("date");
        String id = request.get("id");
        String newTitle = request.get("newTitle");

        if (projectPath == null || date == null || id == null || newTitle == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
        }

        chatHistoryService.renameChatTitle(projectPath, date, id, newTitle);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}
