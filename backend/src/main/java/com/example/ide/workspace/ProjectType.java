package com.example.ide.workspace;

/**
 * Represents the detected type of the currently open workspace/project.
 */
public enum ProjectType {
    NODE,     // package.json
    MAVEN,    // pom.xml
    GRADLE,   // build.gradle
    PYTHON,   // requirements.txt / pyproject.toml
    RUST,     // Cargo.toml
    UNKNOWN
}
