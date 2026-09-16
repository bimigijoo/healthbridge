package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.MedicalDocument;
import com.healthbridge.healthbridgebackend.repository.MedicalDocumentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MedicalDocumentService {

    private final MedicalDocumentRepository medicalDocumentRepository;

    public MedicalDocumentService(MedicalDocumentRepository medicalDocumentRepository) {
        this.medicalDocumentRepository = medicalDocumentRepository;
    }

    public MedicalDocument saveDocument(MedicalDocument medicalDocument) {
        return medicalDocumentRepository.save(medicalDocument);
    }

    public Optional<MedicalDocument> findById(Long id) {
        return medicalDocumentRepository.findById(id);
    }

    public List<MedicalDocument> findByMedicalRecordId(Long medicalRecordId) {
        return medicalDocumentRepository.findByMedicalRecordId(medicalRecordId);
    }

    public void deleteDocument(Long id) {
        medicalDocumentRepository.deleteById(id);
    }
}