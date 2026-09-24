package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.ExistingConditionRequest;
import com.healthbridge.healthbridgebackend.dto.ExistingConditionResponse;
import com.healthbridge.healthbridgebackend.entity.ExistingCondition;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.service.ExistingConditionService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/existing-conditions")
public class ExistingConditionController {

    private final ExistingConditionService existingConditionService;
    private final HealthProfileService healthProfileService;

    public ExistingConditionController(
            ExistingConditionService existingConditionService,
            HealthProfileService healthProfileService) {

        this.existingConditionService = existingConditionService;
        this.healthProfileService = healthProfileService;
    }

    @PostMapping
    public ResponseEntity<ExistingConditionResponse> createCondition(
            @Valid @RequestBody ExistingConditionRequest request) {

        HealthProfile healthProfile = healthProfileService
                .findById(request.getHealthProfileId())
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        ExistingCondition condition = new ExistingCondition();

        condition.setHealthProfile(healthProfile);
        condition.setConditionName(request.getConditionName());
        condition.setDiagnosedDate(request.getDiagnosedDate());
        condition.setNotes(request.getNotes());

        ExistingCondition savedCondition =
                existingConditionService.saveCondition(condition);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(savedCondition));
    }

    @GetMapping("/profile/{healthProfileId}")
    public ResponseEntity<List<ExistingConditionResponse>> getConditionsByProfile(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile = healthProfileService
                .findById(healthProfileId)
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<ExistingConditionResponse> responses =
                existingConditionService
                        .findByHealthProfileId(healthProfileId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCondition(
            @PathVariable Long id) {

        ExistingCondition condition = existingConditionService
                .findById(id)
                .orElse(null);

        if (condition == null) {
            return ResponseEntity.notFound().build();
        }

        existingConditionService.deleteCondition(id);

        return ResponseEntity.noContent().build();
    }

    private ExistingConditionResponse toResponse(
            ExistingCondition condition) {

        return new ExistingConditionResponse(
                condition.getId(),
                condition.getHealthProfile().getId(),
                condition.getConditionName(),
                condition.getDiagnosedDate(),
                condition.getNotes()
        );
    }
}