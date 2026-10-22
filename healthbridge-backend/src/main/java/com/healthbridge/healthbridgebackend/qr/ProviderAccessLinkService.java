package com.healthbridge.healthbridgebackend.qr;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class ProviderAccessLinkService {
    private final String publicOrigin;

    public ProviderAccessLinkService(@Value("${healthbridge.public-frontend-base-url:}") String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            publicOrigin = null;
            return;
        }
        URI uri;
        try {
            uri = URI.create(baseUrl.strip());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Public frontend base URL must be a valid HTTPS origin.");
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || (uri.getPath() != null && !uri.getPath().isEmpty() && !uri.getPath().equals("/"))) {
            throw new IllegalArgumentException("Public frontend base URL must be an HTTPS origin without credentials, path, query, or fragment.");
        }
        publicOrigin = baseUrl.strip().replaceAll("/+$", "");
    }

    public String createLink(String accessCode) {
        return origin() + "/provider-access#access="
                + URLEncoder.encode(accessCode, StandardCharsets.UTF_8);
    }

    public String createPassportLink(String healthId, boolean includeReference) {
        return origin() + "/passport" + (includeReference ? "#healthId="
                + URLEncoder.encode(healthId, StandardCharsets.UTF_8) : "");
    }

    public String createEmergencyPassportLink(String reference) {
        return origin() + "/passport#reference=" + URLEncoder.encode(reference, StandardCharsets.UTF_8);
    }

    private String origin() {
        if (publicOrigin == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "QR links require a configured public HTTPS frontend address.");
        }
        return publicOrigin;
    }
}
