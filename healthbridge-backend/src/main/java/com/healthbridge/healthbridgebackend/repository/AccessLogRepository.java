package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {

    List<AccessLog> findBySharingSessionId(Long sharingSessionId);

    List<AccessLog> findBySharingSessionIdOrderByAccessedAtDesc(Long sharingSessionId);
}