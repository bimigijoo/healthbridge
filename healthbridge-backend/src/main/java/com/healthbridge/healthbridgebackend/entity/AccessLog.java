package com.healthbridge.healthbridgebackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "access_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sharing_session_id", nullable = false)
    private SharingSession sharingSession;

    @Column(nullable = false)
    private LocalDateTime accessedAt;

    private String providerName;

    private String providerFacility;

    @Column(nullable = false)
    private String action;
}