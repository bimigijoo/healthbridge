package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.repository.MedicalRecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;

    public MedicalRecordService(MedicalRecordRepository medicalRecordRepository) {
        this.medicalRecordRepository = medicalRecordRepository;
    }

    public MedicalRecord saveRecord(MedicalRecord medicalRecord) {
        return medicalRecordRepository.save(medicalRecord);
    }

    public Optional<MedicalRecord> findById(Long id) {
        return medicalRecordRepository.findById(id);
    }

    public List<MedicalRecord> findByHealthProfileId(Long healthProfileId) {
        return medicalRecordRepository.findByHealthProfileId(healthProfileId);
    }

    public List<MedicalRecord> findByHealthProfileIdOrderByRecordDateDesc(
            Long healthProfileId
    ) {
        return medicalRecordRepository
                .findByHealthProfileIdOrderByRecordDateDesc(healthProfileId);
    }

    public void deleteRecord(Long id) {
        medicalRecordRepository.deleteById(id);
    }
}