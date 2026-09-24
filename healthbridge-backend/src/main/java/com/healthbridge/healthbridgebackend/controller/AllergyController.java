package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.AllergyRequest;
import com.healthbridge.healthbridgebackend.dto.AllergyResponse;
import com.healthbridge.healthbridgebackend.entity.Allergy;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.service.AllergyService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/allergies")
public class AllergyController {

    private final AllergyService allergyService;
    private final HealthProfileService healthProfileService;

    public AllergyController(
            AllergyService allergyService,
            HealthProfileService healthProfileService) {

        this.allergyService = allergyService;
        this.healthProfileService = healthProfileService;
    }

    @PostMapping
    public ResponseEntity<AllergyResponse> createAllergy(
            @Valid @RequestBody AllergyRequest request) {

        HealthProfile healthProfile = healthProfileService
                .findById(request.getHealthProfileId())
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        Allergy allergy = new Allergy();

        allergy.setHealthProfile(healthProfile);
        allergy.setAllergen(request.getAllergen());
        allergy.setReaction(request.getReaction());

        Allergy savedAllergy = allergyService.saveAllergy(allergy);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(savedAllergy));
    }

    @GetMapping("/profile/{healthProfileId}")
    public ResponseEntity<List<AllergyResponse>> getAllergiesByProfile(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile = healthProfileService
                .findById(healthProfileId)
                .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<AllergyResponse> responses = allergyService
                .findByHealthProfileId(healthProfileId)
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAllergy(
            @PathVariable Long id) {

        Allergy allergy = allergyService
                .findById(id)
                .orElse(null);

        if (allergy == null) {
            return ResponseEntity.notFound().build();
        }

        allergyService.deleteAllergy(id);

        return ResponseEntity.noContent().build();
    }

    private AllergyResponse toResponse(Allergy allergy) {

        return new AllergyResponse(
                allergy.getId(),
                allergy.getHealthProfile().getId(),
                allergy.getAllergen(),
                allergy.getReaction()
        );
    }
}