package com.healthbridge.healthbridgebackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "health_profile_id", nullable = false)
    private HealthProfile healthProfile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordType recordType;

    @Column(nullable = false)
    private LocalDate recordDate;

    private String providerName;

    private String providerFacility;

    private String reason;

    private String diagnosis;

    private String medication;

    private String notes;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum RecordType {
        CONSULTATION,
        DIAGNOSIS,
        MEDICATION,
        VACCINATION,
        PRESCRIPTION,
        LAB_REPORT,
        OTHER
    }
}