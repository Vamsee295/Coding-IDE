package com.example.ide.websocket;

import com.example.ide.core.commands.CommandRegistry;
import com.example.ide.workspace.WorkspaceService;
import com.pty4j.PtyProcess;
import com.pty4j.WinSize;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket handler for the IDE persistent terminal.
 *
 * Every connection gets ONE long-lived shell process.
 * Commands prefixed with "ide " are intercepted and routed to the CommandRegistry.
 * All other input is passed directly to the shell (PowerShell / bash).
 */
public class TerminalWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TerminalWebSocketHandler.class);

    // Dangerous OS-level commands — blocked before reaching the shell
    private static final List<String> BLOCKED_COMMANDS = Arrays.asList(
        "format ", "shutdown", "poweroff", "halt", "reboot",
        "rm -rf /", "rm -rf /*", "del /s /q c:\\", "del /f /s /q c:\\",
        "mkfs", "dd if=/dev/zero", ":(){:|:&};:"
    );

    // Map IDE command aliases → CommandRegistry names
    private static final Map<String, String> IDE_COMMAND_MAP = Map.of(
        "install node",   "installNode",
        "install python", "installPython",
        "install java",   "installJava",
        "install maven",  "installMaven",
        "run",            "autoRun"
    );

    private static final String IDE_HELP =
        "\r\n\u001B[1;36m╔══ StackFlow IDE Commands ══╗\u001B[0m\r\n" +
        "\u001B[1;36m║\u001B[0m  \u001B[1mide run\u001B[0m              — start dev server for current project\r\n" +
        "\u001B[1;36m║\u001B[0m  \u001B[1mide install node\u001B[0m     — install Node.js via winget\r\n" +
        "\u001B[1;36m║\u001B[0m  \u001B[1mide install python\u001B[0m   — install Python 3 via winget\r\n" +
        "\u001B[1;36m║\u001B[0m  \u001B[1mide install java\u001B[0m     — install OpenJDK 21 via winget\r\n" +
        "\u001B[1;36m║\u001B[0m  \u001B[1mide install maven\u001B[0m    — install Apache Maven via winget\r\n" +
        "\u001B[1;36m║\u001B[0m  \u001B[1mide help\u001B[0m              — show this help\r\n" +
        "\u001B[1;36m╚════════════════════════════╝\u001B[0m\r\n";

    /** Holds the live process, optional PTY (for resize), and stdin writer per WebSocket session */
    private record TerminalSession(Process process, PtyProcess ptyProcess, BufferedWriter writer) {}

    private final Map<String, TerminalSession> sessions = new ConcurrentHashMap<>();

    private final WorkspaceService workspaceService;
    private final CommandRegistry  commandRegistry;

    public TerminalWebSocketHandler(WorkspaceService workspaceService, CommandRegistry commandRegistry) {
        this.workspaceService = workspaceService;
        this.commandRegistry  = commandRegistry;
    }

    // ─── Connection opened ───────────────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");

        // Resolve working directory — prefer ?cwd= param, fallback to WorkspaceService
        String cwdPath = extractCwd(session);
        if (cwdPath == null || cwdPath.isBlank()) {
            cwdPath = workspaceService.getWorkspacePath();
        }
        File cwdDir = new File(cwdPath);
        String cwdAbs = cwdDir.exists() && cwdDir.isDirectory() ? cwdDir.getAbsolutePath() : cwdPath;

        Process process;
        PtyProcess ptyProcess = null;
        boolean usePty = false;

        // Prefer pty4j for real PTY (prompt, colors, resize)
        try {
            Map<String, String> env = new HashMap<>(System.getenv());
            if (!isWindows) env.put("TERM", "xterm-256color");
            String[] command = isWindows
                ? new String[] { "powershell.exe", "-NoLogo", "-NoExit" }
                : new String[] { "/bin/bash", "--login" };
            ptyProcess = PtyProcess.exec(command, env, cwdAbs);
            process = ptyProcess;
            usePty = true;
            log.info("[Terminal] Session {} using PTY (pty4j), cwd: {}", session.getId(), cwdAbs);
        } catch (Throwable e) {
            log.warn("[Terminal] pty4j not available, using ProcessBuilder: {}", e.getMessage());
            ProcessBuilder pb;
            if (isWindows) {
                String setLocCmd = "Set-Location '" + cwdPath.replace("'", "''") + "'";
                pb = new ProcessBuilder(
                    "powershell.exe", "-NoLogo", "-NoExit", "-Command", setLocCmd
                );
            } else {
                pb = new ProcessBuilder("/bin/bash", "--login");
                pb.environment().put("TERM", "xterm-256color");
            }
            if (cwdDir.exists() && cwdDir.isDirectory()) pb.directory(cwdDir);
            pb.redirectErrorStream(true);
            process = pb.start();
        }

        BufferedWriter writer = new BufferedWriter(
            new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
        sessions.put(session.getId(), new TerminalSession(process, ptyProcess, writer));

        // Navigate to workspace directory via stdin (works for both PTY and fallback)
        try {
            String escapedCwd = cwdAbs.replace("'", "''");
            writer.write("Set-Location '" + escapedCwd + "'\r\n");
            writer.flush();
        } catch (Exception e) {
            log.warn("[Terminal] Could not set initial cwd: {}", e.getMessage());
        }

        // Stream shell output → WebSocket (final for lambda)
        // NOTE: PTY output already contains \r\n — do NOT replace \n with \r\n here
        final Process shellProcess = process;
        Thread.ofVirtual().start(() -> {
            try {
                byte[] buf = new byte[4096];
                int len;
                var stream = shellProcess.getInputStream();
                while ((len = stream.read(buf, 0, buf.length)) != -1) {
                    if (!session.isOpen()) break;
                    String chunk = new String(buf, 0, len, StandardCharsets.UTF_8);
                    sendText(session, chunk);
                }
            } catch (Exception e) {
                if (session.isOpen()) {
                    try { sendText(session, "\r\n\u001B[1;31m[Shell exited]\u001B[0m\r\n"); }
                    catch (Exception ignored) {}
                }
            }
        });
    }

    // ─── Incoming message ────────────────────────────────────────────────────

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String raw = message.getPayload();

        // 1. Resize packet — JSON sent by term.onResize / onopen
        if (raw.length() > 2 && raw.charAt(0) == '{') {
            if (raw.contains("\"type\":\"resize\"") || raw.contains("\"type\": \"resize\"")) {
                int cols = parseIntAttr(raw, "cols", 80);
                int rows = parseIntAttr(raw, "rows", 24);
                TerminalSession ts = sessions.get(session.getId());
                if (ts != null && ts.ptyProcess() != null && ts.process().isAlive()) {
                    try {
                        ts.ptyProcess().setWinSize(new WinSize(cols, rows));
                    } catch (Exception e) {
                        log.debug("[Terminal] setWinSize failed: {}", e.getMessage());
                    }
                }
                return;
            }
        }

        // 2. Get the shell session — needed by all following paths
        TerminalSession ts = sessions.get(session.getId());
        if (ts == null || !ts.process().isAlive()) {
            sendText(session, "\r\n\u001B[1;31m[Shell not running]\u001B[0m Please reconnect.\r\n");
            return;
        }

        // 3. Safety filter & ide-command interception only apply to whole-line input
        //    (raw.length() > 4 skips single raw keystrokes sent by AttachAddon)
        if (raw.length() > 4) {
            String lower = raw.toLowerCase().trim();
            for (String blocked : BLOCKED_COMMANDS) {
                if (lower.startsWith(blocked) || lower.contains(blocked)) {
                    sendText(session, "\r\n\u001B[1;31m[StackFlow]\u001B[0m Blocked: " + blocked + "\r\n");
                    return;
                }
            }
            if (lower.startsWith("ide ")) {
                String sub = lower.replaceAll("[\\r\\n]+$", "").substring(4).trim();
                handleIdeCommand(sub, session);
                return;
            }
        }

        // 4. Pass raw bytes directly to PTY stdin — NO \n appended.
        //    AttachAddon sends each keystroke as its own message (including \r for Enter).
        //    The PTY shell's line discipline handles everything.
        ts.writer().write(raw);
        ts.writer().flush();
    }

    private static int parseIntAttr(String json, String key, int fallback) {
        String search = "\"" + key + "\":";
        int idx = json.indexOf(search);
        if (idx < 0) return fallback;
        idx += search.length();
        int end = idx;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '-')) end++;
        if (idx == end) return fallback;
        try {
            return Integer.parseInt(json.substring(idx, end).trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    // ─── IDE command router ──────────────────────────────────────────────────

    private void handleIdeCommand(String sub, WebSocketSession session) throws Exception {
        if (sub.equals("help")) {
            sendText(session, IDE_HELP);
            return;
        }

        String cmdName = IDE_COMMAND_MAP.get(sub);
        if (cmdName == null) {
            sendText(session,
                "\r\n\u001B[1;33m[IDE]\u001B[0m Unknown command: \u001B[1mide " + sub +
                "\u001B[0m\r\nType \u001B[1;36mide help\u001B[0m for available commands.\r\n");
            return;
        }

        try {
            Map<String, Object> payload = Map.of(
                "session", session,
                "cwd", workspaceService.getWorkspacePath()
            );
            sendText(session, "\r\n\u001B[1;36m[IDE]\u001B[0m Executing: " + cmdName + "...\r\n");
            commandRegistry.executeCommand(cmdName, payload);
        } catch (IllegalArgumentException e) {
            // This usually happens when the command is not registered because the extension is disabled
            sendText(session, "\r\n\u001B[1;31m[IDE Error]\u001B[0m Extension for '" + cmdName + "' is currently \u001B[1mDisabled\u001B[0m.\r\n" +
                             "Please enable it in \u001B[1;34mSettings > Extensions\u001B[0m.\r\n");
        } catch (Exception e) {
            sendText(session, "\r\n\u001B[1;31m[IDE Error]\u001B[0m " + e.getMessage() + "\r\n");
        }
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

    private String extractCwd(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null || uri.getQuery() == null) return null;
        for (String param : uri.getQuery().split("&")) {
            if (param.startsWith("cwd=")) {
                String v = param.substring(4);
                return java.net.URLDecoder.decode(v, java.nio.charset.StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private void killSession(String sessionId) {
        TerminalSession ts = sessions.remove(sessionId);
        if (ts != null) ts.process().destroyForcibly();
    }

    private void sendText(WebSocketSession session, String text) {
        try {
            synchronized (session) {
                if (session.isOpen()) session.sendMessage(new TextMessage(text));
            }
        } catch (Exception e) {
            log.warn("[Terminal] Failed to send text to session {}: {}", session.getId(), e.getMessage());
        }
    }
}
