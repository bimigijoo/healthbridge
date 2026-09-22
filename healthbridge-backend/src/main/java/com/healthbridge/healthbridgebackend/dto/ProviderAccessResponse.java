package com.healthbridge.healthbridgebackend.dto;

import java.util.List;

public class ProviderAccessResponse {

    private Long sharingSessionId;
    private String healthId;
    private String providerName;
    private String providerFacility;
    private String providerRegistration;
    private String expiresAt;
    private List<MedicalRecordResponse> medicalRecords;

    public ProviderAccessResponse() {
    }

    public ProviderAccessResponse(
            Long sharingSessionId,
            String healthId,
            String providerName,
            String providerFacility,
            String providerRegistration,
            String expiresAt,
            List<MedicalRecordResponse> medicalRecords) {

        this.sharingSessionId = sharingSessionId;
        this.healthId = healthId;
        this.providerName = providerName;
        this.providerFacility = providerFacility;
        this.providerRegistration = providerRegistration;
        this.expiresAt = expiresAt;
        this.medicalRecords = medicalRecords;
    }

    public Long getSharingSessionId() {
        return sharingSessionId;
    }

    public void setSharingSessionId(Long sharingSessionId) {
        this.sharingSessionId = sharingSessionId;
    }

    public String getHealthId() {
        return healthId;
    }

    public void setHealthId(String healthId) {
        this.healthId = healthId;
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

    public String getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }

    public List<MedicalRecordResponse> getMedicalRecords() {
        return medicalRecords;
    }

    public void setMedicalRecords(
            List<MedicalRecordResponse> medicalRecords) {

        this.medicalRecords = medicalRecords;
    }
}