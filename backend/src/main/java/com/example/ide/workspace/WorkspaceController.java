package com.example.ide.workspace;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST endpoints for workspace management.
 *
 * POST /api/workspace/open  { "path": "X:\\..." }
 * GET  /api/workspace/info  → { path, type }
 */
@RestController
@RequestMapping("/workspace")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    /** Open a folder as the active workspace. */
    @PostMapping("/open")
    public ResponseEntity<?> openWorkspace(@RequestBody Map<String, String> body) {
        String path = body.get("path");
        if (path == null || path.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "path is required"));
        }
        try {
            workspaceService.openWorkspace(path);
            return ResponseEntity.ok(Map.of(
                "path", workspaceService.getWorkspacePath(),
                "type", workspaceService.getProjectType().name()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Get current workspace info (path + detected project type). */
    @GetMapping("/info")
    public ResponseEntity<?> getWorkspaceInfo() {
        return ResponseEntity.ok(Map.of(
            "path", workspaceService.getWorkspacePath() != null ? workspaceService.getWorkspacePath() : "",
            "type", workspaceService.getProjectType().name()
        ));
    }

    /**
     * Get just the current workspace path — matches the spec:
     *  GET /api/workspace/current → { "path": "X:\\..." }
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentPath() {
        String path = workspaceService.getWorkspacePath();
        return ResponseEntity.ok(Map.of("path", path != null ? path : ""));
    }
}
