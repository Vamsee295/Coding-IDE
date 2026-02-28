package com.example.ide.core.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Type-safe event bus. Listeners subscribe by event type; publish runs
 * synchronously so request/response flows (e.g. file-save → format) work.
 */
@Service
public class EventBus {

    private static final Logger log = LoggerFactory.getLogger(EventBus.class);

    private final List<Subscription> listeners = new CopyOnWriteArrayList<>();

    /**
     * Subscribe to an event type. The listener is invoked when publish(event) is called
     * with an instance of that type.
     */
    public <T extends IDEEvent> void subscribe(Class<T> eventType, Consumer<T> listener) {
        listeners.add(new Subscription(eventType, e -> listener.accept(eventType.cast(e))));
        log.debug("[EventBus] Subscribed to {}", eventType.getSimpleName());
    }

    /**
     * Publish an event to all subscribers of its type. Runs synchronously.
     */
    public void publish(IDEEvent event) {
        if (event == null) return;
        Class<?> eventClass = event.getClass();
        for (Subscription sub : listeners) {
            if (sub.eventType.isInstance(event)) {
                try {
                    sub.listener.accept(event);
                } catch (Exception e) {
                    log.warn("[EventBus] Listener error for {}: {}", eventClass.getSimpleName(), e.getMessage());
                }
            }
        }
    }

    private static class Subscription {
        final Class<? extends IDEEvent> eventType;
        final Consumer<IDEEvent> listener;

        Subscription(Class<? extends IDEEvent> eventType, Consumer<IDEEvent> listener) {
            this.eventType = eventType;
            this.listener = listener;
        }
    }
}
