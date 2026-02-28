package com.example.ide.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/fs")
public class FileSystemController {

    /**
     * Lists the contents of a directory (shallow scan for lazy loading)
     */
    @GetMapping("/list")
    public ResponseEntity<?> listDirectory(@RequestParam String path) {
        File directory = new File(path);
        
        if (!directory.exists() || !directory.isDirectory()) {
            return ResponseEntity.notFound().build();
        }

        File[] files = directory.listFiles();
        if (files == null) {
            return ResponseEntity.ok(new ArrayList<>());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (File file : files) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", file.getName());
            item.put("path", file.getAbsolutePath());
            item.put("type", file.isDirectory() ? "folder" : "file");
            item.put("size", file.length());
            item.put("lastModified", file.lastModified());
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Reads the content of a file
     */
    @GetMapping("/read")
    public ResponseEntity<?> readFile(@RequestParam String path) {
        try {
            Path filePath = Paths.get(path);
            if (!Files.exists(filePath) || Files.isDirectory(filePath)) {
                return ResponseEntity.notFound().build();
            }
            String content = Files.readString(filePath);
            return ResponseEntity.ok(content);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Error reading file: " + e.getMessage());
        }
    }

    /**
     * Writes content to a file
     */
    @PostMapping("/write")
    public ResponseEntity<?> writeFile(@RequestBody Map<String, String> payload) {
        String pathStr = payload.get("path");
        String content = payload.get("content");
        
        if (pathStr == null || content == null) {
            return ResponseEntity.badRequest().body("Path and content are required");
        }

        try {
            Path filePath = Paths.get(pathStr);
            Files.writeString(filePath, content);
            return ResponseEntity.ok("File saved successfully");
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Error writing file: " + e.getMessage());
        }
    }

    /**
     * Basic check for directory existence (used for "Opening" a project)
     */
    @GetMapping("/exists")
    public ResponseEntity<?> checkExists(@RequestParam String path) {
        File file = new File(path);
        Map<String, Object> result = new HashMap<>();
        result.put("exists", file.exists());
        result.put("isDirectory", file.isDirectory());
        result.put("name", file.getName());
        return ResponseEntity.ok(result);
    }
}
