package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.SharedRecordResponse;
import com.healthbridge.healthbridgebackend.entity.SharedRecord;
import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.service.SharedRecordService;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shared-records")
public class SharedRecordController {

    private final SharedRecordService sharedRecordService;
    private final SharingSessionService sharingSessionService;

    public SharedRecordController(
            SharedRecordService sharedRecordService,
            SharingSessionService sharingSessionService) {

        this.sharedRecordService = sharedRecordService;
        this.sharingSessionService = sharingSessionService;
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<SharedRecordResponse>> getSharedRecordsBySession(
            @PathVariable Long sessionId) {

        SharingSession session = sharingSessionService
                .findById(sessionId)
                .orElse(null);

        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        List<SharedRecordResponse> responses =
                sharedRecordService
                        .findBySharingSessionId(sessionId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    private SharedRecordResponse toResponse(
            SharedRecord sharedRecord) {

        return new SharedRecordResponse(
                sharedRecord.getId(),
                sharedRecord.getSharingSession().getId(),
                sharedRecord.getMedicalRecord().getId()
        );
    }
}