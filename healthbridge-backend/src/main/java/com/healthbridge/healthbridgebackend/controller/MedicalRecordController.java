package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.MedicalRecordRequest;
import com.healthbridge.healthbridgebackend.dto.MedicalRecordResponse;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final HealthProfileService healthProfileService;

    public MedicalRecordController(
            MedicalRecordService medicalRecordService,
            HealthProfileService healthProfileService) {
        this.medicalRecordService = medicalRecordService;
        this.healthProfileService = healthProfileService;
    }

    @PostMapping
    public ResponseEntity<MedicalRecordResponse> createRecord(
            @Valid @RequestBody MedicalRecordRequest request) {

        HealthProfile healthProfile = healthProfileService
                .findById(request.getHealthProfileId())
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        MedicalRecord record = new MedicalRecord();

        record.setHealthProfile(healthProfile);
        record.setRecordType(request.getRecordType());
        record.setRecordDate(request.getRecordDate());
        record.setProviderName(request.getProviderName());
        record.setProviderFacility(request.getProviderFacility());
        record.setReason(request.getReason());
        record.setDiagnosis(request.getDiagnosis());
        record.setMedication(request.getMedication());
        record.setNotes(request.getNotes());

        MedicalRecord savedRecord = medicalRecordService.saveRecord(record);

        MedicalRecordResponse response = toResponse(savedRecord);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/profile/{healthProfileId}")
    public ResponseEntity<List<MedicalRecordResponse>> getRecordsByProfile(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile = healthProfileService
                .findById(healthProfileId)
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<MedicalRecordResponse> responses =
                medicalRecordService
                        .findByHealthProfileIdOrderByRecordDateDesc(healthProfileId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecordResponse> getRecordById(
            @PathVariable Long id) {

        MedicalRecord record = medicalRecordService
                .findById(id)
                .orElse(null);

        if (record == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(toResponse(record));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecord(
            @PathVariable Long id) {

        MedicalRecord record = medicalRecordService
                .findById(id)
                .orElse(null);

        if (record == null) {
            return ResponseEntity.notFound().build();
        }

        medicalRecordService.deleteRecord(id);

        return ResponseEntity.noContent().build();
    }

    private MedicalRecordResponse toResponse(MedicalRecord record) {

        return new MedicalRecordResponse(
                record.getId(),
                record.getHealthProfile().getId(),
                record.getRecordType().name(),
                record.getRecordDate(),
                record.getProviderName(),
                record.getProviderFacility(),
                record.getReason(),
                record.getDiagnosis(),
                record.getMedication(),
                record.getNotes()
        );
    }
}