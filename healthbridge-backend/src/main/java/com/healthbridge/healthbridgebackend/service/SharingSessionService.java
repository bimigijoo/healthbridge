package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.repository.SharingSessionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SharingSessionService {

    private final SharingSessionRepository sharingSessionRepository;

    public SharingSessionService(
            SharingSessionRepository sharingSessionRepository
    ) {
        this.sharingSessionRepository = sharingSessionRepository;
    }

    public SharingSession saveSession(SharingSession session) {
        return sharingSessionRepository.save(session);
    }

    public Optional<SharingSession> findById(Long id) {
        return sharingSessionRepository.findById(id);
    }

    public Optional<SharingSession> findByAccessToken(String accessToken) {
        return sharingSessionRepository.findByAccessToken(accessToken);
    }

    public List<SharingSession> findByHealthProfileId(Long healthProfileId) {
        return sharingSessionRepository.findByHealthProfileId(healthProfileId);
    }

    public List<SharingSession> findActiveSessions(Long healthProfileId) {
        return sharingSessionRepository
                .findByHealthProfileIdAndRevokedFalse(healthProfileId);
    }

    public void deleteSession(Long id) {
        sharingSessionRepository.deleteById(id);
    }
}