package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.FollowUpResponse;
import com.healthbridge.healthbridgebackend.entity.FollowUp;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.service.FollowUpService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/follow-ups")
public class FollowUpController {

    private final FollowUpService followUpService;
    private final HealthProfileService healthProfileService;

    public FollowUpController(
            FollowUpService followUpService,
            HealthProfileService healthProfileService) {

        this.followUpService = followUpService;
        this.healthProfileService = healthProfileService;
    }

    @PostMapping
    public ResponseEntity<FollowUpResponse> createFollowUp(
            @Valid @RequestBody FollowUpRequest request) {

        HealthProfile healthProfile =
                healthProfileService
                        .findById(request.getHealthProfileId())
                        .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        FollowUp followUp = new FollowUp();

        followUp.setHealthProfile(healthProfile);
        followUp.setDescription(request.getDescription());
        followUp.setDueDate(request.getDueDate());
        followUp.setStatus(FollowUp.Status.PENDING);

        FollowUp savedFollowUp =
                followUpService.saveFollowUp(followUp);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(savedFollowUp));
    }

    @GetMapping("/profile/{healthProfileId}")
    public ResponseEntity<List<FollowUpResponse>> getFollowUpsByProfile(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile =
                healthProfileService
                        .findById(healthProfileId)
                        .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<FollowUpResponse> responses =
                followUpService
                        .findByHealthProfileIdOrderByDueDateAsc(
                                healthProfileId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/profile/{healthProfileId}/pending")
    public ResponseEntity<List<FollowUpResponse>> getPendingFollowUps(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile =
                healthProfileService
                        .findById(healthProfileId)
                        .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<FollowUpResponse> responses =
                followUpService
                        .findPendingFollowUps(healthProfileId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<FollowUpResponse> completeFollowUp(
            @PathVariable Long id) {

        FollowUp followUp =
                followUpService.findById(id).orElse(null);

        if (followUp == null) {
            return ResponseEntity.notFound().build();
        }

        followUp.setStatus(FollowUp.Status.COMPLETED);
        followUp.setCompletedAt(LocalDateTime.now());

        FollowUp updatedFollowUp =
                followUpService.saveFollowUp(followUp);

        return ResponseEntity.ok(toResponse(updatedFollowUp));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFollowUp(
            @PathVariable Long id) {

        FollowUp followUp =
                followUpService.findById(id).orElse(null);

        if (followUp == null) {
            return ResponseEntity.notFound().build();
        }

        followUpService.deleteFollowUp(id);

        return ResponseEntity.noContent().build();
    }

    private FollowUpResponse toResponse(FollowUp followUp) {

        return new FollowUpResponse(
                followUp.getId(),
                followUp.getHealthProfile().getId(),
                followUp.getDescription(),
                followUp.getDueDate(),
                followUp.getStatus().name(),
                followUp.getCompletedAt()
        );
    }

    public static class FollowUpRequest {

        private Long healthProfileId;
        private String description;
        private java.time.LocalDate dueDate;

        public FollowUpRequest() {
        }

        public Long getHealthProfileId() {
            return healthProfileId;
        }

        public void setHealthProfileId(Long healthProfileId) {
            this.healthProfileId = healthProfileId;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public java.time.LocalDate getDueDate() {
            return dueDate;
        }

        public void setDueDate(java.time.LocalDate dueDate) {
            this.dueDate = dueDate;
        }
    }
}