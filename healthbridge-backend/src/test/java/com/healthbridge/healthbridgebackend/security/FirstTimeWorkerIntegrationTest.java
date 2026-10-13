package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.entity.*;
import com.healthbridge.healthbridgebackend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FirstTimeWorkerIntegrationTest {
    @TempDir static Path uploads;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry properties) {
        properties.add("file.upload-dir", () -> uploads.toString());
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired HealthProfileRepository profiles;
    @Autowired MedicalRecordRepository records;
    @Autowired SharingSessionRepository sessions;
    @Autowired JwtService jwt;
    @Autowired CustomUserDetailsService details;
    private User worker;
    private String auth;

    @BeforeEach void setUp() {
        worker = users.save(User.builder().name("Synthetic First Worker").email("first-worker@example.test")
                .password("unused-synthetic-hash").active(true).role(User.Role.WORKER).build());
        auth = token(worker);
    }

    private String token(User user) { return "Bearer " + jwt.generateToken(details.loadUserByUsername(user.getEmail())); }
    private HealthProfile createProfile() throws Exception {
        mvc.perform(post("/api/health-profile").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("userId", worker.getId()))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.healthId").isNotEmpty());
        return profiles.findByUserId(worker.getId()).orElseThrow();
    }
    private Map<String, Object> grant(HealthProfile profile, boolean consent) {
        return Map.of("healthProfileId", profile.getId(), "medicalRecordIds", List.of(), "durationHours", 1,
                "providerName", "Synthetic Provider", "authorizeConsultation", consent);
    }
    private void createGrant(HealthProfile profile) throws Exception {
        mvc.perform(post("/api/sharing-sessions").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(grant(profile, true)))).andExpect(status().isCreated());
    }
    private org.springframework.test.web.servlet.ResultActions consult(SharingSession session, String requestId) throws Exception {
        return mvc.perform(post("/api/provider-access/consultation")
                .header("X-HealthBridge-Access-Code", session.getAccessToken()).header("Idempotency-Key", requestId)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
                        "recordDate", "2026-01-15", "providerName", "Synthetic Provider", "reason", "Synthetic first consultation"))));
    }

    @Test void automaticIdIsUniqueAndCannotReplaceAnExistingId() throws Exception {
        var profile = createProfile();
        String original = profile.getHealthId();
        assertDoesNotThrow(() -> UUID.fromString(original.substring(3)));
        mvc.perform(post("/api/health-profile").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("userId", worker.getId(), "healthId", "REPLACEMENT"))))
                .andExpect(status().isConflict());
        assertEquals(original, profiles.findByUserId(worker.getId()).orElseThrow().getHealthId());
        var other = users.save(User.builder().name("Second Synthetic").email("second-worker@example.test")
                .password("unused-synthetic-hash").active(true).role(User.Role.WORKER).build());
        mvc.perform(post("/api/health-profile").header("Authorization", token(other)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("userId", other.getId(), "healthId", original))))
                .andExpect(status().isCreated());
        assertNotEquals(original, profiles.findByUserId(other.getId()).orElseThrow().getHealthId());
    }

    @Test void standaloneLabReportSupportsValidatedOwnerOnlyUpload() throws Exception {
        var profile = createProfile();
        mvc.perform(post("/api/medical-records").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("healthProfileId", profile.getId(), "recordType", "LAB_REPORT",
                        "recordDate", "2026-01-15", "reason", "Synthetic archived lab report"))))
                .andExpect(status().isCreated());
        var record = records.findByHealthProfileIdOrderByRecordDateDesc(profile.getId()).get(0);
        assertEquals(MedicalRecord.RecordType.LAB_REPORT, record.getRecordType());
        var file = new MockMultipartFile("file", "synthetic-existing-report.pdf", "application/pdf", "%PDF-1.7 synthetic".getBytes());
        mvc.perform(multipart("/api/medical-documents/upload/" + record.getId()).file(file).header("Authorization", auth))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/medical-documents/record/" + record.getId()).header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        var other = users.save(User.builder().name("Other Synthetic").email("other-worker@example.test")
                .password("unused-synthetic-hash").active(true).role(User.Role.WORKER).build());
        mvc.perform(multipart("/api/medical-documents/upload/" + record.getId()).file(file).header("Authorization", token(other)))
                .andExpect(status().isForbidden());
        mvc.perform(multipart("/api/medical-documents/upload/" + record.getId())
                .file(new MockMultipartFile("file", "invalid.pdf", "application/pdf", "not-a-pdf".getBytes())).header("Authorization", auth))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test void legacyHealthIdIsPreserved() throws Exception {
        profiles.saveAndFlush(HealthProfile.builder().user(worker).healthId("HB-LEGACY-SYNTHETIC").build());
        mvc.perform(get("/api/health-profile/user/" + worker.getId()).header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.healthId").value("HB-LEGACY-SYNTHETIC"));
        mvc.perform(post("/api/health-profile").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("userId", worker.getId())))).andExpect(status().isConflict());
        assertEquals("HB-LEGACY-SYNTHETIC", profiles.findByUserId(worker.getId()).orElseThrow().getHealthId());
    }

    @Test void oversizedDetailsAndFutureRecordDatesDoNotCreateRecords() throws Exception {
        var profile = createProfile();
        for (var body : List.of(Map.of("healthProfileId", profile.getId(), "recordType", "LAB_REPORT",
                        "recordDate", "2099-01-01"),
                Map.of("healthProfileId", profile.getId(), "recordType", "LAB_REPORT",
                        "recordDate", "2026-01-15", "notes", "x".repeat(256)))) {
            mvc.perform(post("/api/medical-records").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        }
        assertEquals(0, records.findByHealthProfileIdOrderByRecordDateDesc(profile.getId()).size());
    }

    @Test void zeroRecordGrantNeedsAffirmativeConsentAndProfileOwnership() throws Exception {
        var profile = createProfile();
        long before = sessions.count();
        mvc.perform(post("/api/sharing-sessions").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(grant(profile, false)))).andExpect(status().isBadRequest());
        assertEquals(before, sessions.count());
        var other = users.save(User.builder().name("Other Synthetic").email("other-consent@example.test")
                .password("unused-synthetic-hash").active(true).role(User.Role.WORKER).build());
        mvc.perform(post("/api/sharing-sessions").header("Authorization", token(other)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(grant(profile, true)))).andExpect(status().isForbidden());
        assertEquals(before, sessions.count());
        createGrant(profile);
    }

    @Test void consultationOnlyGrantNeverExposesExistingOrLaterRecordsAndRetriesOnce() throws Exception {
        var profile = createProfile();
        createGrant(profile);
        var session = sessions.findByHealthProfileId(profile.getId()).get(0);
        records.saveAndFlush(MedicalRecord.builder().healthProfile(profile).recordType(MedicalRecord.RecordType.LAB_REPORT)
                .recordDate(java.time.LocalDate.now()).reason("Never shared synthetic report").build());
        String key = UUID.randomUUID().toString();
        consult(session, key).andExpect(status().isCreated());
        consult(session, key).andExpect(status().isCreated());
        assertEquals(2, records.findByHealthProfileIdOrderByRecordDateDesc(profile.getId()).size());
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", session.getAccessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.medicalRecords.length()").value(0));
        mvc.perform(get("/api/health-timeline/profile/" + profile.getId()).header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }

    @Test void consultationOnlyGrantRejectsExpiryAndRevocationBeforeAnyWrite() throws Exception {
        var profile = createProfile();
        createGrant(profile);
        var session = sessions.findByHealthProfileId(profile.getId()).get(0);
        session.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        sessions.saveAndFlush(session);
        consult(session, UUID.randomUUID().toString()).andExpect(status().isForbidden());
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", session.getAccessToken()))
                .andExpect(status().isForbidden());
        session.setExpiresAt(LocalDateTime.now().plusHours(1));
        sessions.saveAndFlush(session);
        mvc.perform(delete("/api/sharing-sessions/" + session.getId()).header("Authorization", auth)).andExpect(status().isNoContent());
        consult(session, UUID.randomUUID().toString()).andExpect(status().isForbidden());
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", session.getAccessToken()))
                .andExpect(status().isForbidden());
        assertEquals(0, records.findByHealthProfileIdOrderByRecordDateDesc(profile.getId()).size());
    }
}
