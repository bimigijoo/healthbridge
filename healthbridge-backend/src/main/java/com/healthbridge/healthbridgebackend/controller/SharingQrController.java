package com.healthbridge.healthbridgebackend.controller;

import com.healthbridge.healthbridgebackend.qr.ProviderAccessLinkService;
import com.healthbridge.healthbridgebackend.qr.QrCodeService;
import com.healthbridge.healthbridgebackend.security.CurrentUserService;
import com.healthbridge.healthbridgebackend.service.SharingSessionService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/sharing-sessions")
public class SharingQrController {
    private final SharingSessionService sessions;
    private final CurrentUserService currentUser;
    private final ProviderAccessLinkService links;
    private final QrCodeService qr;

    public SharingQrController(SharingSessionService sessions, CurrentUserService currentUser,
                               ProviderAccessLinkService links, QrCodeService qr) {
        this.sessions = sessions;
        this.currentUser = currentUser;
        this.links = links;
        this.qr = qr;
    }

    @GetMapping(value = "/{id}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> sharingQr(@PathVariable Long id) {
        var session = sessions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        currentUser.assertProfileOwner(session.getHealthProfile());
        if (!sessions.isValid(session)) {
            throw new ResponseStatusException(HttpStatus.GONE, "This sharing session has expired or been revoked.");
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(qr.generateQrCode(links.createLink(session.getAccessToken()), 320, 320));
    }
}
