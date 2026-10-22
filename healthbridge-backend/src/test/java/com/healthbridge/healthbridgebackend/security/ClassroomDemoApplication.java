package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.HealthbridgeBackendApplication;
import com.healthbridge.healthbridgebackend.qr.ProviderAccessLinkService;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

// Test-runtime-only synthetic demo: never part of the production application JAR.
public final class ClassroomDemoApplication implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    static Map<String, String> required(String origin) {
        if (origin == null || origin.isBlank()) throw new IllegalStateException("Classroom demo requires an HTTPS origin.");
        new ProviderAccessLinkService(origin);
        var host = URI.create(origin).getHost();
        if (host.equalsIgnoreCase("localhost") || host.endsWith(".localhost") || host.contains(":")
                || host.matches("[0-9.]+") || !host.contains(".")) {
            throw new IllegalStateException("Classroom demo requires a public HTTPS hostname, not a loopback address.");
        }
        var settings = new LinkedHashMap<>(MobileE2eApplication.REQUIRED);
        settings.put("spring.datasource.url", "jdbc:h2:mem:healthbridge_classroom_demo;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        settings.put("server.port", "19080");
        settings.put("file.upload-dir", "target/classroom-demo-uploads");
        settings.put("healthbridge.public-frontend-base-url", origin);
        settings.put("healthbridge.cors.allowed-origins", origin + ",http://127.0.0.1:19443");
        settings.put("spring.jpa.show-sql", "false");
        settings.put("logging.level.root", "WARN");
        return settings;
    }

    static void verify(ConfigurableEnvironment environment) {
        MobileE2eApplication.verify(environment, "classroom-demo",
                required(environment.getProperty("healthbridge.public-frontend-base-url")));
        var key = environment.getProperty("jwt.secret", "");
        if (key.length() < 32) throw new IllegalStateException("Classroom demo requires a private JWT key of at least 32 characters.");
    }

    public static void main(String[] args) {
        var application = new SpringApplication(HealthbridgeBackendApplication.class);
        application.addInitializers(new ClassroomDemoApplication());
        application.run(args);
    }

    @Override public void initialize(ConfigurableApplicationContext context) {
        verify(context.getEnvironment());
        System.out.println("Classroom isolation verified before datasource initialization: H2 in-memory, org.h2.Driver, "
                + "backend 127.0.0.1:19080, matching configured HTTPS/CORS origin. PostgreSQL is not used.");
    }
}
