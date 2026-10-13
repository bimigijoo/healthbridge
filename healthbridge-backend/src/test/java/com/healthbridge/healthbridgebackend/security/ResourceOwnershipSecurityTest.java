package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.controller.FollowUpController;
import com.healthbridge.healthbridgebackend.controller.HealthProfileController;
import com.healthbridge.healthbridgebackend.controller.MedicalRecordController;
import com.healthbridge.healthbridgebackend.controller.MedicalDocumentController;
import com.healthbridge.healthbridgebackend.controller.SharingSessionController;
import com.healthbridge.healthbridgebackend.entity.HealthProfile;
import com.healthbridge.healthbridgebackend.entity.MedicalRecord;
import com.healthbridge.healthbridgebackend.entity.MedicalDocument;
import com.healthbridge.healthbridgebackend.entity.FollowUp;
import com.healthbridge.healthbridgebackend.entity.SharingSession;
import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.qr.QrCodeService;
import com.healthbridge.healthbridgebackend.service.HealthProfileService;
import com.healthbridge.healthbridgebackend.service.MedicalRecordService;
import com.healthbridge.healthbridgebackend.service.MedicalDocumentService;
import com.healthbridge.healthbridgebackend.service.SharedRecordService;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import com.healthbridge.healthbridgebackend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        HealthProfileController.class,
        MedicalRecordController.class,
        SharingSessionController.class,
        MedicalDocumentController.class,
        FollowUpController.class
})
@Import({CurrentUserService.class, SharingSessionController.class})
@WithMockUser(username = "worker@example.com", roles = "WORKER")
class ResourceOwnershipSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    @MockitoBean
    private HealthProfileService healthProfileService;

    @MockitoBean
    private MedicalRecordService medicalRecordService;

    @MockitoBean
    private MedicalDocumentService medicalDocumentService;

    @MockitoBean
    private SharingSessionService sharingSessionService;

    @MockitoBean
    private SharedRecordService sharedRecordService;

    @MockitoBean
    private QrCodeService qrCodeService;

    @MockitoBean
    private com.healthbridge.healthbridgebackend.service.FollowUpService followUpService;

    private User worker;
    private User otherWorker;
    private HealthProfile ownProfile;
    private HealthProfile otherProfile;

    @BeforeEach
    void setUp() {
        worker = User.builder()
                .id(1L)
                .name("Worker One")
                .email("worker@example.com")
                .password("encoded")
                .role(User.Role.WORKER)
                .active(true)
                .build();

        otherWorker = User.builder()
                .id(2L)
                .name("Worker Two")
                .email("other@example.com")
                .password("encoded")
                .role(User.Role.WORKER)
                .active(true)
                .build();

        ownProfile = HealthProfile.builder()
                .id(10L)
                .user(worker)
                .healthId("HB-OWN")
                .build();

        otherProfile = HealthProfile.builder()
                .id(20L)
                .user(otherWorker)
                .healthId("HB-OTHER")
                .build();

        when(userService.findByEmail("worker@example.com"))
                .thenReturn(Optional.of(worker));
        when(healthProfileService.findByUserId(1L))
                .thenReturn(Optional.of(ownProfile));
        when(healthProfileService.findByUserId(2L))
                .thenReturn(Optional.of(otherProfile));
        when(healthProfileService.findById(10L))
                .thenReturn(Optional.of(ownProfile));
        when(healthProfileService.findById(20L))
                .thenReturn(Optional.of(otherProfile));
    }

    @Test
    void workerCannotReadAnotherWorkersProfileByUserId() throws Exception {
        mockMvc.perform(get("/api/health-profile/user/2"))
                .andExpect(status().isForbidden());
    }

    @Test
    void workerCanReadOwnProfileByUserId() throws Exception {
        mockMvc.perform(get("/api/health-profile/user/1"))
                .andExpect(status().isOk());
    }

    @Test
    void workerCannotListAnotherWorkersMedicalRecords() throws Exception {
        mockMvc.perform(get("/api/medical-records/profile/20"))
                .andExpect(status().isForbidden());

        verify(medicalRecordService, never())
                .findByHealthProfileIdOrderByRecordDateDesc(20L);
    }

    @Test
    void workerCannotReadAnotherWorkersMedicalRecordById() throws Exception {
        MedicalRecord otherRecord = MedicalRecord.builder()
                .id(99L)
                .healthProfile(otherProfile)
                .recordType(MedicalRecord.RecordType.CONSULTATION)
                .recordDate(LocalDate.now())
                .build();

        when(medicalRecordService.findById(99L))
                .thenReturn(Optional.of(otherRecord));

        mockMvc.perform(get("/api/medical-records/99"))
                .andExpect(status().isForbidden());
    }

    @Test
    void workerCannotCreateRecordOnAnotherWorkersProfile() throws Exception {
        mockMvc.perform(post("/api/medical-records")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "healthProfileId": 20,
                                  "recordType": "CONSULTATION",
                                  "recordDate": "2026-01-15",
                                  "reason": "Checkup"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(medicalRecordService, never()).saveRecord(any());
    }

    @Test
    void workerCannotRevokeAnotherWorkersSharingSession() throws Exception {
        SharingSession session = SharingSession.builder()
                .id(5L)
                .healthProfile(otherProfile)
                .accessToken("token")
                .revoked(false)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(sharingSessionService.findByIdForUpdate(5L))
                .thenReturn(Optional.of(session));

        mockMvc.perform(delete("/api/sharing-sessions/5").with(csrf()))
                .andExpect(status().isForbidden());

        verify(sharingSessionService, never()).saveSession(any());
    }

    @Test
    void workerCannotShareRecordsThatBelongToAnotherProfile() throws Exception {
        MedicalRecord otherRecord = MedicalRecord.builder()
                .id(77L)
                .healthProfile(otherProfile)
                .recordType(MedicalRecord.RecordType.LAB_REPORT)
                .recordDate(LocalDate.now())
                .build();

        when(medicalRecordService.findById(77L))
                .thenReturn(Optional.of(otherRecord));

        mockMvc.perform(post("/api/sharing-sessions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "healthProfileId": 10,
                                  "durationHours": 24,
                                  "providerName": "Dr. Test",
                                  "providerFacility": "Clinic",
                                  "authorizeConsultation": true,
                                  "medicalRecordIds": [77]
                                }
                                """))
                .andExpect(status().isBadRequest());

        verify(sharingSessionService, never()).saveSession(any());
    }

    @Test
    void workerCanListOwnMedicalRecords() throws Exception {
        when(medicalRecordService
                .findByHealthProfileIdOrderByRecordDateDesc(10L))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/medical-records/profile/10"))
                .andExpect(status().isOk());
    }

    @Test
    void workerCannotDownloadOrDeleteAnotherWorkersDocument() throws Exception {
        MedicalRecord record = MedicalRecord.builder()
                .id(99L).healthProfile(otherProfile).build();
        MedicalDocument document = MedicalDocument.builder()
                .id(44L).medicalRecord(record).build();
        when(medicalDocumentService.findById(44L)).thenReturn(Optional.of(document));

        mockMvc.perform(get("/api/medical-documents/44/download"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/medical-documents/44").with(csrf()))
                .andExpect(status().isForbidden());
        verify(medicalDocumentService, never()).deleteDocument(any());
    }

    @Test
    void workerCannotCompleteAnotherWorkersFollowUp() throws Exception {
        FollowUp followUp = FollowUp.builder()
                .id(55L).healthProfile(otherProfile).build();
        when(followUpService.findById(55L)).thenReturn(Optional.of(followUp));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/follow-ups/55/complete").with(csrf()))
                .andExpect(status().isForbidden());
        verify(followUpService, never()).saveFollowUp(any());
    }
}
