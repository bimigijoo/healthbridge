package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.MedicalDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalDocumentRepository extends JpaRepository<MedicalDocument, Long> {

    List<MedicalDocument> findByMedicalRecordId(Long medicalRecordId);
}