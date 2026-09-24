package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.CurrentMedication;
import com.healthbridge.healthbridgebackend.repository.CurrentMedicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CurrentMedicationService {

    private final CurrentMedicationRepository currentMedicationRepository;

    public CurrentMedicationService(
            CurrentMedicationRepository currentMedicationRepository
    ) {
        this.currentMedicationRepository = currentMedicationRepository;
    }

    public CurrentMedication saveMedication(CurrentMedication medication) {
        return currentMedicationRepository.save(medication);
    }

    public Optional<CurrentMedication> findById(Long id) {
        return currentMedicationRepository.findById(id);
    }

    public List<CurrentMedication> findByHealthProfileId(Long healthProfileId) {
        return currentMedicationRepository.findByHealthProfileId(healthProfileId);
    }

    public void deleteMedication(Long id) {
        currentMedicationRepository.deleteById(id);
    }
}