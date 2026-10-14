package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.entity.*;
import com.healthbridge.healthbridgebackend.repository.*;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.http.MediaType;

@SpringBootTest(properties = "healthbridge.public-frontend-base-url=https://demo.example.test")
@AutoConfigureMockMvc
@Transactional
class SharingQrIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired HealthProfileRepository profiles;
    @Autowired SharingSessionRepository sessions;
    @Autowired MedicalRecordRepository records;
    @Autowired SharedRecordRepository shared;
    @Autowired JwtService jwt;
    @Autowired CustomUserDetailsService details;
    private User worker;
    private HealthProfile profile;
    private SharingSession session;

    @BeforeEach
    void setUp() {
        worker = users.save(User.builder().name("Synthetic Worker").email("qr@example.test")
                .password("unused-test-hash").role(User.Role.WORKER).active(true).build());
        profile = profiles.save(HealthProfile.builder().user(worker).healthId("HB-QR-SYNTHETIC").build());
        session = sessions.save(SharingSession.builder().healthProfile(profile)
                .accessToken(UUID.randomUUID().toString()).providerName("Demo Provider")
                .expiresAt(LocalDateTime.now().plusHours(1)).revoked(false).build());
    }

    private String workerToken(User user) { return jwt.generateToken(details.loadUserByUsername(user.getEmail())); }

    @Test
    void qrDecodesToHttpsProviderLinkWithOnlyTemporaryCode() throws Exception {
        var result = mvc.perform(get("/api/sharing-sessions/" + session.getId() + "/qr")
                        .header("Authorization", "Bearer " + workerToken(worker)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andReturn();
        var image = ImageIO.read(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()));
        var decoded = new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image))));
        var uri = URI.create(decoded.getText());
        assertEquals("https", uri.getScheme());
        assertEquals("demo.example.test", uri.getHost());
        assertEquals("/provider-access", uri.getPath());
        assertNull(uri.getQuery());
        assertTrue(uri.getFragment().equals("access=" + session.getAccessToken()));
        assertFalse(decoded.getText().contains(profile.getHealthId()));
    }

    @Test void passportQrIsHttpsAndDefaultsToNoIdentityReference() throws Exception {
        for (boolean includeReference : new boolean[]{false, true}) {
            var result = mvc.perform(get("/api/health-profile/" + profile.getId() + "/qr")
                    .param("includeReference", Boolean.toString(includeReference))
                    .header("Authorization", "Bearer " + workerToken(worker)))
                    .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store")).andReturn();
            var bitmap = new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(
                    ImageIO.read(new ByteArrayInputStream(result.getResponse().getContentAsByteArray())))));
            var uri = URI.create(new MultiFormatReader().decode(bitmap).getText());
            assertEquals("https", uri.getScheme());
            assertEquals("/passport", uri.getPath());
            assertNull(uri.getQuery());
            assertEquals(includeReference ? "healthId=" + profile.getHealthId() : null, uri.getFragment());
            assertFalse(uri.toString().contains(session.getAccessToken()));
        }
    }

    @Test void passportLinksRequireOwnerAuthenticationAndNeverReturnClinicalFields() throws Exception {
        String path = "/api/health-profile/" + profile.getId() + "/passport-link";
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header("Authorization", "Bearer " + workerToken(worker)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.url").value("https://demo.example.test/passport"))
                .andExpect(jsonPath("$.name").doesNotExist()).andExpect(jsonPath("$.medicalRecords").doesNotExist());
        var other = users.save(User.builder().name("Other Synthetic").email("passport-other@example.test")
                .password("unused-synthetic-hash").role(User.Role.WORKER).active(true).build());
        mvc.perform(get(path).header("Authorization", "Bearer " + workerToken(other)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anotherWorkerCannotReadQrAndAnonymousRequestsRequireAuthentication() throws Exception {
        var other = users.save(User.builder().name("Other Synthetic").email("other-qr@example.test")
                .password("unused-test-hash").role(User.Role.WORKER).active(true).build());
        mvc.perform(get("/api/sharing-sessions/" + session.getId() + "/qr"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/sharing-sessions/" + session.getId() + "/qr")
                        .header("Authorization", "Bearer " + workerToken(other)))
                .andExpect(status().isForbidden());
    }

    @Test void passportReferenceCannotAuthorizePrivateClinicalApis() throws Exception {
        for (String path : new String[]{"/api/health-profile/" + profile.getId() + "/qr",
                "/api/health-profile/user/" + worker.getId(),
                "/api/allergies/profile/" + profile.getId(),
                "/api/existing-conditions/profile/" + profile.getId(),
                "/api/current-medications/profile/" + profile.getId(),
                "/api/medical-records/profile/" + profile.getId()}) {
            mvc.perform(get(path).param("healthId", profile.getHealthId()))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void invalidExpiredAndRevokedCodesCannotReadOrSubmit() throws Exception {
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", "invalid-synthetic"))
                .andExpect(status().isForbidden());
        session.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        sessions.saveAndFlush(session);
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", session.getAccessToken()))
                .andExpect(status().isForbidden());
        session.setExpiresAt(LocalDateTime.now().plusHours(1));
        session.setRevoked(true);
        sessions.saveAndFlush(session);
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", session.getAccessToken()))
                .andExpect(status().isForbidden());
        long before = records.count();
        submit(UUID.randomUUID().toString(), "Synthetic visit").andExpect(status().isForbidden());
        assertEquals(before, records.count());
        mvc.perform(get("/api/sharing-sessions/" + session.getId() + "/qr")
                        .header("Authorization", "Bearer " + workerToken(worker)))
                .andExpect(status().isGone());
    }

    @Test
    void onlySelectedOwnedRecordsAreVisible() throws Exception {
        var selected = records.save(MedicalRecord.builder().healthProfile(profile)
                .recordType(MedicalRecord.RecordType.CONSULTATION).recordDate(LocalDate.now()).build());
        records.save(MedicalRecord.builder().healthProfile(profile)
                .recordType(MedicalRecord.RecordType.LAB_REPORT).recordDate(LocalDate.now()).build());
        shared.save(SharedRecord.builder().sharingSession(session).medicalRecord(selected).build());
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", session.getAccessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.medicalRecords.length()").value(1))
                .andExpect(jsonPath("$.medicalRecords[0].id").value(selected.getId()));
    }

    @Test
    void consultationRetriesAreDurableAndAppearInWorkerTimeline() throws Exception {
        String key = UUID.randomUUID().toString();
        long before = records.count();
        submit(key, "Synthetic visit").andExpect(status().isCreated());
        submit(key, "Synthetic visit").andExpect(status().isCreated());
        assertEquals(before + 1, records.count());
        submit(key, "Changed details").andExpect(status().isConflict());
        mvc.perform(get("/api/health-timeline/profile/" + profile.getId())
                        .header("Authorization", "Bearer " + workerToken(worker)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/access-logs/session/" + session.getId())
                        .header("Authorization", "Bearer " + workerToken(worker)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].action").value("ADD_CONSULTATION"));
    }

    @Test
    void consultationValidationRejectsEmptyOversizedAndFutureInput() throws Exception {
        submit(UUID.randomUUID().toString(), "").andExpect(status().isBadRequest());
        submit(UUID.randomUUID().toString(), "x".repeat(256)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/provider-access/consultation")
                        .header("X-HealthBridge-Access-Code", session.getAccessToken())
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recordDate\":\"2099-01-01\",\"providerName\":\"Demo\",\"reason\":\"Synthetic\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void malformedRequestIdCannotCreateConsultation() throws Exception {
        long before = records.count();
        submit("not-a-uuid", "Synthetic visit").andExpect(status().isBadRequest());
        assertEquals(before, records.count());
    }

    @Test void deactivatedWorkerCannotLeaveUsableProviderConsent() throws Exception {
        worker.setActive(false);
        users.saveAndFlush(worker);
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", session.getAccessToken()))
                .andExpect(status().isForbidden());
        submit(UUID.randomUUID().toString(), "Synthetic visit").andExpect(status().isForbidden());
    }

    private org.springframework.test.web.servlet.ResultActions submit(String key, String reason) throws Exception {
        return mvc.perform(post("/api/provider-access/consultation")
                .header("X-HealthBridge-Access-Code", session.getAccessToken()).header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"recordDate\":\"2026-01-15\",\"providerName\":\"Demo Provider\",\"reason\":\"" + reason + "\"}"));
    }
}
