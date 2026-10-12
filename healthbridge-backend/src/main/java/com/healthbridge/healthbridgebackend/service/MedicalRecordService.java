package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.repository.MedicalRecordRepository;
import com.healthbridge.healthbridgebackend.repository.MedicalDocumentRepository;
import com.healthbridge.healthbridgebackend.repository.SharedRecordRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicalDocumentRepository medicalDocumentRepository;
    private final SharedRecordRepository sharedRecordRepository;

    public MedicalRecordService(MedicalRecordRepository medicalRecordRepository,
                                MedicalDocumentRepository medicalDocumentRepository,
                                SharedRecordRepository sharedRecordRepository) {
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.sharedRecordRepository = sharedRecordRepository;
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

    @Transactional
    public void deleteRecord(Long id) {
        if (medicalDocumentRepository.existsByMedicalRecordId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Delete the attached documents before deleting this record.");
        }
        sharedRecordRepository.deleteByMedicalRecordId(id);
        medicalRecordRepository.deleteById(id);
    }
}
