package com.healthbridge.healthbridgebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class ExistingConditionRequest {

    @NotNull
    private Long healthProfileId;

    @NotBlank
    private String conditionName;

    private LocalDate diagnosedDate;

    private String notes;

    public ExistingConditionRequest() {
    }

    public ExistingConditionRequest(
            Long healthProfileId,
            String conditionName,
            LocalDate diagnosedDate,
            String notes) {

        this.healthProfileId = healthProfileId;
        this.conditionName = conditionName;
        this.diagnosedDate = diagnosedDate;
        this.notes = notes;
    }

    public Long getHealthProfileId() {
        return healthProfileId;
    }

    public void setHealthProfileId(Long healthProfileId) {
        this.healthProfileId = healthProfileId;
    }

    public String getConditionName() {
        return conditionName;
    }

    public void setConditionName(String conditionName) {
        this.conditionName = conditionName;
    }

    public LocalDate getDiagnosedDate() {
        return diagnosedDate;
    }

    public void setDiagnosedDate(LocalDate diagnosedDate) {
        this.diagnosedDate = diagnosedDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}