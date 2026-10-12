package com.healthbridge.healthbridgebackend.security;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Map;

// Only on the test classpath, never included in the production JAR.
@Profile("mobile-e2e")
@RestController
public class MobileE2eReadinessController {
    private final DataSource datasource;

    public MobileE2eReadinessController(DataSource datasource) {
        this.datasource = datasource;
    }

    @GetMapping("/api/auth/e2e-ready")
    public Map<String, String> ready() throws SQLException {
        try (var connection = datasource.getConnection()) {
            var metadata = connection.getMetaData();
            if (!"H2".equals(metadata.getDatabaseProductName())
                    || !"jdbc:h2:mem:healthbridge_mobile_e2e".equals(metadata.getURL())) {
                throw new IllegalStateException("Live readiness refused: datasource is not the dedicated in-memory H2 database.");
            }
            return Map.of("status", "ready", "database", "H2", "jdbcUrl", metadata.getURL(),
                    "driver", metadata.getDriverName());
        }
    }
}
