package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.MedicalRecordResponse;
import com.healthbridge.healthbridgebackend.dto.ProviderAccessResponse;
import com.healthbridge.healthbridgebackend.dto.ProviderConsultationRequest;
import com.healthbridge.healthbridgebackend.entity.AccessLog;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.entity.SharedRecord;
import com.healthbridge.healthbridgebackend.service.AccessLogService;
import com.healthbridge.healthbridgebackend.service.ProviderConsultationService;
import com.healthbridge.healthbridgebackend.service.SharedRecordService;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneId;

@RestController
@RequestMapping("/api/provider-access")
public class ProviderAccessController {
    private final SharingSessionService sessions;
    private final SharedRecordService sharedRecords;
    private final AccessLogService logs;
    private final ProviderConsultationService consultations;

    public ProviderAccessController(SharingSessionService sessions, SharedRecordService sharedRecords,
                                    AccessLogService logs, ProviderConsultationService consultations) {
        this.sessions = sessions;
        this.sharedRecords = sharedRecords;
        this.logs = logs;
        this.consultations = consultations;
    }

    @GetMapping({"", "/{accessToken}"})
    @Transactional
    public ResponseEntity<ProviderAccessResponse> accessSharedRecords(
            @PathVariable(required = false) String accessToken,
            @RequestHeader(value = "X-HealthBridge-Access-Code", required = false) String headerCode) {
        var session = sessions.findValidSessionForUpdate(resolveCode(accessToken, headerCode))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Sharing access is invalid, expired, or revoked."));
        var medicalRecords = sharedRecords.findBySharingSessionId(session.getId()).stream()
                .map(SharedRecord::getMedicalRecord)
                .filter(record -> record != null && record.getHealthProfile().getId()
                        .equals(session.getHealthProfile().getId()))
                .map(this::toResponse).toList();
        logs.saveLog(AccessLog.builder().sharingSession(session).providerName(session.getProviderName())
                .providerFacility(session.getProviderFacility()).action("VIEW_SHARED_RECORDS").build());
        var response = new ProviderAccessResponse(session.getId(), session.getHealthProfile().getHealthId(),
                session.getProviderName(), session.getProviderFacility(), session.getProviderRegistration(),
                session.getExpiresAt().atZone(ZoneId.systemDefault()).toInstant().toString(), medicalRecords);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }

    @PostMapping({"/consultation", "/{accessToken}/consultation"})
    public ResponseEntity<MedicalRecordResponse> addConsultation(
            @PathVariable(required = false) String accessToken,
            @RequestHeader(value = "X-HealthBridge-Access-Code", required = false) String headerCode,
            @RequestHeader("Idempotency-Key") String requestId,
            @Valid @RequestBody ProviderConsultationRequest request) {
        var record = consultations.submit(resolveCode(accessToken, headerCode), requestId, request);
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(toResponse(record));
    }

    private String resolveCode(String pathCode, String headerCode) {
        if (pathCode != null && headerCode != null && !pathCode.equals(headerCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conflicting sharing credentials.");
        }
        return headerCode == null ? pathCode : headerCode;
    }

    private MedicalRecordResponse toResponse(MedicalRecord record) {
        return new MedicalRecordResponse(record.getId(), record.getHealthProfile().getId(),
                record.getRecordType().name(), record.getRecordDate(), record.getProviderName(),
                record.getProviderFacility(), record.getReason(), record.getDiagnosis(),
                record.getMedication(), record.getNotes());
    }
}
