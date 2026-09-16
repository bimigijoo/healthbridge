package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.ExistingCondition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExistingConditionRepository extends JpaRepository<ExistingCondition, Long> {

    List<ExistingCondition> findByHealthProfileId(Long healthProfileId);
}