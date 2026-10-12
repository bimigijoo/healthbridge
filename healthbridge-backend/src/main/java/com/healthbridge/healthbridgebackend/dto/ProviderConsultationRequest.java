package com.healthbridge.healthbridgebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.AssertTrue;

import java.time.LocalDate;

public class ProviderConsultationRequest {

    @NotNull
    @PastOrPresent(message = "Consultation date cannot be in the future.")
    private LocalDate recordDate;

    @NotBlank
    @Size(max = 255)
    @Pattern(regexp = "[^\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]*", message = "Provider name contains unsupported control characters.")
    private String providerName;

    @Size(max = 255)
    @Pattern(regexp = "[^\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]*")
    private String providerFacility;

    @Size(max = 255)
    @Pattern(regexp = "[^\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]*")
    private String reason;

    @Size(max = 255)
    @Pattern(regexp = "[^\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]*")
    private String diagnosis;

    @Size(max = 255)
    @Pattern(regexp = "[^\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]*")
    private String medication;

    @Size(max = 255)
    @Pattern(regexp = "[^\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]*")
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
        this.providerName = normalize(providerName);
    }

    public String getProviderFacility() {
        return providerFacility;
    }

    public void setProviderFacility(String providerFacility) {
        this.providerFacility = normalize(providerFacility);
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = normalize(reason);
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis) {
        this.diagnosis = normalize(diagnosis);
    }

    public String getMedication() {
        return medication;
    }

    public void setMedication(String medication) {
        this.medication = normalize(medication);
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = normalize(notes);
    }

    @AssertTrue(message = "Enter at least one consultation detail.")
    public boolean isClinicalContentProvided() {
        return java.util.stream.Stream.of(reason, diagnosis, medication, notes)
                .anyMatch(value -> value != null && !value.isBlank());
    }

    private String normalize(String value) {
        return value == null ? null : value.replace("\r\n", "\n").strip();
    }
}
