package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HealthProfileRepository extends JpaRepository<HealthProfile, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from HealthProfile p where p.id = :id")
    Optional<HealthProfile> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    Optional<HealthProfile> findByHealthId(String healthId);

    Optional<HealthProfile> findByUserId(Long userId);

    boolean existsByHealthId(String healthId);

    long countByUserRole(com.healthbridge.healthbridgebackend.entity.User.Role role);
}
