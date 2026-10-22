package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.dto.*;
import com.healthbridge.healthbridgebackend.qr.*;
import com.healthbridge.healthbridgebackend.service.EmergencyPassportService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class EmergencyPassportController {
    private final EmergencyPassportService service;
    private final ProviderAccessLinkService links;
    private final QrCodeService qr;
    public EmergencyPassportController(EmergencyPassportService service, ProviderAccessLinkService links, QrCodeService qr) {
        this.service = service; this.links = links; this.qr = qr;
    }
    @GetMapping("/api/emergency-passport/profile/{id}")
    public ResponseEntity<EmergencyPassportSettings> settings(@PathVariable Long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.get(id));
    }
    @PutMapping("/api/emergency-passport/profile/{id}")
    public ResponseEntity<EmergencyPassportSettings> update(@PathVariable Long id, @Valid @RequestBody EmergencyPassportRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.update(id, request));
    }
    @PostMapping("/api/emergency-passport/profile/{id}/regenerate")
    public ResponseEntity<EmergencyPassportSettings> regenerate(@PathVariable Long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.regenerate(id));
    }
    @GetMapping("/api/emergency-passport/profile/{id}/link")
    public ResponseEntity<Map<String, String>> link(@PathVariable Long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("url", links.createEmergencyPassportLink(service.reference(id))));
    }
    @GetMapping(value = "/api/emergency-passport/profile/{id}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qr(@PathVariable Long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(qr.generateQrCode(links.createEmergencyPassportLink(service.reference(id)), 400, 400));
    }
    @GetMapping("/api/public/emergency-passport")
    public ResponseEntity<?> publicInformation(@RequestHeader(value = "X-HealthBridge-Passport-Reference", required = false) String reference) {
        return service.publicInformation(reference)
                .<ResponseEntity<?>>map(data -> ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(data))
                .orElseGet(() -> ResponseEntity.status(404).cacheControl(CacheControl.noStore()).build());
    }
}
