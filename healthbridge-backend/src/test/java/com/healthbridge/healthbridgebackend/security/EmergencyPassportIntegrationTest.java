package com.healthbridge.healthbridgebackend.security;

import com.healthbridge.healthbridgebackend.entity.*;
import com.healthbridge.healthbridgebackend.repository.*;
import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"healthbridge.public-frontend-base-url=https://demo.example.test",
        "healthbridge.admin.bootstrap.enabled=false"})
@AutoConfigureMockMvc
@Transactional
class EmergencyPassportIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired HealthProfileRepository profiles;
    @Autowired EmergencyPassportRepository preferences;
    @Autowired AllergyRepository allergies;
    @Autowired ExistingConditionRepository conditions;
    @Autowired CurrentMedicationRepository medications;
    @Autowired JwtService jwt;
    @Autowired CustomUserDetailsService details;
    @Autowired EntityManager em;
    private HealthProfile profile;
    private String auth;
    private static final String PUBLIC = "/api/public/emergency-passport";
    private static final String HEADER = "X-HealthBridge-Passport-Reference";
    private static final List<String> FIELDS = List.of("bloodGroup", "emergencyContact", "allergies",
            "conditions", "medications", "preferredLanguage");

    @BeforeEach void setup() {
        var worker = users.save(User.builder().name("Synthetic private name").email("emergency@example.test")
                .password("unused-synthetic-hash").role(User.Role.WORKER).active(true).build());
        auth = token(worker);
        profile = profiles.save(HealthProfile.builder().user(worker).healthId("HB-SYNTHETIC-PRIVATE")
                .dateOfBirth(LocalDate.of(1990, 1, 1)).bloodGroup("O+").emergencyContact("Synthetic emergency contact")
                .preferredLanguage("English").build());
        allergies.save(Allergy.builder().healthProfile(profile).allergen("Synthetic allergy").reaction("Synthetic reaction").build());
        conditions.save(ExistingCondition.builder().healthProfile(profile).conditionName("Synthetic condition")
                .diagnosedDate(LocalDate.of(2020, 1, 1)).notes("PRIVATE CONDITION NOTE").build());
        medications.save(CurrentMedication.builder().healthProfile(profile).medicationName("Synthetic medication")
                .dosage("Synthetic dose").frequency("Daily").notes("PRIVATE MEDICATION NOTE").build());
    }
    private String token(User worker) { return "Bearer " + jwt.generateToken(details.loadUserByUsername(worker.getEmail())); }
    private String owner() { return "/api/emergency-passport/profile/" + profile.getId(); }
    private Map<String, Boolean> selections(boolean enabled, String... selected) {
        var values = new LinkedHashMap<String, Boolean>();
        values.put("enabled", enabled);
        for (String field : FIELDS) values.put(field, Arrays.asList(selected).contains(field));
        return values;
    }
    private ResultActions save(boolean enabled, String... selected) throws Exception {
        return mvc.perform(put(owner()).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(selections(enabled, selected))));
    }
    private String reference() throws Exception {
        var result = mvc.perform(get(owner() + "/link").header("Authorization", auth)).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store")).andReturn();
        var url = URI.create(json.readTree(result.getResponse().getContentAsString()).get("url").asString());
        assertEquals("https://demo.example.test", url.getScheme() + "://" + url.getHost());
        assertEquals("/passport", url.getPath());
        assertNull(url.getQuery());
        assertTrue(url.getFragment().matches("reference=[A-Za-z0-9_-]{43}"));
        return url.getFragment().substring("reference=".length());
    }
    private ResultActions read(String reference) throws Exception { return mvc.perform(get(PUBLIC).header(HEADER, reference)); }

    @Test void missingPreferencesAndFreshProfileAreDisabledWithoutBackfill() throws Exception {
        assertFalse(preferences.existsById(profile.getId()));
        mvc.perform(get(owner()).header("Authorization", auth)).andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false)).andExpect(jsonPath("$.allergies").value(false))
                .andExpect(jsonPath("$.bloodGroup").value(false));
        String reference = reference();
        read(reference).andExpect(status().isNotFound()).andExpect(header().string("Cache-Control", "no-store"));
        em.flush(); em.clear();
        assertFalse(preferences.findById(profile.getId()).orElseThrow().isEnabled());
        assertEquals(reference, reference());
    }
    @Test void eachFieldIsIndependentAndPublicPayloadExcludesPrivateMetadata() throws Exception {
        var other = users.save(User.builder().name("Unrelated synthetic").email("unrelated@example.test")
                .password("unused-synthetic-hash").role(User.Role.WORKER).active(true).build());
        var otherProfile = profiles.save(HealthProfile.builder().user(other).healthId("HB-OTHER-SYNTHETIC").build());
        allergies.save(Allergy.builder().healthProfile(otherProfile).allergen("UNRELATED ALLERGY").build());
        String reference = reference();
        for (String field : FIELDS) {
            save(true, field).andExpect(status().isOk());
            var result = read(reference).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store")).andReturn();
            Map<?, ?> payload = json.readValue(result.getResponse().getContentAsString(), Map.class);
            assertEquals(Set.of(field), payload.keySet());
        }
        save(true, FIELDS.toArray(String[]::new)).andExpect(status().isOk());
        var result = read(reference).andExpect(status().isOk())
                .andExpect(jsonPath("$.allergies[0].allergen").value("Synthetic allergy"))
                .andExpect(jsonPath("$.conditions[0]").value("Synthetic condition"))
                .andExpect(jsonPath("$.medications[0].frequency").value("Daily")).andReturn();
        String body = result.getResponse().getContentAsString();
        for (String forbidden : List.of("\"id\"", "healthId", "dateOfBirth", "name", "PRIVATE", "diagnosedDate",
                "createdAt", "notes", "medicalRecords", "consultations", "publicReference", "userId", "UNRELATED")) assertFalse(body.contains(forbidden), forbidden);
        Map<?, ?> payload = json.readValue(body, Map.class);
        assertEquals(Set.of("allergen", "reaction"), ((Map<?, ?>) ((List<?>) payload.get("allergies")).get(0)).keySet());
        assertEquals(Set.of("medicationName", "dosage", "frequency"), ((Map<?, ?>) ((List<?>) payload.get("medications")).get(0)).keySet());
    }
    @Test void persistedPreferencesAndLiveInformationChangesSurviveFreshRequests() throws Exception {
        String reference = reference();
        save(true, "allergies", "preferredLanguage").andExpect(status().isOk());
        em.flush(); em.clear();
        mvc.perform(get(owner()).header("Authorization", auth)).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(true));
        var allergy = allergies.findByHealthProfileId(profile.getId()).get(0);
        allergy.setReaction("Updated synthetic reaction");
        allergies.saveAndFlush(allergy);
        em.clear();
        read(reference).andExpect(status().isOk()).andExpect(jsonPath("$.allergies[0].reaction").value("Updated synthetic reaction"));
        save(true, "bloodGroup").andExpect(status().isOk());
        read(reference).andExpect(status().isOk()).andExpect(jsonPath("$.allergies").doesNotExist()).andExpect(jsonPath("$.bloodGroup").value("O+"));
    }
    @Test void revokeRotationAndInactiveAccountStopDisclosure() throws Exception {
        String reference = reference();
        save(true, "bloodGroup").andExpect(status().isOk());
        save(false, "bloodGroup").andExpect(status().isOk());
        read(reference).andExpect(status().isNotFound());
        save(true, "bloodGroup").andExpect(status().isOk());
        mvc.perform(post(owner() + "/regenerate").header("Authorization", auth)).andExpect(status().isOk());
        String replacement = reference();
        assertNotEquals(reference, replacement);
        read(reference).andExpect(status().isNotFound());
        read(replacement).andExpect(status().isOk());
        var worker = users.findById(profile.getUser().getId()).orElseThrow();
        worker.setActive(false); users.saveAndFlush(worker);
        read(replacement).andExpect(status().isNotFound());
    }
    @Test void unknownMalformedAndHealthIdReferencesNeverDisclose() throws Exception {
        save(true, "bloodGroup").andExpect(status().isOk());
        for (String reference : List.of("invalid", profile.getHealthId(), "a".repeat(43), "a".repeat(44)))
            read(reference).andExpect(status().isNotFound()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get(PUBLIC)).andExpect(status().isNotFound());
    }
    @Test void settingsRequireWorkerOwnershipAndCannotBeWrittenAnonymously() throws Exception {
        mvc.perform(get(owner())).andExpect(status().isUnauthorized());
        mvc.perform(put(owner()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(selections(true, "bloodGroup"))))
                .andExpect(status().isUnauthorized());
        for (User.Role role : User.Role.values()) {
            var other = users.save(User.builder().name("Other synthetic").email(role.name() + "@emergency.example.test")
                    .password("unused-synthetic-hash").role(role).active(true).build());
            String credential = token(other);
            for (String suffix : List.of("", "/link", "/qr"))
                mvc.perform(get(owner() + suffix).header("Authorization", credential)).andExpect(status().isForbidden());
            mvc.perform(put(owner()).header("Authorization", credential).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(selections(true, "bloodGroup")))).andExpect(status().isForbidden());
            mvc.perform(post(owner() + "/regenerate").header("Authorization", credential)).andExpect(status().isForbidden());
        }
        for (var method : List.of(post(PUBLIC), put(PUBLIC), delete(PUBLIC)))
            mvc.perform(method.header(HEADER, reference())).andExpect(status().isUnauthorized());
        save(true).andExpect(status().isBadRequest());
        mvc.perform(put(owner()).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }
    @Test void permanentQrCannotEscalateIntoPrivateRecordsOrConsultations() throws Exception {
        String reference = reference();
        save(true, "bloodGroup").andExpect(status().isOk());
        mvc.perform(get("/api/provider-access").header("X-HealthBridge-Access-Code", reference)).andExpect(status().isForbidden());
        mvc.perform(post("/api/provider-access/consultation").header("X-HealthBridge-Access-Code", reference)
                .header("Idempotency-Key", UUID.randomUUID().toString()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"recordDate\":\"2026-01-15\",\"providerName\":\"Synthetic\",\"reason\":\"Denied\"}"))
                .andExpect(status().isForbidden());
        for (String path : List.of("/api/medical-records/profile/", "/api/allergies/profile/", "/api/current-medications/profile/"))
            mvc.perform(get(path + profile.getId()).header(HEADER, reference)).andExpect(status().isUnauthorized());
    }
    @Test void qrDecodesToOnlyRandomFragmentAndCorsSupportsPublicHeader() throws Exception {
        String reference = reference();
        var result = mvc.perform(get(owner() + "/qr").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store")).andReturn();
        var image = ImageIO.read(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()));
        String decoded = new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)))).getText();
        assertEquals("https://demo.example.test/passport#reference=" + reference, decoded);
        assertFalse(decoded.contains(profile.getHealthId()));
        mvc.perform(options(PUBLIC).header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", HEADER)).andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
    @Test void clinicalEditingIsOwnedValidatedAndImmediatelyReflectedInPublicData() throws Exception {
        save(true, "allergies", "conditions", "medications").andExpect(status().isOk());
        var other = users.save(User.builder().name("Other synthetic").email("clinical-other@example.test")
                .password("unused-synthetic-hash").role(User.Role.WORKER).active(true).build());
        var targets = List.of(
                Map.of("path", "/api/allergies/" + allergies.findByHealthProfileId(profile.getId()).get(0).getId(), "field", "allergen"),
                Map.of("path", "/api/existing-conditions/" + conditions.findByHealthProfileId(profile.getId()).get(0).getId(), "field", "conditionName"),
                Map.of("path", "/api/current-medications/" + medications.findByHealthProfileId(profile.getId()).get(0).getId(), "field", "medicationName"));
        for (var target : targets) {
            String body = json.writeValueAsString(Map.of("healthProfileId", profile.getId(), target.get("field"), "Edited synthetic"));
            mvc.perform(put(target.get("path")).header("Authorization", token(other)).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isForbidden());
            mvc.perform(put(target.get("path")).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("healthProfileId", profile.getId() + 100, target.get("field"), "Rejected"))))
                    .andExpect(status().isForbidden());
            mvc.perform(put(target.get("path")).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk()).andExpect(jsonPath("$." + target.get("field")).value("Edited synthetic"));
            mvc.perform(put(target.get("path")).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("healthProfileId", profile.getId(), target.get("field"), "x".repeat(256)))))
                    .andExpect(status().isBadRequest());
        }
        read(reference()).andExpect(status().isOk()).andExpect(jsonPath("$.allergies[0].allergen").value("Edited synthetic"))
                .andExpect(jsonPath("$.conditions[0]").value("Edited synthetic"))
                .andExpect(jsonPath("$.medications[0].medicationName").value("Edited synthetic"));
        mvc.perform(put(targets.get(1).get("path")).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("healthProfileId", profile.getId(), "conditionName", "Synthetic",
                        "diagnosedDate", "2099-01-01")))).andExpect(status().isBadRequest());
    }
}
