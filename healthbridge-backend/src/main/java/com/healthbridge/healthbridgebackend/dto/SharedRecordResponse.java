package com.healthbridge.healthbridgebackend.dto;

public class SharedRecordResponse {

    private Long id;
    private Long sharingSessionId;
    private Long medicalRecordId;

    public SharedRecordResponse() {
    }

    public SharedRecordResponse(
            Long id,
            Long sharingSessionId,
            Long medicalRecordId
    ) {
        this.id = id;
        this.sharingSessionId = sharingSessionId;
        this.medicalRecordId = medicalRecordId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSharingSessionId() {
        return sharingSessionId;
    }

    public void setSharingSessionId(Long sharingSessionId) {
        this.sharingSessionId = sharingSessionId;
    }

    public Long getMedicalRecordId() {
        return medicalRecordId;
    }

    public void setMedicalRecordId(Long medicalRecordId) {
        this.medicalRecordId = medicalRecordId;
    }
}