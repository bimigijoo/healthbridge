package com.healthbridge.healthbridgebackend.security;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

// Only on the test classpath, never included in the production JAR.
@Profile("mobile-e2e")
@RestController
public class MobileE2eReadinessController {
    @GetMapping("/api/auth/e2e-ready")
    public Map<String, String> ready() { return Map.of("status", "ready"); }
}
