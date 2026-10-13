package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.SharingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface SharingSessionRepository extends JpaRepository<SharingSession, Long> {

    Optional<SharingSession> findByAccessToken(String accessToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from SharingSession session where session.accessToken = :code")
    Optional<SharingSession> findLockedByAccessToken(@Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from SharingSession session where session.id = :id")
    Optional<SharingSession> findLockedById(@Param("id") Long id);

    List<SharingSession> findByHealthProfileId(Long healthProfileId);

    List<SharingSession> findByHealthProfileIdAndRevokedFalse(Long healthProfileId);

    long countByRevokedTrue();
    long countByRevokedFalseAndExpiresAtLessThanEqual(java.time.LocalDateTime time);
    long countByRevokedFalseAndExpiresAtAfterAndHealthProfileUserActiveTrue(java.time.LocalDateTime time);
    long countByRevokedFalseAndExpiresAtAfterAndHealthProfileUserActiveFalse(java.time.LocalDateTime time);
}
