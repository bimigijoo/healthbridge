package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.repository.SharingSessionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SharingSessionService {

    private final SharingSessionRepository sharingSessionRepository;

    public SharingSessionService(
            SharingSessionRepository sharingSessionRepository) {

        this.sharingSessionRepository = sharingSessionRepository;
    }

    public SharingSession saveSession(SharingSession session) {
        return sharingSessionRepository.save(session);
    }

    public Optional<SharingSession> findById(Long id) {
        return sharingSessionRepository.findById(id);
    }

    public Optional<SharingSession> findByIdForUpdate(Long id) {
        return sharingSessionRepository.findLockedById(id);
    }

    public Optional<SharingSession> findValidSessionForUpdate(String code) {
        if (code == null || code.isBlank() || code.length() > 128) {
            return Optional.empty();
        }
        return sharingSessionRepository.findLockedByAccessToken(code).filter(this::isValid);
    }

    public boolean isValid(SharingSession session) {
        return session != null && !session.isRevoked() && session.getHealthProfile() != null
                && session.getHealthProfile().getUser() != null && session.getHealthProfile().getUser().isActive()
                && session.getExpiresAt() != null && session.getExpiresAt().isAfter(LocalDateTime.now());
    }

    public Optional<SharingSession> findByAccessToken(
            String accessToken) {

        return sharingSessionRepository
                .findByAccessToken(accessToken);
    }

    public Optional<SharingSession> findValidSessionByAccessToken(
            String accessToken) {

        Optional<SharingSession> session =
                sharingSessionRepository
                        .findByAccessToken(accessToken);

        if (session.isEmpty()) {
            return Optional.empty();
        }

        SharingSession sharingSession = session.get();

        if (sharingSession.isRevoked()) {
            return Optional.empty();
        }

        if (sharingSession.getExpiresAt() == null
                || !sharingSession.getExpiresAt()
                .isAfter(LocalDateTime.now())) {

            return Optional.empty();
        }

        return Optional.of(sharingSession);
    }

    public List<SharingSession> findByHealthProfileId(
            Long healthProfileId) {

        return sharingSessionRepository
                .findByHealthProfileId(healthProfileId);
    }

    public List<SharingSession> findActiveSessions(
            Long healthProfileId) {

        LocalDateTime now = LocalDateTime.now();

        return sharingSessionRepository
                .findByHealthProfileIdAndRevokedFalse(
                        healthProfileId)
                .stream()
                .filter(session ->
                        session.getExpiresAt() != null
                                && session.getExpiresAt().isAfter(now))
                .toList();
    }

    public void deleteSession(Long id) {
        sharingSessionRepository.deleteById(id);
    }
}
