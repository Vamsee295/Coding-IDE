package com.example.ide.core;

/**
 * Data Transfer Object returned by the REST API.
 * Keeps the internal extension state decoupled from the HTTP contract.
 */
public record ExtensionDTO(
        String id,
        String name,
        String description,
        String category,
        String version,
        boolean enabled
) {
    public static ExtensionDTO from(IDEExtension ext) {
        return new ExtensionDTO(
                ext.getId(),
                ext.getName(),
                ext.getDescription(),
                ext.getCategory(),
                ext.getVersion(),
                ext.isEnabled()
        );
    }
}
