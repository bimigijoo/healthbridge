package com.healthbridge.healthbridgebackend.security;

import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;

class ClassroomDemoIsolationTest {
    private MockEnvironment isolated() {
        var environment = new MockEnvironment();
        environment.setActiveProfiles("classroom-demo");
        ClassroomDemoApplication.required("https://synthetic.classroom.test").forEach(environment::setProperty);
        environment.setProperty("jwt.secret", "synthetic-classroom-unit-test-key-32-bytes");
        return environment;
    }
    @Test void acceptsDedicatedDemoSettings() { assertDoesNotThrow(() -> ClassroomDemoApplication.verify(isolated())); }

    @Test void refusesNonH2BeforeBeansStart() {
        for (String url : new String[]{"jdbc:postgresql://localhost:5432/synthetic", "jdbc:h2:file:./synthetic", "jdbc:mysql://localhost/synthetic"}) {
            try (var context = new GenericApplicationContext()) {
                context.setEnvironment(isolated().withProperty("spring.datasource.url", url));
                context.registerBean("mustNeverInitialize", Object.class, () -> { fail("Datasource isolation must fail first"); return new Object(); });
                assertThrows(IllegalStateException.class, () -> new ClassroomDemoApplication().initialize(context));
                assertFalse(context.isActive());
            }
        }
    }
    @Test void refusesAllUnsafeSettingsAndDatasourceOverrides() {
        ClassroomDemoApplication.required("https://synthetic.classroom.test").forEach((key, value) -> {
            if (!key.equals("healthbridge.public-frontend-base-url"))
                assertThrows(RuntimeException.class, () -> ClassroomDemoApplication.verify(isolated().withProperty(key, "unsafe")), key);
        });
        for (String key : new String[]{"spring.datasource.hikari.jdbc-url", "spring.datasource.jndi-name", "spring.datasource.type",
                "spring.datasource.xa.data-source-class-name", "spring.sql.init.data-locations"}) {
            assertThrows(IllegalStateException.class, () -> ClassroomDemoApplication.verify(isolated().withProperty(key, "unsafe")), key);
        }
    }
    @Test void refusesInvalidOriginsProfilesAndWeakKey() {
        for (String origin : new String[]{"", "http://synthetic.classroom.test", "https://localhost:19443", "https://127.0.0.1", "https://synthetic.classroom.test/path"}) {
            assertThrows(RuntimeException.class, () -> ClassroomDemoApplication.verify(isolated().withProperty("healthbridge.public-frontend-base-url", origin)));
        }
        var environment = isolated();
        environment.setActiveProfiles("classroom-demo", "normal");
        assertThrows(IllegalStateException.class, () -> ClassroomDemoApplication.verify(environment));
        assertThrows(IllegalStateException.class, () -> ClassroomDemoApplication.verify(isolated().withProperty("jwt.secret", "short")));
    }
}
