package com.example.ide.websocket;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class TerminalWebSocketHandler extends TextWebSocketHandler {

    // Dangerous commands that will be blocked for safety
    private static final List<String> BLOCKED_COMMANDS = Arrays.asList(
        "format", "shutdown", "poweroff", "halt", "reboot",
        "rm -rf /", "rm -rf /*", "del /s /q c:\\", "del /f /s /q c:\\",
        "mkfs", "dd if=/dev/zero", ":(){:|:&};:"
    );

    // Per-session current working directory
    private final Map<String, File> sessionCwd = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Start in the user home directory
        File home = new File(System.getProperty("user.home"));
        sessionCwd.put(session.getId(), home);
        String welcome = "\r\n\u001B[1;32mStackFlow Terminal\u001B[0m — connected\r\n"
            + "\u001B[90mType 'help' for tips. Working directory: " + home.getAbsolutePath() + "\u001B[0m\r\n";
        synchronized (session) {
            session.sendMessage(new TextMessage(welcome));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String rawCommand = message.getPayload().trim();

        if (rawCommand.isEmpty()) return;

        // Check blocked commands
        String lowerCmd = rawCommand.toLowerCase();
        for (String blocked : BLOCKED_COMMANDS) {
            if (lowerCmd.contains(blocked)) {
                sendText(session, "\r\n\u001B[1;31mBlocked:\u001B[0m This command is restricted for safety.\r\n");
                return;
            }
        }

        File cwd = sessionCwd.getOrDefault(session.getId(), new File(System.getProperty("user.home")));

        // Handle 'cd' specially — update the in-memory CWD
        if (lowerCmd.startsWith("cd")) {
            String[] parts = rawCommand.split("\\s+", 2);
            if (parts.length < 2 || parts[1].isBlank()) {
                // cd with no args → home
                File newDir = new File(System.getProperty("user.home"));
                sessionCwd.put(session.getId(), newDir);
                sendText(session, "\r\n");
                return;
            }
            String target = parts[1].trim();
            File newDir = new File(target).isAbsolute()
                ? new File(target)
                : new File(cwd, target);
            try {
                newDir = newDir.getCanonicalFile();
            } catch (Exception ignored) {}

            if (newDir.exists() && newDir.isDirectory()) {
                sessionCwd.put(session.getId(), newDir);
                sendText(session, "\r\n");
            } else {
                sendText(session, "\r\n\u001B[1;31mcd:\u001B[0m No such directory: " + target + "\r\n");
            }
            return;
        }

        // Handle 'clear' / 'cls'
        if (lowerCmd.equals("clear") || lowerCmd.equals("cls")) {
            sendText(session, "\u001B[2J\u001B[H"); // ANSI clear screen
            return;
        }

        // Build the OS command
        boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
        String[] cmdArray = isWindows
            ? new String[]{"cmd.exe", "/c", rawCommand}
            : new String[]{"/bin/bash", "-c", rawCommand};

        // Execute in a virtual thread to avoid blocking
        String sessionId = session.getId();
        File capturedCwd = cwd;
        Thread.ofVirtual().start(() -> {
            try {
                ProcessBuilder builder = new ProcessBuilder(cmdArray);
                builder.directory(capturedCwd);
                builder.redirectErrorStream(true); // merge stderr into stdout
                Process process = builder.start();

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (session.isOpen()) {
                            sendText(session, line + "\r\n");
                        }
                    }
                }

                int exitCode = process.waitFor();
                if (session.isOpen()) {
                    if (exitCode != 0) {
                        sendText(session, "\u001B[90m[exit " + exitCode + "]\u001B[0m\r\n");
                    }
                }
            } catch (Exception e) {
                try {
                    if (session.isOpen()) {
                        sendText(session, "\r\n\u001B[1;31mError:\u001B[0m " + e.getMessage() + "\r\n");
                    }
                } catch (Exception ignored) {}
            }
        });
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionCwd.remove(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessionCwd.remove(session.getId());
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    private void sendText(WebSocketSession session, String text) throws Exception {
        synchronized (session) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(text));
            }
        }
    }
}
