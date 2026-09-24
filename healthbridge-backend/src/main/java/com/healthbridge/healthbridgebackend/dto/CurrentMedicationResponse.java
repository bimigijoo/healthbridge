package com.healthbridge.healthbridgebackend.dto;

public class CurrentMedicationResponse {

    private Long id;
    private Long healthProfileId;
    private String medicationName;
    private String dosage;
    private String frequency;
    private String notes;

    public CurrentMedicationResponse() {
    }

    public CurrentMedicationResponse(
            Long id,
            Long healthProfileId,
            String medicationName,
            String dosage,
            String frequency,
            String notes
    ) {
        this.id = id;
        this.healthProfileId = healthProfileId;
        this.medicationName = medicationName;
        this.dosage = dosage;
        this.frequency = frequency;
        this.notes = notes;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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