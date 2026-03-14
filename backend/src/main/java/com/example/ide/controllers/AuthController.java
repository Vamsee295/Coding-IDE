package com.example.ide.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication Controller.
 * Provides login and registration endpoints for the IDE.
 * 
 * In production, this should be backed by a proper user database and
 * JWT signing library (e.g., jjwt or spring-security-oauth2).
 * This implementation provides the correct API contract for the frontend.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // In-memory user store for development. Replace with JPA UserRepository in production.
    private final ConcurrentHashMap<String, String> users = new ConcurrentHashMap<>();

    /**
     * POST /api/auth/register
     * Registers a new user.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");

        if (username == null || password == null || username.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        if (users.containsKey(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "User already exists"));
        }

        users.put(username, password);
        String token = generateToken(username);

        return ResponseEntity.ok(Map.of(
            "token", token,
            "username", username,
            "message", "Registration successful"
        ));
    }

    /**
     * POST /api/auth/login
     * Authenticates a user and returns a token.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        String storedPassword = users.get(username);
        if (storedPassword == null || !storedPassword.equals(password)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        String token = generateToken(username);

        return ResponseEntity.ok(Map.of(
            "token", token,
            "username", username,
            "message", "Login successful"
        ));
    }

    /**
     * GET /api/auth/me
     * Returns the current user info (from the token in the Authorization header).
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        // In production, decode and validate the JWT here
        return ResponseEntity.ok(Map.of(
            "authenticated", true,
            "message", "Token is present"
        ));
    }

    /**
     * Simple token generator. In production, use a proper JWT library.
     */
    private String generateToken(String username) {
        return "ide_" + UUID.randomUUID().toString().replace("-", "") + "_" + username;
    }
}
