package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.repository.SharingSessionRepository;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SharingSessionSecurityTest {

    private SharingSessionRepository sharingSessionRepository;
    private SharingSessionService sharingSessionService;

    @BeforeEach
    void setUp() {
        sharingSessionRepository = mock(SharingSessionRepository.class);
        sharingSessionService = new SharingSessionService(sharingSessionRepository);
    }

    @Test
    void expiredSessionIsNotValid() {
        SharingSession session = SharingSession.builder()
                .id(1L)
                .accessToken("expired-token")
                .revoked(false)
                .expiresAt(LocalDateTime.now().minusMinutes(1))
                .build();

        when(sharingSessionRepository.findByAccessToken("expired-token"))
                .thenReturn(Optional.of(session));

        assertTrue(sharingSessionService
                .findValidSessionByAccessToken("expired-token")
                .isEmpty());
    }

    @Test
    void revokedSessionIsNotValid() {
        SharingSession session = SharingSession.builder()
                .id(2L)
                .accessToken("revoked-token")
                .revoked(true)
                .expiresAt(LocalDateTime.now().plusHours(2))
                .build();

        when(sharingSessionRepository.findByAccessToken("revoked-token"))
                .thenReturn(Optional.of(session));

        assertTrue(sharingSessionService
                .findValidSessionByAccessToken("revoked-token")
                .isEmpty());
    }

    @Test
    void activeUnexpiredSessionIsValid() {
        SharingSession session = SharingSession.builder()
                .id(3L)
                .accessToken("active-token")
                .revoked(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(sharingSessionRepository.findByAccessToken("active-token"))
                .thenReturn(Optional.of(session));

        assertTrue(sharingSessionService
                .findValidSessionByAccessToken("active-token")
                .isPresent());
    }

    @Test
    void expiredSessionsAreExcludedFromActiveList() {
        SharingSession expired = SharingSession.builder()
                .id(4L)
                .revoked(false)
                .expiresAt(LocalDateTime.now().minusHours(1))
                .build();

        SharingSession active = SharingSession.builder()
                .id(5L)
                .revoked(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(sharingSessionRepository.findByHealthProfileIdAndRevokedFalse(10L))
                .thenReturn(List.of(expired, active));

        List<SharingSession> activeSessions =
                sharingSessionService.findActiveSessions(10L);

        assertFalse(activeSessions.contains(expired));
        assertTrue(activeSessions.contains(active));
    }
}
