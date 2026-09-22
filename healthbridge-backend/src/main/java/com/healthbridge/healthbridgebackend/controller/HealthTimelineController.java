package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.HealthTimelineResponse;
import com.healthbridge.healthbridgebackend.entity.FollowUp;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.service.FollowUpService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/health-timeline")
public class HealthTimelineController {

    private final MedicalRecordService medicalRecordService;
    private final FollowUpService followUpService;
    private final HealthProfileService healthProfileService;

    public HealthTimelineController(
            MedicalRecordService medicalRecordService,
            FollowUpService followUpService,
            HealthProfileService healthProfileService) {

        this.medicalRecordService = medicalRecordService;
        this.followUpService = followUpService;
        this.healthProfileService = healthProfileService;
    }

    @GetMapping("/profile/{healthProfileId}")
    public ResponseEntity<List<HealthTimelineResponse>> getTimeline(
            @PathVariable Long healthProfileId) {

        HealthProfile healthProfile =
                healthProfileService
                        .findById(healthProfileId)
                        .orElse(null);

        if (healthProfile == null) {
            return ResponseEntity.notFound().build();
        }

        List<HealthTimelineResponse> timeline =
                new ArrayList<>();

        List<MedicalRecord> medicalRecords =
                medicalRecordService
                        .findByHealthProfileIdOrderByRecordDateDesc(
                                healthProfileId);

        for (MedicalRecord record : medicalRecords) {

            timeline.add(
                    new HealthTimelineResponse(
                            "MEDICAL_RECORD",
                            record.getId(),
                            record.getRecordDate().toString(),
                            record.getRecordType().name(),
                            buildMedicalRecordDescription(record),
                            null
                    )
            );
        }

        List<FollowUp> followUps =
                followUpService
                        .findByHealthProfileIdOrderByDueDateAsc(
                                healthProfileId);

        for (FollowUp followUp : followUps) {

            timeline.add(
                    new HealthTimelineResponse(
                            "FOLLOW_UP",
                            followUp.getId(),
                            followUp.getDueDate().toString(),
                            "Follow-up",
                            followUp.getDescription(),
                            followUp.getStatus().name()
                    )
            );
        }

        timeline.sort(
                Comparator.comparing(
                                HealthTimelineResponse::getEventDate)
                        .reversed()
        );

        return ResponseEntity.ok(timeline);
    }

    private String buildMedicalRecordDescription(
            MedicalRecord record) {

        List<String> details = new ArrayList<>();

        if (record.getReason() != null
                && !record.getReason().isBlank()) {
            details.add("Reason: " + record.getReason());
        }

        if (record.getDiagnosis() != null
                && !record.getDiagnosis().isBlank()) {
            details.add("Diagnosis: " + record.getDiagnosis());
        }

        if (record.getMedication() != null
                && !record.getMedication().isBlank()) {
            details.add("Medication: " + record.getMedication());
        }

        if (record.getProviderName() != null
                && !record.getProviderName().isBlank()) {
            details.add("Provider: " + record.getProviderName());
        }

        if (record.getProviderFacility() != null
                && !record.getProviderFacility().isBlank()) {
            details.add("Facility: " + record.getProviderFacility());
        }

        if (record.getNotes() != null
                && !record.getNotes().isBlank()) {
            details.add("Notes: " + record.getNotes());
        }

        return String.join(" | ", details);
    }
}