package com.healthbridge.healthbridgebackend.bootstrap;

import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;

@Configuration
public class AdminBootstrap {

    @Bean
    public ApplicationRunner initializeAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${healthbridge.admin.bootstrap.enabled:false}") boolean enabled,
            @Value("${healthbridge.admin.bootstrap.email:}") String email,
            @Value("${healthbridge.admin.bootstrap.password:}") String password) {

        return args -> {
            if (!enabled) {
                return;
            }

            if (userRepository.countByRole(User.Role.ADMIN) > 0) {
                System.out.println("Admin bootstrap skipped: administrator already exists.");
                return;
            }

            if (email == null || email.isBlank()
                    || password == null || password.isBlank()) {
                throw new IllegalStateException(
                        "Admin bootstrap enabled but email or password is missing."
                );
            }

            String normalizedEmail = email.trim().toLowerCase();

            if (userRepository.existsByEmail(normalizedEmail)) {
                throw new IllegalStateException(
                        "Admin bootstrap email already belongs to an existing account."
                );
            }

            int passwordBytes = password.getBytes(StandardCharsets.UTF_8).length;

            if (passwordBytes < 12 || passwordBytes > 72) {
                throw new IllegalStateException(
                        "Admin bootstrap password must be 12–72 UTF-8 bytes."
                );
            }

            User admin = new User();
            admin.setName("HealthBridge Administrator");
            admin.setEmail(normalizedEmail);
            admin.setPassword(passwordEncoder.encode(password));
            admin.setRole(User.Role.ADMIN);
            admin.setActive(true);

            userRepository.save(admin);

            System.out.println("Initial HealthBridge administrator created successfully.");
        };
    }
}