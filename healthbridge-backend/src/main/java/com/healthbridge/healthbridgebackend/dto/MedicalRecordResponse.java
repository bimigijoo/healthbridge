package com.healthbridge.healthbridgebackend.dto;

import java.time.LocalDate;

public class MedicalRecordResponse {

    private Long id;
    private Long healthProfileId;
    private String recordType;
    private LocalDate recordDate;
    private String providerName;
    private String providerFacility;
    private String reason;
    private String diagnosis;
    private String medication;
    private String notes;

    public MedicalRecordResponse() {
    }

    public MedicalRecordResponse(
            Long id,
            Long healthProfileId,
            String recordType,
            LocalDate recordDate,
            String providerName,
            String providerFacility,
            String reason,
            String diagnosis,
            String medication,
            String notes) {

        this.id = id;
        this.healthProfileId = healthProfileId;
        this.recordType = recordType;
        this.recordDate = recordDate;
        this.providerName = providerName;
        this.providerFacility = providerFacility;
        this.reason = reason;
        this.diagnosis = diagnosis;
        this.medication = medication;
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

    public String getRecordType() {
        return recordType;
    }

    public void setRecordType(String recordType) {
        this.recordType = recordType;
    }

    public LocalDate getRecordDate() {
        return recordDate;
    }

    public void setRecordDate(LocalDate recordDate) {
        this.recordDate = recordDate;
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

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis) {
        this.diagnosis = diagnosis;
    }

    public String getMedication() {
        return medication;
    }

    public void setMedication(String medication) {
        this.medication = medication;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}