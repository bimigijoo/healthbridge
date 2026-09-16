package com.healthbridge.healthbridgebackend.dto;

import java.time.LocalDate;

public class ExistingConditionResponse {

    private Long id;
    private Long healthProfileId;
    private String conditionName;
    private LocalDate diagnosedDate;
    private String notes;

    public ExistingConditionResponse() {
    }

    public ExistingConditionResponse(
            Long id,
            Long healthProfileId,
            String conditionName,
            LocalDate diagnosedDate,
            String notes
    ) {
        this.id = id;
        this.healthProfileId = healthProfileId;
        this.conditionName = conditionName;
        this.diagnosedDate = diagnosedDate;
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