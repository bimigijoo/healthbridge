package com.healthbridge.healthbridgebackend.dto;

import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class MedicalRecordRequest {

    @NotNull
    private Long healthProfileId;

    @NotNull
    private MedicalRecord.RecordType recordType;

    @NotNull
    private LocalDate recordDate;

    private String providerName;
    private String providerFacility;
    private String reason;
    private String diagnosis;
    private String medication;
    private String notes;

    public MedicalRecordRequest() {
    }

    public Long getHealthProfileId() {
        return healthProfileId;
    }

    public void setHealthProfileId(Long healthProfileId) {
        this.healthProfileId = healthProfileId;
    }

    public MedicalRecord.RecordType getRecordType() {
        return recordType;
    }

    public void setRecordType(MedicalRecord.RecordType recordType) {
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