package com.healthbridge.healthbridgebackend.dto;

public record AdminOverviewResponse(long totalAccounts, long activeAccounts, long inactiveAccounts,
        long workers, long admins, long healthProfiles, long sharingSessions, long activeSessions,
        long expiredSessions, long revokedSessions, long inactiveWorkerSessions, long recordViews,
        long consultationsAdded, long auditEventsLast24Hours) {
}
