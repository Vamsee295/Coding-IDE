package com.example.ide.terminal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.DisposableBean;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * Automatically starts the Node.js terminal server when the Spring Boot backend starts.
 * This ensures that the terminal panel in the frontend can always connect to port 8082.
 */
@Component
public class TerminalServerRunner implements CommandLineRunner, DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(TerminalServerRunner.class);
    private Process terminalProcess;

    @Override
    public void run(String... args) {
        log.info("[TerminalServer] Starting Terminal Server (Node.js)...");

        // Resolve absolute path to the terminal-server directory
        // Assuming structure: root/backend and root/terminal-server
        String userDir = System.getProperty("user.dir");
        File rootDir = new File(userDir).getParentFile();
        File terminalServerDir = new File(rootDir, "terminal-server");

        if (!terminalServerDir.exists() || !terminalServerDir.isDirectory()) {
            log.error("[TerminalServer] Could not find terminal-server directory at: {}", terminalServerDir.getAbsolutePath());
            return;
        }

        try {
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
            String npmCmd = isWindows ? "npm.cmd" : "npm";

            ProcessBuilder pb = new ProcessBuilder(npmCmd, "start");
            pb.directory(terminalServerDir);
            pb.redirectErrorStream(true);

            terminalProcess = pb.start();
            log.info("[TerminalServer] Terminal Server process started (PID: {})", terminalProcess.pid());

            // Print the first few lines of output to confirm it's running
            new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(terminalProcess.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        log.debug("[TerminalServer Output] {}", line);
                        if (line.contains("Real OS Terminal Service running on port")) {
                            log.info("[TerminalServer] Terminal Server is listening on port 8082");
                        }
                    }
                } catch (IOException e) {
                    if (terminalProcess.isAlive()) {
                        log.warn("[TerminalServer] Error reading server output: {}", e.getMessage());
                    }
                }
            }).start();

        } catch (IOException e) {
            log.error("[TerminalServer] Failed to start Terminal Server: {}", e.getMessage());
            log.error("[TerminalServer] Make sure Node.js and npm are installed and in your PATH.");
        }
    }

    @Override
    public void destroy() {
        if (terminalProcess != null && terminalProcess.isAlive()) {
            log.info("[TerminalServer] Shutting down Terminal Server process...");
            terminalProcess.destroyForcibly();
        }
    }
}
