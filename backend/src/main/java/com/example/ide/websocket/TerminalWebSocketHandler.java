package com.example.ide.websocket;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class TerminalWebSocketHandler extends TextWebSocketHandler {

    // Dangerous commands that will be blocked before sending to shell
    private static final List<String> BLOCKED_COMMANDS = Arrays.asList(
        "format ", "shutdown", "poweroff", "halt", "reboot",
        "rm -rf /", "rm -rf /*", "del /s /q c:\\", "del /f /s /q c:\\",
        "mkfs", "dd if=/dev/zero", ":(){:|:&};:"
    );

    /** Holds the live process + its stdin writer per WebSocket session */
    private record TerminalSession(Process process, BufferedWriter writer) {}

    private final Map<String, TerminalSession> sessions = new ConcurrentHashMap<>();

    // ─── Connection opened ───────────────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");

        ProcessBuilder pb;
        if (isWindows) {
            pb = new ProcessBuilder(
                "powershell.exe",
                "-NoLogo",       // suppress copyright banner
                "-NoExit",       // keep shell alive after each command
                "-Command", "-"  // read commands from stdin
            );
        } else {
            pb = new ProcessBuilder("/bin/bash", "--login");
            pb.environment().put("TERM", "xterm-256color");
        }

        // Set working directory if provided in query string (e.g., ?cwd=/path/to/project)
        URI uri = session.getUri();
        if (uri != null && uri.getQuery() != null) {
            String query = uri.getQuery();
            for (String param : query.split("&")) {
                if (param.startsWith("cwd=")) {
                    String cwdPath = param.substring(4);
                    // simple URL decode (handling spaces if passed as %20 or +)
                    cwdPath = java.net.URLDecoder.decode(cwdPath, java.nio.charset.StandardCharsets.UTF_8);
                    File dir = new File(cwdPath);
                    if (dir.exists() && dir.isDirectory()) {
                        pb.directory(dir);
                    }
                    break;
                }
            }
        }

        pb.redirectErrorStream(true); // merge stderr → stdout
        Process process = pb.start();

        BufferedWriter writer = new BufferedWriter(
                new OutputStreamWriter(process.getOutputStream()));

        sessions.put(session.getId(), new TerminalSession(process, writer));

        // Background virtual thread: continuously stream shell output → WebSocket
        Thread.ofVirtual().start(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                char[] buf = new char[512];
                int len;
                while ((len = reader.read(buf, 0, buf.length)) != -1) {
                    if (!session.isOpen()) break;
                    String chunk = new String(buf, 0, len);
                    // Normalize line endings for xterm
                    chunk = chunk.replace("\r\n", "\r\n").replace("\n", "\r\n");
                    sendText(session, chunk);
                }
            } catch (Exception e) {
                try {
                    sendText(session, "\r\n\u001B[1;31m[Shell exited]\u001B[0m\r\n");
                } catch (Exception ignored) {}
            }
        });
    }

    // ─── Command received ────────────────────────────────────────────────────

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String command = message.getPayload();

        // Block dangerous commands
        String lower = command.toLowerCase().trim();
        for (String blocked : BLOCKED_COMMANDS) {
            if (lower.startsWith(blocked) || lower.contains(blocked)) {
                sendText(session,
                    "\r\n\u001B[1;31m[StackFlow]\u001B[0m Command blocked for safety: " + blocked + "\r\n");
                return;
            }
        }

        TerminalSession ts = sessions.get(session.getId());
        if (ts == null || !ts.process().isAlive()) {
            sendText(session, "\r\n\u001B[1;31m[Shell not running]\u001B[0m Please reconnect.\r\n");
            return;
        }

        // Send command to shell stdin — the shell handles execution + prompt
        ts.writer().write(command + "\n");
        ts.writer().flush();
    }

    // ─── Connection closed ───────────────────────────────────────────────────

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        killSession(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        killSession(session.getId());
        if (session.isOpen()) session.close(CloseStatus.SERVER_ERROR);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void killSession(String sessionId) {
        TerminalSession ts = sessions.remove(sessionId);
        if (ts != null) {
            ts.process().destroyForcibly();
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
