-- Manual, additive migration: the repository has no migration runner.
-- Apply only after backup, schema review and explicit deployment approval.
BEGIN;
CREATE TABLE emergency_passport_preferences (
    health_profile_id BIGINT PRIMARY KEY REFERENCES health_profiles(id),
    public_reference VARCHAR(43) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    blood_group BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_contact BOOLEAN NOT NULL DEFAULT FALSE,
    allergies BOOLEAN NOT NULL DEFAULT FALSE,
    conditions BOOLEAN NOT NULL DEFAULT FALSE,
    medications BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_language BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL
);
-- Existing profiles intentionally have no row and therefore no public access.
COMMIT;
