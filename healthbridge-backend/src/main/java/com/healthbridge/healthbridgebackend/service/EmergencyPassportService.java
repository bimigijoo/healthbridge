package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.dto.*;
import com.healthbridge.healthbridgebackend.entity.*;
import com.healthbridge.healthbridgebackend.repository.*;
import com.healthbridge.healthbridgebackend.security.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.SecureRandom;
import java.util.*;

@Service
public class EmergencyPassportService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final EmergencyPassportRepository preferences;
    private final HealthProfileRepository profiles;
    private final AllergyRepository allergies;
    private final ExistingConditionRepository conditions;
    private final CurrentMedicationRepository medications;
    private final CurrentUserService currentUser;

    public EmergencyPassportService(EmergencyPassportRepository preferences, HealthProfileRepository profiles,
            AllergyRepository allergies, ExistingConditionRepository conditions,
            CurrentMedicationRepository medications, CurrentUserService currentUser) {
        this.preferences = preferences; this.profiles = profiles; this.allergies = allergies;
        this.conditions = conditions; this.medications = medications; this.currentUser = currentUser;
    }

    private String newReference() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private EmergencyPassportPreferences owned(Long profileId) {
        if (currentUser.requireCurrentUser().getRole() != User.Role.WORKER) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var profile = profiles.findLockedById(profileId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        currentUser.assertProfileOwner(profile);
        return preferences.findById(profileId).orElseGet(() -> {
            var settings = new EmergencyPassportPreferences();
            settings.setHealthProfile(profile);
            settings.setPublicReference(newReference());
            // No existing profile is opted in; a missing row is always disabled.
            return preferences.saveAndFlush(settings);
        });
    }

    private EmergencyPassportSettings response(EmergencyPassportPreferences p) {
        return new EmergencyPassportSettings(p.isEnabled(), p.isBloodGroup(), p.isEmergencyContact(),
                p.isAllergies(), p.isConditions(), p.isMedications(), p.isPreferredLanguage());
    }

    @Transactional public EmergencyPassportSettings get(Long profileId) { return response(owned(profileId)); }

    @Transactional public EmergencyPassportSettings update(Long profileId, EmergencyPassportRequest request) {
        if (request.enabled() && !(request.bloodGroup() || request.emergencyContact() || request.allergies()
                || request.conditions() || request.medications() || request.preferredLanguage())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one emergency field.");
        }
        var p = owned(profileId);
        p.setEnabled(request.enabled()); p.setBloodGroup(request.bloodGroup()); p.setEmergencyContact(request.emergencyContact());
        p.setAllergies(request.allergies()); p.setConditions(request.conditions()); p.setMedications(request.medications());
        p.setPreferredLanguage(request.preferredLanguage());
        preferences.saveAndFlush(p);
        return response(p);
    }

    @Transactional public EmergencyPassportSettings regenerate(Long profileId) {
        var p = owned(profileId);
        p.setPublicReference(newReference());
        preferences.saveAndFlush(p);
        return response(p);
    }

    @Transactional public String reference(Long profileId) { return owned(profileId).getPublicReference(); }

    @Transactional public Optional<Map<String, Object>> publicInformation(String reference) {
        if (reference == null || !reference.matches("[A-Za-z0-9_-]{43}")) return Optional.empty();
        var found = preferences.findPublicForRead(reference).filter(EmergencyPassportPreferences::isEnabled)
                .filter(p -> p.getHealthProfile().getUser().isActive());
        if (found.isEmpty()) return Optional.empty();
        var p = found.get();
        var profile = p.getHealthProfile();
        Map<String, Object> data = new LinkedHashMap<>();
        if (p.isBloodGroup()) data.put("bloodGroup", Objects.requireNonNullElse(profile.getBloodGroup(), ""));
        if (p.isEmergencyContact()) data.put("emergencyContact", Objects.requireNonNullElse(profile.getEmergencyContact(), ""));
        if (p.isPreferredLanguage()) data.put("preferredLanguage", Objects.requireNonNullElse(profile.getPreferredLanguage(), ""));
        if (p.isAllergies()) data.put("allergies", allergies.findByHealthProfileId(profile.getId()).stream()
                .map(a -> Map.of("allergen", a.getAllergen(), "reaction", Objects.requireNonNullElse(a.getReaction(), ""))).toList());
        if (p.isConditions()) data.put("conditions", conditions.findByHealthProfileId(profile.getId()).stream()
                .map(ExistingCondition::getConditionName).toList());
        if (p.isMedications()) data.put("medications", medications.findByHealthProfileId(profile.getId()).stream()
                .map(m -> Map.of("medicationName", m.getMedicationName(), "dosage", Objects.requireNonNullElse(m.getDosage(), ""),
                        "frequency", Objects.requireNonNullElse(m.getFrequency(), ""))).toList());
        // Never serialize entities: IDs, notes, dates, names and unrelated clinical history are excluded.
        return Optional.of(data);
    }
}
