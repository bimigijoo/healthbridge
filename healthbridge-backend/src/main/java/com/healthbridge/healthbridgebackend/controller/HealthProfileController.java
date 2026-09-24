package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.HealthProfileRequest;
import com.healthbridge.healthbridgebackend.dto.HealthProfileResponse;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.qr.QrCodeService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/health-profile")
public class HealthProfileController {

    private final HealthProfileService healthProfileService;
    private final UserService userService;
    private final QrCodeService qrCodeService;

    public HealthProfileController(
            HealthProfileService healthProfileService,
            UserService userService,
            QrCodeService qrCodeService) {

        this.healthProfileService = healthProfileService;
        this.userService = userService;
        this.qrCodeService = qrCodeService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<HealthProfileResponse> getProfileByUserId(
            @PathVariable Long userId) {

        HealthProfile profile =
                healthProfileService
                        .findByUserId(userId)
                        .orElse(null);

        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(toResponse(profile));
    }

    @PostMapping
    public ResponseEntity<HealthProfileResponse> createProfile(
            @Valid @RequestBody HealthProfileRequest request) {

        if (healthProfileService
                .existsByHealthId(request.getHealthId())) {

            return ResponseEntity.badRequest().build();
        }

        User user =
                userService
                        .findById(request.getUserId())
                        .orElse(null);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        HealthProfile profile = new HealthProfile();

        profile.setUser(user);
        profile.setHealthId(request.getHealthId());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setGender(request.getGender());
        profile.setBloodGroup(request.getBloodGroup());
        profile.setEmergencyContact(request.getEmergencyContact());
        profile.setPreferredLanguage(request.getPreferredLanguage());

        HealthProfile savedProfile =
                healthProfileService.saveProfile(profile);

        return ResponseEntity
                .status(201)
                .body(toResponse(savedProfile));
    }

    @GetMapping("/{healthProfileId}/qr")
    public ResponseEntity<byte[]> generateHealthProfileQr(
            @PathVariable Long healthProfileId) {

        HealthProfile profile =
                healthProfileService
                        .findById(healthProfileId)
                        .orElse(null);

        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        String qrContent =
                "HEALTHBRIDGE:" + profile.getHealthId();

        byte[] qrImage =
                qrCodeService.generateQrCode(
                        qrContent,
                        400,
                        400
                );

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"healthbridge-qr.png\""
                )
                .contentType(MediaType.IMAGE_PNG)
                .contentLength(qrImage.length)
                .body(qrImage);
    }

    private HealthProfileResponse toResponse(
            HealthProfile profile) {

        return new HealthProfileResponse(
                profile.getId(),
                profile.getUser().getId(),
                profile.getHealthId(),
                profile.getDateOfBirth(),
                profile.getGender(),
                profile.getBloodGroup(),
                profile.getEmergencyContact(),
                profile.getPreferredLanguage()
        );
    }
}