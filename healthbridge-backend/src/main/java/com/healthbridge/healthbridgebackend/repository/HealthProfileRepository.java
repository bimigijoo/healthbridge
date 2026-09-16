package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HealthProfileRepository extends JpaRepository<HealthProfile, Long> {

    Optional<HealthProfile> findByHealthId(String healthId);

    Optional<HealthProfile> findByUserId(Long userId);

    boolean existsByHealthId(String healthId);
}