package com.healthbridge.healthbridgebackend.security;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Map;

@Profile("classroom-demo")
@RestController
public class ClassroomDemoReadinessController {
    private final DataSource datasource;
    public ClassroomDemoReadinessController(DataSource datasource) { this.datasource = datasource; }

    @GetMapping("/api/auth/demo-ready")
    public Map<String, String> ready() throws SQLException {
        try (var connection = datasource.getConnection()) {
            var metadata = connection.getMetaData();
            if (!"H2".equals(metadata.getDatabaseProductName())
                    || !"jdbc:h2:mem:healthbridge_classroom_demo".equals(metadata.getURL())) {
                throw new IllegalStateException("Classroom readiness refused: not the isolated H2 in-memory datasource.");
            }
            return Map.of("status", "ready", "database", "H2", "jdbcUrl", metadata.getURL(), "driver", metadata.getDriverName());
        }
    }
}
