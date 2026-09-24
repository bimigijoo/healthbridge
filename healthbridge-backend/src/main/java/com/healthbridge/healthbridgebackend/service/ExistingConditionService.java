package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.ExistingCondition;
import com.healthbridge.healthbridgebackend.repository.ExistingConditionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ExistingConditionService {

    private final ExistingConditionRepository existingConditionRepository;

    public ExistingConditionService(
            ExistingConditionRepository existingConditionRepository
    ) {
        this.existingConditionRepository = existingConditionRepository;
    }

    public ExistingCondition saveCondition(ExistingCondition condition) {
        return existingConditionRepository.save(condition);
    }

    public Optional<ExistingCondition> findById(Long id) {
        return existingConditionRepository.findById(id);
    }

    public List<ExistingCondition> findByHealthProfileId(Long healthProfileId) {
        return existingConditionRepository.findByHealthProfileId(healthProfileId);
    }

    public void deleteCondition(Long id) {
        existingConditionRepository.deleteById(id);
    }
}