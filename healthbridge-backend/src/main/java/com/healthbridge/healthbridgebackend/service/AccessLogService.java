package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.AccessLog;
import com.healthbridge.healthbridgebackend.repository.AccessLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AccessLogService {

    private final AccessLogRepository accessLogRepository;

    public AccessLogService(AccessLogRepository accessLogRepository) {
        this.accessLogRepository = accessLogRepository;
    }

    public AccessLog saveLog(AccessLog accessLog) {
        return accessLogRepository.save(accessLog);
    }

    public Optional<AccessLog> findById(Long id) {
        return accessLogRepository.findById(id);
    }

    public List<AccessLog> findBySharingSessionId(Long sharingSessionId) {
        return accessLogRepository.findBySharingSessionId(sharingSessionId);
    }

    public List<AccessLog> findBySharingSessionIdOrderByAccessedAtDesc(
            Long sharingSessionId
    ) {
        return accessLogRepository
                .findBySharingSessionIdOrderByAccessedAtDesc(sharingSessionId);
    }

    public void deleteLog(Long id) {
        accessLogRepository.deleteById(id);
    }
}