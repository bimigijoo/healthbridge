package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.entity.FollowUp;
import com.healthbridge.healthbridgebackend.repository.FollowUpRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FollowUpService {

    private final FollowUpRepository followUpRepository;

    public FollowUpService(FollowUpRepository followUpRepository) {
        this.followUpRepository = followUpRepository;
    }

    public FollowUp saveFollowUp(FollowUp followUp) {
        return followUpRepository.save(followUp);
    }

    public Optional<FollowUp> findById(Long id) {
        return followUpRepository.findById(id);
    }

    public List<FollowUp> findByHealthProfileId(Long healthProfileId) {
        return followUpRepository.findByHealthProfileId(healthProfileId);
    }

    public List<FollowUp> findPendingFollowUps(Long healthProfileId) {
        return followUpRepository.findByHealthProfileIdAndStatus(
                healthProfileId,
                FollowUp.Status.PENDING
        );
    }

    public List<FollowUp> findByHealthProfileIdOrderByDueDateAsc(
            Long healthProfileId
    ) {
        return followUpRepository
                .findByHealthProfileIdOrderByDueDateAsc(healthProfileId);
    }

    public void deleteFollowUp(Long id) {
        followUpRepository.deleteById(id);
    }
}