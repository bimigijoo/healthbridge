package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.CurrentMedicationRequest;
import com.healthbridge.healthbridgebackend.dto.CurrentMedicationResponse;
import com.healthbridge.healthbridgebackend.entity.CurrentMedication;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.security.CurrentUserService;
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
    private final CurrentUserService currentUserService;

    public CurrentMedicationController(
            CurrentMedicationService currentMedicationService,
            HealthProfileService healthProfileService,
            CurrentUserService currentUserService) {

        this.currentMedicationService = currentMedicationService;
        this.healthProfileService = healthProfileService;
        this.currentUserService = currentUserService;
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

        currentUserService.assertProfileOwner(healthProfile);

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

        currentUserService.assertProfileOwner(healthProfile);

        List<CurrentMedicationResponse> responses =
                currentMedicationService
                        .findByHealthProfileId(healthProfileId)
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CurrentMedicationResponse> update(@PathVariable Long id, @Valid @RequestBody CurrentMedicationRequest request) {
        var item = currentMedicationService.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        currentUserService.assertProfileOwner(item.getHealthProfile());
        if (!item.getHealthProfile().getId().equals(request.getHealthProfileId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        item.setMedicationName(request.getMedicationName());
        item.setDosage(request.getDosage());
        item.setFrequency(request.getFrequency());
        item.setNotes(request.getNotes());
        return ResponseEntity.ok(toResponse(currentMedicationService.saveMedication(item)));
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

        currentUserService.assertProfileOwner(medication.getHealthProfile());

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
