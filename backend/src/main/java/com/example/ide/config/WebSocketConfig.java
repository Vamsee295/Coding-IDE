package com.example.ide.config;

import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.websocket.TerminalWebSocketHandler;
import com.example.ide.workspace.WorkspaceService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final WorkspaceService workspaceService;
    private final CommandRegistry  commandRegistry;

    public WebSocketConfig(WorkspaceService workspaceService, CommandRegistry commandRegistry) {
        this.workspaceService = workspaceService;
        this.commandRegistry  = commandRegistry;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Path is relative to context-path (/api), so endpoint is ws://localhost:8081/api/terminal
        registry.addHandler(
                new TerminalWebSocketHandler(workspaceService, commandRegistry),
                "/terminal"
            )
            .setAllowedOrigins("*"); // Allow frontend origin for WebSocket handshake
    }
}
