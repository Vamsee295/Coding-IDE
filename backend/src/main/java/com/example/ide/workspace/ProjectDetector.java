package com.example.ide.workspace;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;

/**
 * Scans a workspace directory and detects its project type by looking
 * for well-known marker files (package.json, pom.xml, etc.).
 */
@Component
public class ProjectDetector {

    private static final Logger log = LoggerFactory.getLogger(ProjectDetector.class);

    /**
     * Detect the project type at the given root directory.
     * Precedence: NODE > MAVEN > GRADLE > PYTHON > RUST > UNKNOWN
     */
    public ProjectType detect(String rootPath) {
        if (rootPath == null || rootPath.isBlank()) {
            return ProjectType.UNKNOWN;
        }

        File root = new File(rootPath);
        if (!root.exists() || !root.isDirectory()) {
            log.warn("[ProjectDetector] Path does not exist or is not a directory: {}", rootPath);
            return ProjectType.UNKNOWN;
        }

        if (hasFile(root, "package.json"))     return log(rootPath, ProjectType.NODE);
        if (hasFile(root, "pom.xml"))          return log(rootPath, ProjectType.MAVEN);
        if (hasFile(root, "build.gradle"))     return log(rootPath, ProjectType.GRADLE);
        if (hasFile(root, "requirements.txt")) return log(rootPath, ProjectType.PYTHON);
        if (hasFile(root, "pyproject.toml"))   return log(rootPath, ProjectType.PYTHON);
        if (hasFile(root, "Cargo.toml"))       return log(rootPath, ProjectType.RUST);

        // Deep check — look one level down (useful for monorepos)
        File[] children = root.listFiles(File::isDirectory);
        if (children != null) {
            for (File child : children) {
                if (hasFile(child, "package.json")) return log(rootPath, ProjectType.NODE);
                if (hasFile(child, "pom.xml"))      return log(rootPath, ProjectType.MAVEN);
            }
        }

        return log(rootPath, ProjectType.UNKNOWN);
    }

    private boolean hasFile(File dir, String filename) {
        return new File(dir, filename).isFile();
    }

    private ProjectType log(String path, ProjectType type) {
        log.info("[ProjectDetector] Detected {} at: {}", type, path);
        return type;
    }
}
