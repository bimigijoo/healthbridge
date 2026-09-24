package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.Allergy;
import com.healthbridge.healthbridgebackend.repository.AllergyRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AllergyService {

    private final AllergyRepository allergyRepository;

    public AllergyService(AllergyRepository allergyRepository) {
        this.allergyRepository = allergyRepository;
    }

    public Allergy saveAllergy(Allergy allergy) {
        return allergyRepository.save(allergy);
    }

    public Optional<Allergy> findById(Long id) {
        return allergyRepository.findById(id);
    }

    public List<Allergy> findByHealthProfileId(Long healthProfileId) {
        return allergyRepository.findByHealthProfileId(healthProfileId);
    }

    public void deleteAllergy(Long id) {
        allergyRepository.deleteById(id);
    }
}