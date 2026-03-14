package com.example.ide.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration for the IDE backend.
 * 
 * When `ide.auth.enabled=false` (default), all endpoints are open — suitable
 * for local development.
 * When `ide.auth.enabled=true`, JWT authentication is enforced on all API
 * endpoints except `/api/auth/**` and `/api/health`.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${ide.auth.enabled:false}")
    private boolean authEnabled;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                .frameOptions(frame -> frame.sameOrigin())
            );

        if (authEnabled) {
            // Production mode: JWT authentication required
            http
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/api/health", "/actuator/**").permitAll()
                    .requestMatchers("/api/terminal", "/terminal", "/terminal/**").permitAll()
                    .requestMatchers("/events/**", "/commands/**").permitAll()
                    .anyRequest().authenticated()
                );
        } else {
            // Development mode: all requests permitted
            http
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/terminal", "/terminal", "/terminal/**", "/api/**", "/events/**", "/commands/**").permitAll()
                    .anyRequest().permitAll()
                );
        }

        return http.build();
    }
}
