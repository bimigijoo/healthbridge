package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.HealthProfileRequest;
import com.healthbridge.healthbridgebackend.dto.HealthProfileResponse;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.qr.QrCodeService;
import com.healthbridge.healthbridgebackend.qr.ProviderAccessLinkService;
import com.healthbridge.healthbridgebackend.security.CurrentUserService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/health-profile")
public class HealthProfileController {

    private final HealthProfileService healthProfileService;
    private final UserService userService;
    private final QrCodeService qrCodeService;
    private final CurrentUserService currentUserService;
    private final ProviderAccessLinkService publicLinks;

    public HealthProfileController(
            HealthProfileService healthProfileService,
            UserService userService,
            QrCodeService qrCodeService,
            CurrentUserService currentUserService,
            ProviderAccessLinkService publicLinks) {

        this.healthProfileService = healthProfileService;
        this.userService = userService;
        this.qrCodeService = qrCodeService;
        this.currentUserService = currentUserService;
        this.publicLinks = publicLinks;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<HealthProfileResponse> getProfileByUserId(
            @PathVariable Long userId) {

        currentUserService.assertSameUser(userId);

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

        currentUserService.assertSameUser(request.getUserId());

        if (healthProfileService.findByUserId(request.getUserId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
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
            @PathVariable Long healthProfileId,
            @RequestParam(defaultValue = "false") boolean includeReference) {

        HealthProfile profile =
                healthProfileService
                        .findById(healthProfileId)
                        .orElse(null);

        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        currentUserService.assertProfileOwner(profile);

        String qrContent =
                publicLinks.createPassportLink(profile.getHealthId(), includeReference);

        byte[] qrImage =
                qrCodeService.generateQrCode(
                        qrContent,
                        400,
                        400
                );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"healthbridge-qr.png\""
                )
                .contentType(MediaType.IMAGE_PNG)
                .contentLength(qrImage.length)
                .body(qrImage);
    }

    @GetMapping("/{healthProfileId}/passport-link")
    public ResponseEntity<Map<String, String>> passportLink(@PathVariable Long healthProfileId,
            @RequestParam(defaultValue = "false") boolean includeReference) {
        var profile = healthProfileService.findById(healthProfileId).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND));
        currentUserService.assertProfileOwner(profile);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("url",
                publicLinks.createPassportLink(profile.getHealthId(), includeReference)));
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
