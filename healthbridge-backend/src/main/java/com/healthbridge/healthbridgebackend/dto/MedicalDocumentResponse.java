package com.healthbridge.healthbridgebackend.dto;

import java.time.LocalDateTime;

public class MedicalDocumentResponse {

    private Long id;
    private Long medicalRecordId;
    private String fileName;
    private String fileType;
    private LocalDateTime uploadedAt;

    public MedicalDocumentResponse() {
    }

    public MedicalDocumentResponse(
            Long id,
            Long medicalRecordId,
            String fileName,
            String fileType,
            LocalDateTime uploadedAt) {

        this.id = id;
        this.medicalRecordId = medicalRecordId;
        this.fileName = fileName;
        this.fileType = fileType;
        this.uploadedAt = uploadedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMedicalRecordId() {
        return medicalRecordId;
    }

    public void setMedicalRecordId(Long medicalRecordId) {
        this.medicalRecordId = medicalRecordId;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}