package com.healthbridge.healthbridgebackend.service;

import com.healthbridge.healthbridgebackend.dto.AdminOverviewResponse;
import com.healthbridge.healthbridgebackend.entity.User;
import com.healthbridge.healthbridgebackend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AdminOverviewService {
    private final UserRepository users;
    private final HealthProfileRepository profiles;
    private final SharingSessionRepository sessions;
    private final AccessLogRepository logs;

    public AdminOverviewService(UserRepository users, HealthProfileRepository profiles,
                                SharingSessionRepository sessions, AccessLogRepository logs) {
        this.users = users;
        this.profiles = profiles;
        this.sessions = sessions;
        this.logs = logs;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public AdminOverviewResponse overview() {
        var now = LocalDateTime.now();
        long total = users.count();
        long active = users.countByActiveTrue();
        return new AdminOverviewResponse(total, active, total - active,
                users.countByRole(User.Role.WORKER), users.countByRole(User.Role.ADMIN),
                profiles.countByUserRole(User.Role.WORKER), sessions.count(),
                sessions.countByRevokedFalseAndExpiresAtAfterAndHealthProfileUserActiveTrue(now),
                sessions.countByRevokedFalseAndExpiresAtLessThanEqual(now), sessions.countByRevokedTrue(),
                sessions.countByRevokedFalseAndExpiresAtAfterAndHealthProfileUserActiveFalse(now),
                logs.countByAction("VIEW_SHARED_RECORDS"),
                logs.countByAction("ADD_CONSULTATION") + logs.countByActionStartingWith(ProviderConsultationService.RECEIPT_PREFIX),
                logs.countByAccessedAtAfter(now.minusHours(24)));
    }
}
