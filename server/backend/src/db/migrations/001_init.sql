-- Initial migration placeholder
-- =====================================================
-- ROXSTAR — Voice Draft, Room & Spin Wheel System
-- PostgreSQL Schema — Day 1
-- =====================================================

-- Clean slate (safe to re-run during development)
DROP TABLE IF EXISTS spin_events CASCADE;
DROP TABLE IF EXISTS spin_participants CASCADE;
DROP TABLE IF EXISTS spins CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS room_status_enum;
DROP TYPE IF EXISTS spin_status_enum;
DROP TYPE IF EXISTS participant_status_enum;

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE room_status_enum AS ENUM ('open', 'in_spin', 'closed');
CREATE TYPE spin_status_enum AS ENUM ('waiting', 'running', 'completed', 'aborted');
CREATE TYPE participant_status_enum AS ENUM ('active', 'eliminated', 'winner');

-- =====================================================
-- 1. USERS
-- =====================================================

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(50) NOT NULL,
    device_id   VARCHAR(255),          -- helps reconnect logic match "same user, new socket"
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_device_id ON users(device_id);

-- =====================================================
-- 2. ROOMS
-- =====================================================

CREATE TABLE rooms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code   VARCHAR(10) NOT NULL UNIQUE,   -- what clients type to join, e.g. ABC123
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      room_status_enum NOT NULL DEFAULT 'open',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_room_code ON rooms(room_code);

-- =====================================================
-- 3. ROOM_MEMBERS  (join table + live connection state)
-- =====================================================

CREATE TABLE room_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    socket_id       VARCHAR(255),              -- current live connection; null if disconnected
    is_connected    BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at         TIMESTAMPTZ,
    UNIQUE (room_id, user_id)                  -- a user can only be a member of a room once
);

CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);

-- =====================================================
-- 4. DRAFTS
-- =====================================================

CREATE TABLE drafts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id       UUID REFERENCES rooms(id) ON DELETE SET NULL,   -- null until shared
    file_url      VARCHAR(500) NOT NULL,       -- path/S3 key to the audio file
    duration_ms   INTEGER NOT NULL CHECK (duration_ms > 0),
    effect_used   VARCHAR(20) NOT NULL CHECK (effect_used IN ('echo', 'reverb', 'pitch_shift')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drafts_user_id ON drafts(user_id);
CREATE INDEX idx_drafts_room_id ON drafts(room_id);

-- =====================================================
-- 5. SPINS
-- =====================================================

CREATE TABLE spins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    status          spin_status_enum NOT NULL DEFAULT 'waiting',
    started_by      UUID NOT NULL REFERENCES users(id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    winner_id       UUID REFERENCES users(id)
);

CREATE INDEX idx_spins_room_id ON spins(room_id);

-- Enforces "only one active spin per room" — this single constraint
-- handles the duplicate-start-request edge case at the DB level.
CREATE UNIQUE INDEX one_active_spin_per_room
    ON spins (room_id)
    WHERE status = 'running';

-- =====================================================
-- 6. SPIN_PARTICIPANTS
-- =====================================================

CREATE TABLE spin_participants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spin_id             UUID NOT NULL REFERENCES spins(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              participant_status_enum NOT NULL DEFAULT 'active',
    eliminated_at       TIMESTAMPTZ,
    elimination_order   INTEGER,               -- 1st out, 2nd out... useful for demo + audit
    UNIQUE (spin_id, user_id)
);

CREATE INDEX idx_spin_participants_spin_id ON spin_participants(spin_id);

-- =====================================================
-- 7. SPIN_EVENTS  (audit trail — replayable for reconnect)
-- =====================================================

CREATE TABLE spin_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spin_id       UUID NOT NULL REFERENCES spins(id) ON DELETE CASCADE,
    event_type    VARCHAR(30) NOT NULL CHECK (
        event_type IN ('spin_started', 'user_eliminated', 'winner_announced', 'spin_aborted')
    ),
    payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spin_events_spin_id ON spin_events(spin_id);
CREATE INDEX idx_spin_events_created_at ON spin_events(spin_id, created_at);

-- =====================================================
-- SANITY CHECK — run after creating tables
-- =====================================================

-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';