package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.repository.HealthProfileRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class HealthProfileService {

    private final HealthProfileRepository healthProfileRepository;

    public HealthProfileService(HealthProfileRepository healthProfileRepository) {
        this.healthProfileRepository = healthProfileRepository;
    }

    public HealthProfile saveProfile(HealthProfile healthProfile) {
        return healthProfileRepository.save(healthProfile);
    }

    public Optional<HealthProfile> findById(Long id) {
        return healthProfileRepository.findById(id);
    }

    public Optional<HealthProfile> findByHealthId(String healthId) {
        return healthProfileRepository.findByHealthId(healthId);
    }

    public Optional<HealthProfile> findByUserId(Long userId) {
        return healthProfileRepository.findByUserId(userId);
    }

    public boolean existsByHealthId(String healthId) {
        return healthProfileRepository.existsByHealthId(healthId);
    }
}