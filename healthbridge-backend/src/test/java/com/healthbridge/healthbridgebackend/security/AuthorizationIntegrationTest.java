package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.entity.*;
import com.healthbridge.healthbridgebackend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthorizationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired HealthProfileRepository profiles;
    @Autowired MedicalRecordRepository records;
    @Autowired SharingSessionRepository sessions;
    @Autowired SharedRecordRepository sharedRecords;
    @Autowired JwtService jwt;
    @Autowired CustomUserDetailsService userDetails;
    @Autowired PasswordEncoder passwords;
    private User worker;
    private HealthProfile ownProfile;
    private HealthProfile otherProfile;

    @BeforeEach
    void setUp() {
        worker = saveUser("worker@example.test", User.Role.WORKER);
        var other = saveUser("other@example.test", User.Role.WORKER);
        ownProfile = profiles.save(HealthProfile.builder().user(worker).healthId("HB-DEMO-OWN").build());
        otherProfile = profiles.save(HealthProfile.builder().user(other).healthId("HB-DEMO-OTHER").build());
    }

    private User saveUser(String email, User.Role role) {
        return users.save(User.builder().email(email).name("Synthetic Demo")
                .password(passwords.encode("synthetic-test-password"))
                .active(true).role(role).build());
    }

    private String token(User user) {
        return jwt.generateToken(userDetails.loadUserByUsername(user.getEmail()));
    }

    @Test
    void actualSecurityChainRequiresAuthenticationAndResourceOwnership() throws Exception {
        mvc.perform(get("/api/health-profile/user/" + worker.getId()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/health-profile/user/" + worker.getId())
                        .header("Authorization", "Bearer " + token(worker)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/medical-records/profile/" + otherProfile.getId())
                        .header("Authorization", "Bearer " + token(worker)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpointsRejectWorkerTokens() throws Exception {
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token(worker)))
                .andExpect(status().isForbidden());
        var admin = saveUser("admin@example.test", User.Role.ADMIN);
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token(admin)))
                .andExpect(status().isOk());
    }

    @Test
    void deactivationInvalidatesAnAlreadyIssuedToken() throws Exception {
        String token = token(worker);
        worker.setActive(false);
        users.saveAndFlush(worker);
        mvc.perform(get("/api/health-profile/user/" + worker.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void providerCanOnlyReadSelectedRecordsUntilConsentIsRevoked() throws Exception {
        var selected = records.save(MedicalRecord.builder().healthProfile(ownProfile)
                .recordType(MedicalRecord.RecordType.CONSULTATION).recordDate(LocalDate.now()).build());
        records.save(MedicalRecord.builder().healthProfile(ownProfile)
                .recordType(MedicalRecord.RecordType.LAB_REPORT).recordDate(LocalDate.now()).build());
        var session = sessions.save(SharingSession.builder().healthProfile(ownProfile)
                .accessToken("synthetic-consent").providerName("Demo Provider")
                .expiresAt(LocalDateTime.now().plusHours(1)).revoked(false).build());
        sharedRecords.save(SharedRecord.builder().sharingSession(session).medicalRecord(selected).build());
        mvc.perform(get("/api/provider-access/synthetic-consent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.medicalRecords.length()").value(1))
                .andExpect(jsonPath("$.medicalRecords[0].id").value(selected.getId()));
        session.setRevoked(true);
        sessions.saveAndFlush(session);
        mvc.perform(get("/api/provider-access/synthetic-consent"))
                .andExpect(status().isForbidden());
    }

    @Test
    void expiredConsentIsDeniedByPublicProviderEndpoint() throws Exception {
        sessions.saveAndFlush(SharingSession.builder().healthProfile(ownProfile)
                .accessToken("synthetic-expired").expiresAt(LocalDateTime.now().minusMinutes(1))
                .revoked(false).build());
        mvc.perform(get("/api/provider-access/synthetic-expired"))
                .andExpect(status().isForbidden());
    }

    @Test
    void loopbackFrontendOriginIsAllowedByCors() throws Exception {
        mvc.perform(options("/api/health-profile/user/" + worker.getId())
                        .header("Origin", "http://127.0.0.1:5174")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5174"));
    }
}
