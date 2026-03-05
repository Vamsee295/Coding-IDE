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
            Map<String, Object> empty = new HashMap<>();
            empty.put("items", new ArrayList<>());
            empty.put("truncated", false);
            return ResponseEntity.ok(empty);
        }

        int LIMIT = 500;
        boolean truncated = files.length > LIMIT;
        
        List<Map<String, Object>> resultItems = new ArrayList<>();
        int count = 0;
        for (File file : files) {
            if (count >= LIMIT) break;
            
            Map<String, Object> item = new HashMap<>();
            item.put("name", file.getName());
            item.put("path", file.getAbsolutePath());
            item.put("type", file.isDirectory() ? "folder" : "file");
            item.put("size", file.length());
            item.put("lastModified", file.lastModified());
            resultItems.add(item);
            count++;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("items", resultItems);
        response.put("truncated", truncated);
        response.put("totalCount", files.length);

        return ResponseEntity.ok(response);
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

    /**
     * Creates a new directory
     */
    @PostMapping("/createFolder")
    public ResponseEntity<?> createFolder(@RequestBody Map<String, String> payload) {
        String pathStr = payload.get("path");
        if (pathStr == null) {
            return ResponseEntity.badRequest().body("Path is required");
        }

        try {
            Path dirPath = Paths.get(pathStr);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
                return ResponseEntity.ok("Folder created successfully");
            } else {
                return ResponseEntity.badRequest().body("Folder already exists");
            }
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Error creating folder: " + e.getMessage());
        }
    }

    /**
     * Deletes a file or directory
     */
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteItem(@RequestParam String path) {
        if (path == null) {
            return ResponseEntity.badRequest().body("Path is required");
        }

        try {
            Path itemPath = Paths.get(path);
            if (Files.exists(itemPath)) {
                deleteDirectoryRecursively(itemPath.toFile());
                return ResponseEntity.ok("Item deleted successfully");
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting item: " + e.getMessage());
        }
    }

    private void deleteDirectoryRecursively(File file) {
        File[] contents = file.listFiles();
        if (contents != null) {
            for (File f : contents) {
                deleteDirectoryRecursively(f);
            }
        }
        file.delete();
    }

    /**
     * Renames a file or directory
     */
    @PostMapping("/rename")
    public ResponseEntity<?> renameItem(@RequestBody Map<String, String> payload) {
        String oldPathStr = payload.get("oldPath");
        String newPathStr = payload.get("newPath");
        
        if (oldPathStr == null || newPathStr == null) {
            return ResponseEntity.badRequest().body("oldPath and newPath are required");
        }

        try {
            Path oldPath = Paths.get(oldPathStr);
            Path newPath = Paths.get(newPathStr);
            
            if (!Files.exists(oldPath)) {
                return ResponseEntity.notFound().build();
            }
            if (Files.exists(newPath)) {
                return ResponseEntity.badRequest().body("Destination already exists");
            }
            
            Files.move(oldPath, newPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            return ResponseEntity.ok("Item renamed successfully");
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Error renaming item: " + e.getMessage());
        }
    }

    /**
     * Searches for a query string in files within a directory recursively
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchFiles(@RequestParam String query, @RequestParam String rootPath) {
        if (query == null || query.isEmpty()) {
            return ResponseEntity.badRequest().body("Query is required");
        }
        File root = new File(rootPath);
        if (!root.exists() || !root.isDirectory()) {
            return ResponseEntity.notFound().build();
        }

        List<Map<String, Object>> results = new ArrayList<>();
        searchRecursive(root, query, results);
        return ResponseEntity.ok(results);
    }

    private void searchRecursive(File file, String query, List<Map<String, Object>> results) {
        File[] children = file.listFiles();
        if (children == null) return;

        for (File child : children) {
            if (child.isDirectory()) {
                String name = child.getName();
                if (name.equals("node_modules") || name.equals(".git") || name.equals("target") || name.equals("build") || name.equals(".next") || name.equals("dist")) {
                    continue;
                }
                searchRecursive(child, query, results);
            } else {
                try {
                    // Basic binary check: check if filename ends with common binary extensions
                    String name = child.getName().toLowerCase();
                    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || 
                        name.endsWith(".gif") || name.endsWith(".pdf") || name.endsWith(".exe") || 
                        name.endsWith(".dll") || name.endsWith(".class") || name.endsWith(".jar") ||
                        name.endsWith(".ico") || name.endsWith(".woff") || name.endsWith(".woff2")) {
                        continue;
                    }

                    List<String> lines = Files.readAllLines(child.toPath());
                    for (int i = 0; i < lines.size(); i++) {
                        String line = lines.get(i);
                        if (line.toLowerCase().contains(query.toLowerCase())) {
                            Map<String, Object> match = new HashMap<>();
                            match.put("path", child.getAbsolutePath());
                            match.put("line", i + 1);
                            match.put("content", line.trim());
                            results.add(match);
                            
                            if (results.size() >= 1000) return;
                        }
                    }
                } catch (Exception e) {
                    // Ignore binary files or read errors
                }
            }
            if (results.size() >= 1000) return;
        }
    }
}
