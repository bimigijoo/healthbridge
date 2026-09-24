package com.healthbridge.healthbridgebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CurrentMedicationRequest {

    @NotNull
    private Long healthProfileId;

    @NotBlank
    private String medicationName;

    private String dosage;

    private String frequency;

    private String notes;

    public CurrentMedicationRequest() {
    }

    public CurrentMedicationRequest(
            Long healthProfileId,
            String medicationName,
            String dosage,
            String frequency,
            String notes) {

        this.healthProfileId = healthProfileId;
        this.medicationName = medicationName;
        this.dosage = dosage;
        this.frequency = frequency;
        this.notes = notes;
    }

    public Long getHealthProfileId() {
        return healthProfileId;
    }

    public void setHealthProfileId(Long healthProfileId) {
        this.healthProfileId = healthProfileId;
    }

    public String getMedicationName() {
        return medicationName;
    }

    public void setMedicationName(String medicationName) {
        this.medicationName = medicationName;
    }

    public String getDosage() {
        return dosage;
    }

    public void setDosage(String dosage) {
        this.dosage = dosage;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}