package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.CurrentMedicationRequest;
import com.healthbridge.healthbridgebackend.dto.CurrentMedicationResponse;
import com.healthbridge.healthbridgebackend.entity.CurrentMedication;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.service.CurrentMedicationService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/current-medications")
public class CurrentMedicationController {

    private final CurrentMedicationService currentMedicationService;
    private final HealthProfileService healthProfileService;

    public CurrentMedicationController(
            CurrentMedicationService currentMedicationService,
            HealthProfileService healthProfileService) {

        this.currentMedicationService = currentMedicationService;
        this.healthProfileService = healthProfileService;
    }

    @PostMapping
    public ResponseEntity<CurrentMedicationResponse> createMedication(
            @Valid @RequestBody CurrentMedicationRequest request) {

        HealthProfile healthProfile = healthProfileService
                .findById(request.getHealthProfileId())
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        CurrentMedication medication = new CurrentMedication();

        medication.setHealthProfile(healthProfile);
        medication.setMedicationName(request.getMedicationName());
        medication.setDosage(request.getDosage());
        medication.setFrequency(request.getFrequency());
        medication.setNotes(request.getNotes());

        CurrentMedication savedMedication =
                currentMedicationService.saveMedication(medication);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(savedMedication));
    }

    @GetMapping("/profile/{healthProfileId}")
    public ResponseEntity<List<CurrentMedicationResponse>> getMedicationsByProfile(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile = healthProfileService
                .findById(healthProfileId)
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<CurrentMedicationResponse> responses =
                currentMedicationService
                        .findByHealthProfileId(healthProfileId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedication(
            @PathVariable Long id) {

        CurrentMedication medication = currentMedicationService
                .findById(id)
                .orElse(null);

        if (medication == null) {
            return ResponseEntity.notFound().build();
        }

        currentMedicationService.deleteMedication(id);

        return ResponseEntity.noContent().build();
    }

    private CurrentMedicationResponse toResponse(
            CurrentMedication medication) {

        return new CurrentMedicationResponse(
                medication.getId(),
                medication.getHealthProfile().getId(),
                medication.getMedicationName(),
                medication.getDosage(),
                medication.getFrequency(),
                medication.getNotes()
        );
    }
}