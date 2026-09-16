package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FollowUpRepository extends JpaRepository<FollowUp, Long> {

    List<FollowUp> findByHealthProfileId(Long healthProfileId);

    List<FollowUp> findByHealthProfileIdAndStatus(
            Long healthProfileId,
            FollowUp.Status status
    );

    List<FollowUp> findByHealthProfileIdOrderByDueDateAsc(Long healthProfileId);
}