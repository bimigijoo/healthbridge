package com.healthbridge.healthbridgebackend.dto;

import java.time.LocalDateTime;

public class SharingSessionResponse {

    private Long id;
    private String accessToken;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private boolean revoked;
    private String providerName;
    private String providerFacility;
    private String providerRegistration;

    public SharingSessionResponse() {
    }

    public SharingSessionResponse(
            Long id,
            String accessToken,
            LocalDateTime createdAt,
            LocalDateTime expiresAt,
            boolean revoked,
            String providerName,
            String providerFacility,
            String providerRegistration
    ) {
        this.id = id;
        this.accessToken = accessToken;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.revoked = revoked;
        this.providerName = providerName;
        this.providerFacility = providerFacility;
        this.providerRegistration = providerRegistration;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }

    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public String getProviderFacility() {
        return providerFacility;
    }

    public void setProviderFacility(String providerFacility) {
        this.providerFacility = providerFacility;
    }

    public String getProviderRegistration() {
        return providerRegistration;
    }

    public void setProviderRegistration(String providerRegistration) {
        this.providerRegistration = providerRegistration;
    }
}