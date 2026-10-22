package com.healthbridge.healthbridgebackend.security;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.sql.DriverManager;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class EmergencyPassportMigrationTest {
    @Test void additiveScriptPreservesExistingProfilesAndDefaultsEveryFlagOff() throws Exception {
        // Syntax/shape check in H2 PostgreSQL mode, not a production PostgreSQL migration run.
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:passport_migration;MODE=PostgreSQL", "sa", "")) {
            try (var statement = connection.createStatement()) {
                statement.execute("CREATE TABLE health_profiles (id BIGINT PRIMARY KEY)");
                statement.execute("INSERT INTO health_profiles VALUES (1)");
            }
            ScriptUtils.executeSqlScript(connection, new FileSystemResource(Path.of("database/migrations/001_emergency_passport_preferences.sql")));
            try (var statement = connection.createStatement()) {
                try (var profiles = statement.executeQuery("SELECT COUNT(*) FROM health_profiles")) {
                    assertTrue(profiles.next()); assertEquals(1, profiles.getInt(1));
                }
                try (var preferences = statement.executeQuery("SELECT COUNT(*) FROM emergency_passport_preferences")) {
                    assertTrue(preferences.next()); assertEquals(0, preferences.getInt(1));
                }
                statement.execute("INSERT INTO emergency_passport_preferences (health_profile_id, public_reference, updated_at) VALUES (1, '"
                        + "a".repeat(43) + "', CURRENT_TIMESTAMP)");
                try (var preferences = statement.executeQuery("SELECT enabled, blood_group, emergency_contact, allergies, conditions, medications, preferred_language FROM emergency_passport_preferences")) {
                    assertTrue(preferences.next());
                    for (int index = 1; index <= 7; index++) assertFalse(preferences.getBoolean(index));
                }
            }
        }
    }
}
