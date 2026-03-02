package com.example.ide.workspace;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;

/**
 * Global singleton that holds the currently opened workspace path and its
 * detected project type.  All terminal sessions use this as the default cwd.
 */
@Service
public class WorkspaceService {

    private static final Logger log = LoggerFactory.getLogger(WorkspaceService.class);

    private final ProjectDetector detector;

    /** Volatile so reads from other threads always see the latest value. */
    private volatile String workspacePath;
    private volatile ProjectType projectType = ProjectType.UNKNOWN;

    public WorkspaceService(ProjectDetector detector) {
        this.detector = detector;
        // Default: backend's own root directory
        this.workspacePath = System.getProperty("user.dir");
        this.projectType   = detector.detect(this.workspacePath);
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Opens a new workspace folder.  Detects project type automatically.
     * @param path absolute path to open
     * @throws IllegalArgumentException if the path doesn't exist or isn't a directory
     */
    public void openWorkspace(String path) {
        File dir = new File(path);
        if (!dir.exists() || !dir.isDirectory()) {
            throw new IllegalArgumentException("Path does not exist or is not a directory: " + path);
        }
        this.workspacePath = dir.getAbsolutePath();
        this.projectType   = detector.detect(this.workspacePath);
        log.info("[WorkspaceService] Opened workspace: {} [{}]", workspacePath, projectType);
    }

    public String getWorkspacePath() {
        return workspacePath;
    }

    public ProjectType getProjectType() {
        return projectType;
    }
}
