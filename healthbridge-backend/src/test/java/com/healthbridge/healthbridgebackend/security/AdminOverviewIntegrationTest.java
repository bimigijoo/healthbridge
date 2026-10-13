package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.entity.*;
import com.healthbridge.healthbridgebackend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminOverviewIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired HealthProfileRepository profiles;
    @Autowired SharingSessionRepository sessions;
    @Autowired AccessLogRepository logs;
    @Autowired JwtService jwt;
    @Autowired CustomUserDetailsService details;
    private User worker;
    private String adminToken;

    private User user(String email, User.Role role, boolean active) {
        return users.save(User.builder().name("Synthetic Account").email(email).password("unused-synthetic-hash")
                .role(role).active(active).build());
    }
    private String token(User user) { return "Bearer " + jwt.generateToken(details.loadUserByUsername(user.getEmail())); }
    private SharingSession session(HealthProfile profile, LocalDateTime expiry, boolean revoked) {
        var session = sessions.save(SharingSession.builder().healthProfile(profile).accessToken(UUID.randomUUID().toString())
                .expiresAt(expiry).revoked(false).build());
        session.setRevoked(revoked);
        return sessions.saveAndFlush(session);
    }

    @BeforeEach void setUp() {
        var admin = user("overview-admin@example.test", User.Role.ADMIN, true);
        worker = user("overview-worker@example.test", User.Role.WORKER, true);
        var inactive = user("overview-inactive@example.test", User.Role.WORKER, false);
        var profile = profiles.save(HealthProfile.builder().user(worker).healthId("HB-OVERVIEW-SYNTHETIC").build());
        var inactiveProfile = profiles.save(HealthProfile.builder().user(inactive).healthId("HB-INACTIVE-SYNTHETIC").build());
        var now = LocalDateTime.now();
        var active = session(profile, now.plusHours(1), false);
        session(profile, now.minusHours(1), false);
        session(profile, now.plusHours(1), true);
        session(inactiveProfile, now.plusHours(1), false);
        logs.save(AccessLog.builder().sharingSession(active).providerName("Synthetic Provider").action("VIEW_SHARED_RECORDS").build());
        var old = logs.save(AccessLog.builder().sharingSession(active).action("VIEW_SHARED_RECORDS").build());
        old.setAccessedAt(now.minusDays(2));
        logs.saveAndFlush(old);
        logs.save(AccessLog.builder().sharingSession(active).action("ADD_CONSULTATION:" + UUID.randomUUID() + ":999").build());
        logs.saveAndFlush(AccessLog.builder().sharingSession(active).action("ADD_CONSULTATION").build());
        adminToken = token(admin);
    }

    @Test void onlyAdminsCanReadRealAggregateCountsWithoutClinicalOrCredentialFields() throws Exception {
        mvc.perform(get("/api/admin/overview")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/overview").header("Authorization", token(worker))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/overview").header("Authorization", adminToken))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.totalAccounts").value(3)).andExpect(jsonPath("$.activeAccounts").value(2))
                .andExpect(jsonPath("$.inactiveAccounts").value(1)).andExpect(jsonPath("$.workers").value(2))
                .andExpect(jsonPath("$.admins").value(1)).andExpect(jsonPath("$.healthProfiles").value(2))
                .andExpect(jsonPath("$.sharingSessions").value(4)).andExpect(jsonPath("$.activeSessions").value(1))
                .andExpect(jsonPath("$.expiredSessions").value(1)).andExpect(jsonPath("$.revokedSessions").value(1))
                .andExpect(jsonPath("$.inactiveWorkerSessions").value(1)).andExpect(jsonPath("$.recordViews").value(2))
                .andExpect(jsonPath("$.consultationsAdded").value(2)).andExpect(jsonPath("$.auditEventsLast24Hours").value(3))
                .andExpect(jsonPath("$.users").doesNotExist()).andExpect(jsonPath("$.healthId").doesNotExist())
                .andExpect(jsonPath("$.medicalRecords").doesNotExist()).andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.providerName").doesNotExist());
    }

    @Test void accountDeactivationUpdatesCountsAndExcludesItsSessionsFromActiveAccess() throws Exception {
        mvc.perform(patch("/api/admin/users/" + worker.getId() + "/status").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/overview").header("Authorization", adminToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.activeAccounts").value(1))
                .andExpect(jsonPath("$.inactiveAccounts").value(2)).andExpect(jsonPath("$.activeSessions").value(0))
                .andExpect(jsonPath("$.inactiveWorkerSessions").value(2));
    }
}
