package com.healthbridge.healthbridgebackend.dto;

import java.time.LocalDateTime;

public class AccessLogResponse {

    private Long id;
    private Long sharingSessionId;
    private LocalDateTime accessedAt;
    private String providerName;
    private String providerFacility;
    private String action;

    public AccessLogResponse() {
    }

    public AccessLogResponse(
            Long id,
            Long sharingSessionId,
            LocalDateTime accessedAt,
            String providerName,
            String providerFacility,
            String action
    ) {
        this.id = id;
        this.sharingSessionId = sharingSessionId;
        this.accessedAt = accessedAt;
        this.providerName = providerName;
        this.providerFacility = providerFacility;
        this.action = action;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSharingSessionId() {
        return sharingSessionId;
    }

    public void setSharingSessionId(Long sharingSessionId) {
        this.sharingSessionId = sharingSessionId;
    }

    public LocalDateTime getAccessedAt() {
        return accessedAt;
    }

    public void setAccessedAt(LocalDateTime accessedAt) {
        this.accessedAt = accessedAt;
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

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }
}