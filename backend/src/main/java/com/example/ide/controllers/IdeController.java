package com.example.ide.controllers;

import com.example.ide.models.FileItem;
import com.example.ide.models.Project;
import com.example.ide.repositories.FileItemRepository;
import com.example.ide.repositories.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/projects")
public class IdeController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private FileItemRepository fileItemRepository;

    // --- PROJECT ENDPOINTS ---

    @GetMapping
    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    @PostMapping
    public Project createProject(@RequestBody Map<String, String> payload) {
        Project project = new Project(payload.get("name"), payload.get("description"));
        if (payload.containsKey("rootPath")) {
            project.setRootPath(payload.get("rootPath"));
        }
        return projectRepository.save(project);
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<Project> getProject(@PathVariable(name = "projectId") String projectId) {
        return projectRepository.findById(projectId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(@PathVariable(name = "projectId") String projectId) {
        if (projectRepository.existsById(projectId)) {
            // Also delete all files by project (cascading could handle this in DB too)
            List<FileItem> files = fileItemRepository.findByProjectId(projectId);
            fileItemRepository.deleteAll(files);
            
            projectRepository.deleteById(projectId);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // --- FILE/WORKSPACE ENDPOINTS ---

    @GetMapping("/{projectId}/files")
    public ResponseEntity<List<FileItem>> getProjectFiles(@PathVariable(name = "projectId") String projectId) {
        if (!projectRepository.existsById(projectId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(fileItemRepository.findByProjectId(projectId));
    }

    @PostMapping("/{projectId}/files")
    public ResponseEntity<FileItem> createFile(
            @PathVariable(name = "projectId") String projectId,
            @RequestBody Map<String, String> payload) {

        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String name = payload.get("name");
        String type = payload.get("type"); // "file" or "folder"
        String parentId = payload.get("parentId");

        FileItem parent = null;
        if (parentId != null && !parentId.isEmpty() && !parentId.equals("root")) {
            Optional<FileItem> parentOpt = fileItemRepository.findById(parentId);
            if (parentOpt.isPresent()) {
                parent = parentOpt.get();
            }
        }

        FileItem item = new FileItem(name, type, projectOpt.get(), parent);
        if (payload.containsKey("content")) {
            item.setContent(payload.get("content"));
        }

        FileItem savedItem = fileItemRepository.save(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedItem);
    }

    @PutMapping("/files/{fileId}")
    public ResponseEntity<FileItem> updateFile(
            @PathVariable(name = "fileId") String fileId,
            @RequestBody Map<String, String> payload) {

        return fileItemRepository.findById(fileId).map(item -> {
            if (payload.containsKey("name")) {
                item.setName(payload.get("name"));
            }
            if (payload.containsKey("content")) {
                item.setContent(payload.get("content"));
            }
            return ResponseEntity.ok(fileItemRepository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable(name = "fileId") String fileId) {
        // Find children and delete them first
        List<FileItem> children = fileItemRepository.findByParentId(fileId);
        if (!children.isEmpty()) {
            fileItemRepository.deleteAll(children);
        }

        if (fileItemRepository.existsById(fileId)) {
            fileItemRepository.deleteById(fileId);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
