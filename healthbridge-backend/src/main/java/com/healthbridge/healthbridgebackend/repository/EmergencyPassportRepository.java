package com.healthbridge.healthbridgebackend.repository;

import com.healthbridge.healthbridgebackend.entity.EmergencyPassportPreferences;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface EmergencyPassportRepository extends JpaRepository<EmergencyPassportPreferences, Long> {
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select p from EmergencyPassportPreferences p where p.publicReference = :reference")
    Optional<EmergencyPassportPreferences> findPublicForRead(@Param("reference") String reference);
}
