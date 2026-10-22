package com.healthbridge.healthbridgebackend.dto;

import jakarta.validation.constraints.NotNull;

public record EmergencyPassportRequest(
        @NotNull Boolean enabled, @NotNull Boolean bloodGroup, @NotNull Boolean emergencyContact,
        @NotNull Boolean allergies, @NotNull Boolean conditions, @NotNull Boolean medications,
        @NotNull Boolean preferredLanguage) { }
