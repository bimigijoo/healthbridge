package com.healthbridge.healthbridgebackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shared_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sharing_session_id", nullable = false)
    private SharingSession sharingSession;

    @ManyToOne
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;
}