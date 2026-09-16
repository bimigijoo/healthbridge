package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.SharedRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SharedRecordRepository extends JpaRepository<SharedRecord, Long> {

    List<SharedRecord> findBySharingSessionId(Long sharingSessionId);
}