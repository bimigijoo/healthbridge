package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.SharingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SharingSessionRepository extends JpaRepository<SharingSession, Long> {

    Optional<SharingSession> findByAccessToken(String accessToken);

    List<SharingSession> findByHealthProfileId(Long healthProfileId);

    List<SharingSession> findByHealthProfileIdAndRevokedFalse(Long healthProfileId);
}