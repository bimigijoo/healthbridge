package com.healthbridge.healthbridgebackend.security;

import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

class MobileE2eIsolationTest {
    private MockEnvironment isolated() {
        var environment = new MockEnvironment();
        environment.setActiveProfiles("mobile-e2e");
        MobileE2eApplication.REQUIRED.forEach(environment::setProperty);
        return environment;
    }

    @Test void acceptsOnlyDedicatedH2Configuration() {
        assertDoesNotThrow(() -> MobileE2eApplication.verify(isolated()));
    }

    @Test void rejectsPostgresBeforeAnyDatasourceBeanIsCreated() {
        var environment = isolated().withProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/synthetic");
        try (var context = new GenericApplicationContext()) {
            context.setEnvironment(environment);
            context.registerBean("datasourceMustNeverStart", Object.class, () -> {
                fail("Unsafe configuration must be rejected before beans can initialize");
                return new Object();
            });
            assertThrows(IllegalStateException.class, () -> new MobileE2eApplication().initialize(context));
            assertFalse(context.isActive());
        }
    }

    @Test void rejectsEveryIncorrectOrMissingRequiredSetting() {
        MobileE2eApplication.REQUIRED.forEach((key, value) -> {
            assertThrows(IllegalStateException.class, () -> MobileE2eApplication.verify(isolated().withProperty(key, "unsafe")), key);
            var missing = new MockEnvironment();
            missing.setActiveProfiles("mobile-e2e");
            MobileE2eApplication.REQUIRED.forEach((otherKey, otherValue) -> {
                if (!otherKey.equals(key)) missing.setProperty(otherKey, otherValue);
            });
            assertThrows(IllegalStateException.class, () -> MobileE2eApplication.verify(missing), key);
        });
    }

    @Test void rejectsAlternateDatasourceAndSqlInitializationOverrides() {
        for (String key : new String[]{"spring.datasource.hikari.jdbc-url", "spring.datasource.hikari.driver-class-name",
                "spring.datasource.hikari.data-source-properties.url", "spring.datasource.jndi-name",
                "spring.datasource.type", "spring.datasource.xa.data-source-class-name", "spring.sql.init.data-locations"}) {
            assertThrows(IllegalStateException.class, () -> MobileE2eApplication.verify(isolated().withProperty(key, "unsafe")), key);
        }
    }

    @Test void rejectsMissingOrAdditionalProfiles() {
        for (String[] profiles : new String[][]{ {}, {"normal"}, {"mobile-e2e", "normal"} }) {
            var environment = isolated();
            environment.setActiveProfiles(profiles);
            assertThrows(IllegalStateException.class, () -> MobileE2eApplication.verify(environment));
        }
    }
}
