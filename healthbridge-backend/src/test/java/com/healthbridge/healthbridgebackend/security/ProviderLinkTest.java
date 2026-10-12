package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.qr.ProviderAccessLinkService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class ProviderLinkTest {
    @Test void requiresConfiguredHttpsOrigin() {
        assertThrows(ResponseStatusException.class, () -> new ProviderAccessLinkService("").createLink("synthetic"));
        for (String url : new String[]{"http://demo.example.test", "https://user:password@demo.example.test", "https://demo.example.test/?access=bad", "https://demo.example.test/path"}) {
            assertThrows(IllegalArgumentException.class, () -> new ProviderAccessLinkService(url));
        }
    }
}
