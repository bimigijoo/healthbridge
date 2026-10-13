package com.healthbridge.healthbridgebackend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class SharingSessionRequest {

    @NotNull
    private Long healthProfileId;

    @NotNull
    private List<@NotNull @Positive Long> medicalRecordIds;

    @AssertTrue(message = "Confirm permission for the provider to add a consultation.")
    private boolean authorizeConsultation;

    @NotNull
    private Integer durationHours;

    @Size(max = 255)
    private String providerName;

    @Size(max = 255)
    private String providerFacility;

    @Size(max = 255)
    private String providerRegistration;

    public SharingSessionRequest() {
    }

    public SharingSessionRequest(
            Long healthProfileId,
            List<Long> medicalRecordIds,
            Integer durationHours,
            String providerName,
            String providerFacility,
            String providerRegistration) {

        this.healthProfileId = healthProfileId;
        this.medicalRecordIds = medicalRecordIds;
        this.durationHours = durationHours;
        this.providerName = providerName;
        this.providerFacility = providerFacility;
        this.providerRegistration = providerRegistration;
    }

    public Long getHealthProfileId() {
        return healthProfileId;
    }

    public boolean isAuthorizeConsultation() {
        return authorizeConsultation;
    }

    public void setAuthorizeConsultation(boolean authorizeConsultation) {
        this.authorizeConsultation = authorizeConsultation;
    }

    public void setHealthProfileId(Long healthProfileId) {
        this.healthProfileId = healthProfileId;
    }

    public List<Long> getMedicalRecordIds() {
        return medicalRecordIds;
    }

    public void setMedicalRecordIds(List<Long> medicalRecordIds) {
        this.medicalRecordIds = medicalRecordIds;
    }

    public Integer getDurationHours() {
        return durationHours;
    }

    public void setDurationHours(Integer durationHours) {
        this.durationHours = durationHours;
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
