package com.healthbridge.healthbridgebackend.dto;

public record EmergencyPassportSettings(boolean enabled, boolean bloodGroup, boolean emergencyContact,
        boolean allergies, boolean conditions, boolean medications, boolean preferredLanguage) { }
