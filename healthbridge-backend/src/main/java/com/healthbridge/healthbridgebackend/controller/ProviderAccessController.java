package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.MedicalRecordResponse;
import com.healthbridge.healthbridgebackend.dto.ProviderAccessResponse;
import com.healthbridge.healthbridgebackend.entity.AccessLog;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.entity.SharedRecord;
import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.service.AccessLogService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.SharedRecordService;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/provider-access")
public class ProviderAccessController {

    private final SharingSessionService sharingSessionService;
    private final SharedRecordService sharedRecordService;
    private final HealthProfileService healthProfileService;
    private final AccessLogService accessLogService;

    public ProviderAccessController(
            SharingSessionService sharingSessionService,
            SharedRecordService sharedRecordService,
            HealthProfileService healthProfileService,
            AccessLogService accessLogService) {

        this.sharingSessionService = sharingSessionService;
        this.sharedRecordService = sharedRecordService;
        this.healthProfileService = healthProfileService;
        this.accessLogService = accessLogService;
    }

    @GetMapping("/{accessToken}")
    public ResponseEntity<ProviderAccessResponse> accessSharedRecords(
            @PathVariable String accessToken) {

        SharingSession session =
                sharingSessionService
                        .findValidSessionByAccessToken(accessToken)
                        .orElse(null);

        if (session == null) {
            return ResponseEntity.status(403).build();
        }

        HealthProfile healthProfile = session.getHealthProfile();

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<MedicalRecordResponse> medicalRecords =
                sharedRecordService
                        .findBySharingSessionId(session.getId())
                        .stream()
                        .map(SharedRecord::getMedicalRecord)
                        .map(this::toResponse)
                        .toList();

        AccessLog accessLog = new AccessLog();

        accessLog.setSharingSession(session);
        accessLog.setProviderName(session.getProviderName());
        accessLog.setProviderFacility(session.getProviderFacility());
        accessLog.setAction("VIEW_SHARED_RECORDS");

        accessLogService.saveLog(accessLog);

        ProviderAccessResponse response =
                new ProviderAccessResponse(
                        session.getId(),
                        healthProfile.getHealthId(),
                        session.getProviderName(),
                        session.getProviderFacility(),
                        session.getProviderRegistration(),
                        session.getExpiresAt().toString(),
                        medicalRecords
                );

        return ResponseEntity.ok(response);
    }

    private MedicalRecordResponse toResponse(
            MedicalRecord medicalRecord) {

        return new MedicalRecordResponse(
                medicalRecord.getId(),
                medicalRecord.getHealthProfile().getId(),
                medicalRecord.getRecordType().name(),
                medicalRecord.getRecordDate(),
                medicalRecord.getProviderName(),
                medicalRecord.getProviderFacility(),
                medicalRecord.getReason(),
                medicalRecord.getDiagnosis(),
                medicalRecord.getMedication(),
                medicalRecord.getNotes()
        );
    }
}