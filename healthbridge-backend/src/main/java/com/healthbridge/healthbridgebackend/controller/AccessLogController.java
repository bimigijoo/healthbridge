package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.AccessLogResponse;
import com.healthbridge.healthbridgebackend.entity.AccessLog;
import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.service.AccessLogService;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/access-logs")
public class AccessLogController {

    private final AccessLogService accessLogService;
    private final SharingSessionService sharingSessionService;

    public AccessLogController(
            AccessLogService accessLogService,
            SharingSessionService sharingSessionService) {

        this.accessLogService = accessLogService;
        this.sharingSessionService = sharingSessionService;
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<AccessLogResponse>> getAccessLogsBySession(
            @PathVariable Long sessionId) {

        SharingSession session =
                sharingSessionService.findById(sessionId).orElse(null);

        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        List<AccessLogResponse> responses =
                accessLogService
                        .findBySharingSessionIdOrderByAccessedAtDesc(sessionId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    private AccessLogResponse toResponse(AccessLog accessLog) {

        return new AccessLogResponse(
                accessLog.getId(),
                accessLog.getSharingSession().getId(),
                accessLog.getAccessedAt(),
                accessLog.getProviderName(),
                accessLog.getProviderFacility(),
                accessLog.getAction()
        );
    }
}