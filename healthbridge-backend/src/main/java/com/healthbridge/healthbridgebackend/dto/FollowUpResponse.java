package com.healthbridge.healthbridgebackend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class FollowUpResponse {

    private Long id;
    private Long healthProfileId;
    private String description;
    private LocalDate dueDate;
    private String status;
    private LocalDateTime completedAt;

    public FollowUpResponse() {
    }

    public FollowUpResponse(
            Long id,
            Long healthProfileId,
            String description,
            LocalDate dueDate,
            String status,
            LocalDateTime completedAt
    ) {
        this.id = id;
        this.healthProfileId = healthProfileId;
        this.description = description;
        this.dueDate = dueDate;
        this.status = status;
        this.completedAt = completedAt;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}