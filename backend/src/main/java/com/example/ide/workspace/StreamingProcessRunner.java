package com.example.ide.workspace;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.List;
import java.util.concurrent.ExecutorService;

/**
 * Runs an OS command in a separate thread and streams its output
 * line-by-line to an open WebSocket terminal session.
 */
public class StreamingProcessRunner {

    private static final Logger log = LoggerFactory.getLogger(StreamingProcessRunner.class);

    private final ExecutorService executor;

    public StreamingProcessRunner(ExecutorService executor) {
        this.executor = executor;
    }

    /**
     * @param command     full command+args list
     * @param workDir     working directory (may be null → inherits JVM cwd)
     * @param session     WebSocket session to stream output into
     * @param label       display label shown in terminal header
     */
    public void run(List<String> command, File workDir, WebSocketSession session, String label) {
        executor.submit(() -> {
            try {
                sendLine(session, "\r\n\u001B[1;36m[" + label + "]\u001B[0m Starting: " + String.join(" ", command) + "\r\n");

                ProcessBuilder pb = new ProcessBuilder(command);
                pb.redirectErrorStream(true);
                if (workDir != null && workDir.isDirectory()) {
                    pb.directory(workDir);
                }

                Process process = pb.start();

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sendLine(session, line + "\r\n");
                    }
                }

                int exitCode = process.waitFor();
                if (exitCode == 0) {
                    sendLine(session, "\r\n\u001B[1;32m[" + label + "]\u001B[0m Done ✔\r\n");
                } else {
                    sendLine(session, "\r\n\u001B[1;31m[" + label + "]\u001B[0m Exited with code " + exitCode + "\r\n");
                }
            } catch (Exception e) {
                log.error("[StreamingProcessRunner] Error running {}: {}", label, e.getMessage());
                try {
                    sendLine(session, "\r\n\u001B[1;31m[" + label + " ERROR]\u001B[0m " + e.getMessage() + "\r\n");
                } catch (Exception ignored) {}
            }
        });
    }

    private void sendLine(WebSocketSession session, String text) throws Exception {
        synchronized (session) {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(text));
            }
        }
    }
}
