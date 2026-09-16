package com.healthbridge.healthbridgebackend.dto;

public class AllergyResponse {

    private Long id;
    private Long healthProfileId;
    private String allergen;
    private String reaction;

    public AllergyResponse() {
    }

    public AllergyResponse(
            Long id,
            Long healthProfileId,
            String allergen,
            String reaction
    ) {
        this.id = id;
        this.healthProfileId = healthProfileId;
        this.allergen = allergen;
        this.reaction = reaction;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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