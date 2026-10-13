package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.dto.ProviderConsultationRequest;
import com.healthbridge.healthbridgebackend.entity.AccessLog;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.repository.AccessLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;
import java.util.UUID;

@Service
public class ProviderConsultationService {
    public static final String RECEIPT_PREFIX = "ADD_CONSULTATION:";
    private final SharingSessionService sessions;
    private final MedicalRecordService records;
    private final AccessLogRepository logs;

    public ProviderConsultationService(SharingSessionService sessions, MedicalRecordService records,
                                       AccessLogRepository logs) {
        this.sessions = sessions;
        this.records = records;
        this.logs = logs;
    }

    @Transactional
    public MedicalRecord submit(String code, String requestId, ProviderConsultationRequest request) {
        if (requestId == null || !requestId.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid consultation request ID is required.");
        }
        // The session row lock also serializes revocation and concurrent retries across application instances.
        var session = sessions.findValidSessionForUpdate(code).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.FORBIDDEN, "Sharing access is invalid, expired, or revoked."));
        // A session is a consultation capability: new grants require affirmative worker consent.
        // Its record-read scope remains the explicit SharedRecord links, including an empty scope.
        String prefix = RECEIPT_PREFIX + UUID.fromString(requestId) + ":";
        var receipt = logs.findFirstBySharingSessionIdAndActionStartingWith(session.getId(), prefix);
        if (receipt.isPresent()) {
            Long recordId = Long.valueOf(receipt.get().getAction().substring(prefix.length()));
            var previous = records.findById(recordId).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.CONFLICT, "This consultation was already submitted and later removed."));
            if (!previous.getHealthProfile().getId().equals(session.getHealthProfile().getId())
                    || !matches(previous, request)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This request ID was already used for different consultation details.");
            }
            return previous;
        }

        var consultation = MedicalRecord.builder().healthProfile(session.getHealthProfile())
                .recordType(MedicalRecord.RecordType.CONSULTATION).recordDate(request.getRecordDate())
                .providerName(request.getProviderName()).providerFacility(request.getProviderFacility())
                .reason(request.getReason()).diagnosis(request.getDiagnosis())
                .medication(request.getMedication()).notes(request.getNotes()).build();
        var saved = records.saveRecord(consultation);
        // Durable retry receipt in the existing audit table; no access code or clinical text is stored in the action.
        logs.save(AccessLog.builder().sharingSession(session).providerName(request.getProviderName())
                .providerFacility(request.getProviderFacility()).action(prefix + saved.getId()).build());
        return saved;
    }

    private boolean matches(MedicalRecord record, ProviderConsultationRequest request) {
        return Objects.equals(record.getRecordDate(), request.getRecordDate())
                && Objects.equals(record.getProviderName(), request.getProviderName())
                && Objects.equals(record.getProviderFacility(), request.getProviderFacility())
                && Objects.equals(record.getReason(), request.getReason())
                && Objects.equals(record.getDiagnosis(), request.getDiagnosis())
                && Objects.equals(record.getMedication(), request.getMedication())
                && Objects.equals(record.getNotes(), request.getNotes());
    }
}
