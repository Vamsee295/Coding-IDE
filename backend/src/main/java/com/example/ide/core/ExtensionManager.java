package com.example.ide.core;

import com.example.ide.core.events.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Central registry and lifecycle manager for all IDE extensions.
 * Subscribes to EventBus and forwards events to all enabled extensions (onEvent).
 */
@Service
public class ExtensionManager {

    private static final Logger log = LoggerFactory.getLogger(ExtensionManager.class);

    private final ApplicationContext ctx;
    private final EventBus eventBus;

    /** Thread-safe map: extensionId → extension instance */
    private final Map<String, IDEExtension> registry = new ConcurrentHashMap<>();

    public ExtensionManager(ApplicationContext ctx, EventBus eventBus) {
        this.ctx = ctx;
        this.eventBus = eventBus;
    }

    // ─── Startup auto-discovery + event forwarding ─────────────────────────────

    @PostConstruct
    public void init() {
        Map<String, IDEExtension> discovered = ctx.getBeansOfType(IDEExtension.class);
        discovered.values().forEach(this::registerExtension);
        subscribeEventBus();
        log.info("[ExtensionManager] {} extension(s) registered: {}",
                registry.size(),
                registry.keySet());
    }

    /** Forward all event types to enabled extensions. */
    private void subscribeEventBus() {
        eventBus.subscribe(FileOpenEvent.class, e -> dispatch(e));
        eventBus.subscribe(FileSaveEvent.class, e -> dispatch(e));
        eventBus.subscribe(EditorChangeEvent.class, e -> dispatch(e));
        eventBus.subscribe(SelectionChangeEvent.class, e -> dispatch(e));
        eventBus.subscribe(CommandExecuteEvent.class, e -> dispatch(e));
        log.debug("[ExtensionManager] Subscribed to EventBus");
    }

    private void dispatch(IDEEvent event) {
        for (IDEExtension ext : registry.values()) {
            if (ext.isEnabled()) {
                try {
                    ext.onEvent(event);
                } catch (Exception ex) {
                    log.warn("[ExtensionManager] Extension {} threw on event: {}", ext.getId(), ex.getMessage());
                }
            }
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    public void registerExtension(IDEExtension extension) {
        registry.put(extension.getId(), extension);
        if (extension.isEnabled()) {
            extension.activate();
            log.info("[ExtensionManager] Activated: {}", extension.getId());
        }
    }

    public void enableExtension(String id) {
        IDEExtension ext = getOrThrow(id);
        ext.activate();
        log.info("[ExtensionManager] Enabled: {}", id);
    }

    public void disableExtension(String id) {
        IDEExtension ext = getOrThrow(id);
        ext.deactivate();
        log.info("[ExtensionManager] Disabled: {}", id);
    }

    public List<ExtensionDTO> getAllExtensions() {
        return registry.values().stream()
                .sorted(Comparator.comparing(IDEExtension::getName))
                .map(ExtensionDTO::from)
                .collect(Collectors.toList());
    }

    public List<ExtensionDTO> getEnabledExtensions() {
        return registry.values().stream()
                .filter(IDEExtension::isEnabled)
                .sorted(Comparator.comparing(IDEExtension::getName))
                .map(ExtensionDTO::from)
                .collect(Collectors.toList());
    }

    public Optional<IDEExtension> findById(String id) {
        return Optional.ofNullable(registry.get(id));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private IDEExtension getOrThrow(String id) {
        IDEExtension ext = registry.get(id);
        if (ext == null) {
            throw new NoSuchElementException("Extension not found: " + id);
        }
        return ext;
    }
}
