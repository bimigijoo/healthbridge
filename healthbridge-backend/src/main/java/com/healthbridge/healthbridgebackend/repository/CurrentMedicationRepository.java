package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.CurrentMedication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CurrentMedicationRepository extends JpaRepository<CurrentMedication, Long> {

    List<CurrentMedication> findByHealthProfileId(Long healthProfileId);
}