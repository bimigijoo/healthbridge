package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.HealthbridgeBackendApplication;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.Arrays;
import java.util.Map;

// Test-only entry point. Initializers run before context refresh and datasource/JPA bean creation.
public final class MobileE2eApplication implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    static final Map<String, String> REQUIRED = Map.ofEntries(
            Map.entry("spring.datasource.url", "jdbc:h2:mem:healthbridge_mobile_e2e;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"),
            Map.entry("spring.datasource.driver-class-name", "org.h2.Driver"),
            Map.entry("spring.datasource.username", "sa"),
            Map.entry("spring.datasource.password", ""),
            Map.entry("spring.jpa.hibernate.ddl-auto", "create-drop"),
            Map.entry("server.address", "127.0.0.1"),
            Map.entry("server.port", "18080"),
            Map.entry("file.upload-dir", "target/mobile-e2e-uploads"),
            Map.entry("healthbridge.public-frontend-base-url", "https://localhost:18443"),
            Map.entry("healthbridge.cors.allowed-origins", "https://localhost:18443")
    );

    public static void main(String[] args) {
        var application = new SpringApplication(HealthbridgeBackendApplication.class);
        application.addInitializers(new MobileE2eApplication());
        application.run(args);
    }

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        verify(context.getEnvironment());
        System.out.println("Live test isolation verified before datasource initialization: H2 in-memory, "
                + "org.h2.Driver, backend 127.0.0.1:18080, HTTPS/CORS https://localhost:18443.");
    }

    static void verify(ConfigurableEnvironment environment) {
        if (!Arrays.equals(environment.getActiveProfiles(), new String[]{"mobile-e2e"})) {
            throw refused("only the mobile-e2e profile is permitted");
        }
        var binder = Binder.get(environment);
        REQUIRED.forEach((key, expected) -> {
            if (!expected.equals(binder.bind(key, String.class).orElse(null))) {
                // Do not print effective values: inherited settings may contain credentials.
                throw refused("unexpected " + key);
            }
        });
        // Hikari/JNDI overrides could bypass the standard datasource URL and driver properties.
        for (String key : new String[]{"spring.datasource.hikari", "spring.datasource.jndi-name",
                "spring.datasource.type", "spring.datasource.xa", "spring.sql.init"}) {
            if (binder.bind(key, String.class).isBound()
                    || binder.bind(key, org.springframework.boot.context.properties.bind.Bindable.mapOf(String.class, Object.class)).isBound()) {
                throw refused("unsupported datasource override " + key);
            }
        }
    }

    private static IllegalStateException refused(String reason) {
        return new IllegalStateException("Live test isolation refused before datasource initialization: " + reason);
    }
}
