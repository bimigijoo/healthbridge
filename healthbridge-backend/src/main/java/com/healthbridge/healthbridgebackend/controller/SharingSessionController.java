package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.SharingSessionRequest;
import com.healthbridge.healthbridgebackend.dto.SharingSessionResponse;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.entity.SharedRecord;
import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import com.healthbridge.healthbridgebackend.service.SharedRecordService;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sharing-sessions")
public class SharingSessionController {

    private final SharingSessionService sharingSessionService;
    private final SharedRecordService sharedRecordService;
    private final HealthProfileService healthProfileService;
    private final MedicalRecordService medicalRecordService;

    public SharingSessionController(
            SharingSessionService sharingSessionService,
            SharedRecordService sharedRecordService,
            HealthProfileService healthProfileService,
            MedicalRecordService medicalRecordService) {

        this.sharingSessionService = sharingSessionService;
        this.sharedRecordService = sharedRecordService;
        this.healthProfileService = healthProfileService;
        this.medicalRecordService = medicalRecordService;
    }

    @PostMapping
    public ResponseEntity<SharingSessionResponse> createSharingSession(
            @Valid @RequestBody SharingSessionRequest request) {

        HealthProfile healthProfile = healthProfileService
                .findById(request.getHealthProfileId())
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        if (!isValidDuration(request.getDurationHours())) {
            return ResponseEntity.badRequest().build();
        }

        if (request.getMedicalRecordIds() == null
                || request.getMedicalRecordIds().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<MedicalRecord> medicalRecords = new ArrayList<>();

        for (Long recordId : request.getMedicalRecordIds()) {

            MedicalRecord medicalRecord = medicalRecordService
                    .findById(recordId)
                    .orElse(null);

            if (medicalRecord == null) {
                return ResponseEntity.badRequest().build();
            }

            if (!medicalRecord.getHealthProfile().getId()
                    .equals(request.getHealthProfileId())) {
                return ResponseEntity.badRequest().build();
            }

            medicalRecords.add(medicalRecord);
        }

        SharingSession session = new SharingSession();

        session.setHealthProfile(healthProfile);
        session.setAccessToken(UUID.randomUUID().toString());
        session.setExpiresAt(
                LocalDateTime.now()
                        .plusHours(request.getDurationHours())
        );
        session.setRevoked(false);
        session.setProviderName(request.getProviderName());
        session.setProviderFacility(request.getProviderFacility());
        session.setProviderRegistration(
                request.getProviderRegistration()
        );

        SharingSession savedSession =
                sharingSessionService.saveSession(session);

        for (MedicalRecord medicalRecord : medicalRecords) {

            SharedRecord sharedRecord = new SharedRecord();

            sharedRecord.setSharingSession(savedSession);
            sharedRecord.setMedicalRecord(medicalRecord);

            sharedRecordService.saveSharedRecord(sharedRecord);
        }

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(savedSession));
    }

    @GetMapping("/profile/{healthProfileId}")
    public ResponseEntity<List<SharingSessionResponse>> getSessionsByProfile(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile = healthProfileService
                .findById(healthProfileId)
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<SharingSessionResponse> responses =
                sharingSessionService
                        .findByHealthProfileId(healthProfileId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revokeSharingSession(
            @PathVariable Long id) {

        SharingSession session = sharingSessionService
                .findById(id)
                .orElse(null);

        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        session.setRevoked(true);
        sharingSessionService.saveSession(session);

        return ResponseEntity.noContent().build();
    }

    private boolean isValidDuration(Integer durationHours) {

        return durationHours != null
                && (durationHours == 1
                || durationHours == 24
                || durationHours == 168);
    }

    private SharingSessionResponse toResponse(
            SharingSession session) {

        return new SharingSessionResponse(
                session.getId(),
                session.getAccessToken(),
                session.getCreatedAt(),
                session.getExpiresAt(),
                session.isRevoked(),
                session.getProviderName(),
                session.getProviderFacility(),
                session.getProviderRegistration()
        );
    }
}