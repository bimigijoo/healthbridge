package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.Allergy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AllergyRepository extends JpaRepository<Allergy, Long> {

    List<Allergy> findByHealthProfileId(Long healthProfileId);
}