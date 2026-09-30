package com.healthbridge.healthbridgebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class ProviderConsultationRequest {

    @NotNull
    private LocalDate recordDate;

    @NotBlank
    private String providerName;

    private String providerFacility;

    private String reason;

    private String diagnosis;

    private String medication;

    private String notes;

    public ProviderConsultationRequest() {
    }

    public ProviderConsultationRequest(
            LocalDate recordDate,
            String providerName,
            String providerFacility,
            String reason,
            String diagnosis,
            String medication,
            String notes) {

        this.recordDate = recordDate;
        this.providerName = providerName;
        this.providerFacility = providerFacility;
        this.reason = reason;
        this.diagnosis = diagnosis;
        this.medication = medication;
        this.notes = notes;
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