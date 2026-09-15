package com.healthbridge.healthbridgebackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "current_medications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CurrentMedication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "health_profile_id", nullable = false)
    private HealthProfile healthProfile;

    @Column(nullable = false)
    private String medicationName;

    private String dosage;

    private String frequency;

    private String notes;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}