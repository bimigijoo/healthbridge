package com.healthbridge.healthbridgebackend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_passport_preferences")
@Getter @Setter @NoArgsConstructor
public class EmergencyPassportPreferences {
    @Id private Long healthProfileId;
    @MapsId @OneToOne(optional = false)
    @JoinColumn(name = "health_profile_id")
    private HealthProfile healthProfile;
    @Column(nullable = false, unique = true, length = 43)
    private String publicReference;
    @Column(nullable = false) private boolean enabled;
    @Column(nullable = false) private boolean bloodGroup;
    @Column(nullable = false) private boolean emergencyContact;
    @Column(nullable = false) private boolean allergies;
    @Column(nullable = false) private boolean conditions;
    @Column(nullable = false) private boolean medications;
    @Column(nullable = false) private boolean preferredLanguage;
    @Column(nullable = false) private LocalDateTime updatedAt;
    @PrePersist @PreUpdate void timestamp() { updatedAt = LocalDateTime.now(); }
}
