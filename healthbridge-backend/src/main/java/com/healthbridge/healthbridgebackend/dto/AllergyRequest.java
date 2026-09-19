package com.healthbridge.healthbridgebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AllergyRequest {

    @NotNull
    private Long healthProfileId;

    @NotBlank
    private String allergen;

    private String reaction;

    public AllergyRequest() {
    }

    public AllergyRequest(
            Long healthProfileId,
            String allergen,
            String reaction) {

        this.healthProfileId = healthProfileId;
        this.allergen = allergen;
        this.reaction = reaction;
    }

    public Long getHealthProfileId() {
        return healthProfileId;
    }

    public void setHealthProfileId(Long healthProfileId) {
        this.healthProfileId = healthProfileId;
    }

    public String getAllergen() {
        return allergen;
    }

    public void setAllergen(String allergen) {
        this.allergen = allergen;
    }

    public String getReaction() {
        return reaction;
    }

    public void setReaction(String reaction) {
        this.reaction = reaction;
    }
}