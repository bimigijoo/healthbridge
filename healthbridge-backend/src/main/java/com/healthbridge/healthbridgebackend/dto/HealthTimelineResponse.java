package com.healthbridge.healthbridgebackend.dto;

public class HealthTimelineResponse {

    private String eventType;
    private Long eventId;
    private String eventDate;
    private String title;
    private String description;
    private String status;

    public HealthTimelineResponse() {
    }

    public HealthTimelineResponse(
            String eventType,
            Long eventId,
            String eventDate,
            String title,
            String description,
            String status) {

        this.eventType = eventType;
        this.eventId = eventId;
        this.eventDate = eventDate;
        this.title = title;
        this.description = description;
        this.status = status;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public String getEventDate() {
        return eventDate;
    }

    public void setEventDate(String eventDate) {
        this.eventDate = eventDate;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}