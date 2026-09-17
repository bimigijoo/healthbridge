package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.HealthProfileRequest;
import com.healthbridge.healthbridgebackend.dto.HealthProfileResponse;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/health-profile")
public class HealthProfileController {

    private final HealthProfileService healthProfileService;
    private final UserService userService;

    public HealthProfileController(
            HealthProfileService healthProfileService,
            UserService userService) {
        this.healthProfileService = healthProfileService;
        this.userService = userService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<HealthProfileResponse> getProfileByUserId(
            @PathVariable Long userId) {

        HealthProfile profile = healthProfileService.findByUserId(userId)
                .orElse(null);

        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        HealthProfileResponse response = new HealthProfileResponse(
                profile.getId(),
                profile.getUser().getId(),
                profile.getHealthId(),
                profile.getDateOfBirth(),
                profile.getGender(),
                profile.getBloodGroup(),
                profile.getEmergencyContact(),
                profile.getPreferredLanguage()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<HealthProfileResponse> createProfile(
            @Valid @RequestBody HealthProfileRequest request) {

        if (healthProfileService.existsByHealthId(request.getHealthId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        User user = userService.findById(request.getUserId())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (healthProfileService.findByUserId(request.getUserId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        HealthProfile profile = new HealthProfile();

        profile.setUser(user);
        profile.setHealthId(request.getHealthId());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setGender(request.getGender());
        profile.setBloodGroup(request.getBloodGroup());
        profile.setEmergencyContact(request.getEmergencyContact());
        profile.setPreferredLanguage(request.getPreferredLanguage());

        HealthProfile savedProfile = healthProfileService.saveProfile(profile);

        HealthProfileResponse response = new HealthProfileResponse(
                savedProfile.getId(),
                savedProfile.getUser().getId(),
                savedProfile.getHealthId(),
                savedProfile.getDateOfBirth(),
                savedProfile.getGender(),
                savedProfile.getBloodGroup(),
                savedProfile.getEmergencyContact(),
                savedProfile.getPreferredLanguage()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
}