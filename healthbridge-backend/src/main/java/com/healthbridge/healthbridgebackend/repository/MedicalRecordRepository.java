package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    List<MedicalRecord> findByHealthProfileId(Long healthProfileId);

    List<MedicalRecord> findByHealthProfileIdOrderByRecordDateDesc(Long healthProfileId);
}