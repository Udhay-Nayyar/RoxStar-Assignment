# ROXSTAR — Voice Draft, Real-Time Room & Spin Wheel System

A technical assessment project: record a voice clip, apply an audio effect, share it in a real-time room, then run a server-authoritative spin wheel that eliminates participants until one winner remains.

**Live backend:** http://ec2-13-60-86-213.eu-north-1.compute.amazonaws.com:3000
**Health check:** http://ec2-13-60-86-213.eu-north-1.compute.amazonaws.com:3000/health

---

## Table of Contents
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Backend — Setup & Run](#backend--setup--run)
- [Frontend — Setup & Run](#frontend--setup--run)
- [API Reference](#api-reference)
- [Socket.IO Events](#socketio-events)
- [Database Schema](#database-schema)
- [Spin Wheel Logic & Edge Cases](#spin-wheel-logic--edge-cases)
- [Testing](#testing)
- [Docker](#docker)
- [Cloud Deployment (AWS)](#cloud-deployment-aws)
- [CI/CD](#cicd)
- [Known Limitations & Trade-offs](#known-limitations--trade-offs)

---

## Architecture

```
┌─────────────────┐        REST (Retrofit/Axios)        ┌──────────────────┐
│                  │ ───────────────────────────────────▶│                  │
│  Android App     │                                      │  Node.js Backend │
│  (Expo / RN +    │        Socket.IO (real-time)         │  Express +       │
│  native Oboe     │ ◀───────────────────────────────────▶│  Socket.IO       │
│  C++ module)     │                                      │                  │
└─────────────────┘                                       └─────────┬────────┘
                                                                      │
                                                                      ▼
                                                            ┌──────────────────┐
                                                            │   PostgreSQL      │
                                                            │  (7-table schema) │
                                                            └──────────────────┘

Backend is containerized (Docker) and deployed on AWS EC2.
GitHub Actions handles push → test → build → deploy automatically.
```

**Design principle:** the backend is the single source of truth for room membership and spin state. The client never predicts eliminations or timing — it only renders events the server broadcasts. This is what "server-authoritative" means throughout this project.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo / React Native, TypeScript, Zustand (state), Axios (REST), socket.io-client |
| Native audio | Custom Expo native module — Kotlin + C++ via NDK/CMake, using Google's **Oboe** library |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL (7-table schema, enum-typed state machines, partial unique indexes) |
| Containerization | Docker, Docker Compose |
| Cloud | AWS EC2 (Ubuntu, `eu-north-1`) |
| CI/CD | GitHub Actions (test → build → deploy over SSH) |
| Testing | Jest + Supertest (unit + integration) |

---

## Project Structure

```
RoxStar-Assignment/
├── server/                      # Backend root
│   ├── src/
│   │   ├── config/               # DB pool, Socket.IO init
│   │   ├── models/                # DB query layer (one file per entity)
│   │   ├── routes/ + controllers/ # REST endpoints
│   │   ├── services/              # Business logic — spinEngine.js lives here
│   │   ├── sockets/                # Socket.IO event handlers
│   │   └── db/migrations/          # SQL schema
│   ├── tests/
│   │   ├── unit/                   # spinEngine logic, no DB/timers needed
│   │   └── integration/            # Supertest against a real test DB
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── server.js
│
├── .github/workflows/deploy.yml  # CI/CD pipeline
│
└── ROXSTAR FRONTEND/              # Expo/React Native app
    ├── app/                        # expo-router screens
    ├── modules/oboe-audio/         # Custom native module (Kotlin + C++/Oboe)
    │   └── android/src/main/cpp/
    │       ├── AudioEngine.cpp      # Coordinator
    │       ├── OboeRecorder.cpp     # Real Oboe stream setup (record)
    │       ├── EchoEffect.cpp       # Echo DSP
    │       └── jni-bridge.cpp       # Kotlin ↔ C++ bridge
    ├── services/                   # API client, socket manager
    └── stores/                     # Zustand state
```

---

## Backend — Setup & Run

```bash
cd server
cp .env.example .env       # fill in DB credentials
npm install
npm run dev                # nodemon, http://localhost:3000
```

**Required `.env` values:**
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=roxstar
DB_USER=postgres
DB_PASSWORD=<your password>
```

**Run the schema migration** (creates all 7 tables):
```bash
psql -U postgres -d roxstar -f src/db/migrations/001_init.sql
```

**Verify:**
```bash
curl http://localhost:3000/health
```

---

## Frontend — Setup & Run

This is an **Expo dev-client** app (not Expo Go — it contains custom native C++ code, which Expo Go cannot run).

```bash
cd "ROXSTAR FRONTEND"
cp .env.example .env       # set EXPO_PUBLIC_API_URL to the backend URL
npm install
npx expo run:android       # builds native code + installs on a connected device
```

**Requirements:** Android Studio, NDK `27.1.12297006`, CMake — installed via Android Studio's SDK Manager (SDK Tools tab → check "Show Package Details" to select exact versions).

**Switching between local and live backend:** `EXPO_PUBLIC_API_URL` in `.env` controls this — point it at `http://10.0.2.2:3000` for an emulator talking to a local backend, or the live AWS URL for the deployed one.

---

## API Reference

Base URL: `http://ec2-13-60-86-213.eu-north-1.compute.amazonaws.com:3000`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/rooms` | Create a room (upserts user, generates room code) |
| POST | `/rooms/:roomCode/join` | Join an existing room |
| POST | `/rooms/:roomId/leave` | Leave a room |
| GET | `/rooms/:roomId` | Get current room state + members |
| POST | `/rooms/:roomId/drafts/share` | Attach a draft to a room |
| POST | `/rooms/:roomId/spin/start` | Start a spin (owner only, 3–20 eligible members) |
| GET | `/rooms/:roomId/spin` | Get most recent spin state/result |
| GET | `/health` | Health + DB connectivity check |

Full request/response shapes are documented inline in `src/routes/` and covered by the integration tests in `tests/integration/`.

---

## Socket.IO Events

| Event | Direction | Purpose |
|---|---|---|
| `join_room` | Client → Server | Join a room's real-time channel |
| `leave_room` | Client → Server | Leave the channel |
| `share_draft` | Client → Server | Share a draft with the room |
| `start_spin` | Client → Server | Request the owner-only spin start |
| `request_room_state` | Client → Server | Ask for current state (used on reconnect) |
| `user_joined` | Server → Room | Broadcast on join |
| `user_left` | Server → Room | Broadcast on leave/disconnect |
| `draft_shared` | Server → Room | Broadcast when a draft is shared |
| `spin_started` | Server → Room | Spin begins, eligible participant list |
| `user_eliminated` | Server → Room | One elimination, every 5 seconds |
| `winner_announced` | Server → Room | Final winner, spin complete |
| `room_state` | Server → Client | Full state snapshot (join/reconnect) |

---

## Database Schema

7 tables: `users`, `rooms`, `room_members`, `drafts`, `spins`, `spin_participants`, `spin_events`.

Two design choices worth noting:
- **`spins` has a partial unique index** (`WHERE status = 'running'`) enforcing "only one active spin per room" at the database level — this alone handles the duplicate-start-request edge case without any application-level locking.
- **`spin_events` stores a full JSONB audit trail** of every spin_started/user_eliminated/winner_announced event. This is what makes reconnect-during-a-spin possible: a client can replay this log instead of the server needing separate "resume" logic.

Full schema: `server/src/db/migrations/001_init.sql`

---

## Spin Wheel Logic & Edge Cases

The spin engine (`server/src/services/spinEngine.js`) is server-authoritative: the client only ever receives events, never decides timing or outcomes. State machine: `WAITING → RUNNING → COMPLETED`, with an `ABORTED` branch reachable from `RUNNING`.

**10 edge cases considered and handled:**

| # | Case | Behavior |
|---|---|---|
| 1 | Duplicate start requests | Rejected by DB's unique partial index — second request errors cleanly |
| 2 | Simultaneous join right as spin starts | New joiner is not added mid-spin; becomes eligible for the next spin |
| 3 | User disconnects during a running spin | Not removed from `spin_participants` (history preserved); still eligible for elimination |
| 4 | Reconnect during a spin | Client calls `GET /spin` or `request_room_state`, replays current state from `spin_events` |
| 5 | Room owner disconnects mid-spin | Spin continues — server owns the timer, not tied to the starter's live connection |
| 6 | Insufficient/excess players (not 3–20) | Rejected before any spin row is created |
| 7 | All remaining players leave mid-spin | Spin is aborted with reason `no_participants_remaining` |
| 8 | Duplicate/out-of-order events | `spin_events` is the source of truth; client can always resync via `GET /spin` |
| 9 | Delayed timer ticks (server under load) | Each tick re-reads current DB state rather than trusting an in-memory snapshot |
| 10 | Server restart mid-spin | On boot, any leftover `running` spins are auto-aborted with reason `server_restart` |

---

## Testing

```bash
cd server
npm test                    # full suite: 6 suites, 22 tests
```

- **Unit tests** (`tests/unit/`) — spin engine validation and elimination-selection logic, no DB or real timers.
- **Integration tests** (`tests/integration/`) — Supertest against a real test database (`roxstar_test`), covering all 8 REST endpoints including error paths (404s, 403s, 409s, 422s).

---

## Docker

```bash
cd server
docker compose up --build -d
```

Two services: `backend` (Node app) and `postgres` (PostgreSQL 18). The backend connects to Postgres via the service name `postgres`, not `localhost` — standard Docker Compose networking.

---

## Cloud Deployment (AWS)

- **Provider:** AWS EC2, `t3.micro`, Ubuntu, region `eu-north-1`
- **Endpoint:** http://ec2-13-60-86-213.eu-north-1.compute.amazonaws.com:3000
- Docker + Docker Compose installed on the instance; the same `docker-compose.yml` used locally runs there unmodified.
- Security group: port `22` (SSH, restricted), port `3000` (API, public).

---

## CI/CD

`.github/workflows/deploy.yml` — on every push to `main`:
1. **test** — installs dependencies, runs the full Jest suite
2. **build** — builds the production Docker image to confirm it compiles cleanly
3. **deploy** — SSHes into the EC2 instance (via `appleboy/ssh-action`), pulls latest code, rebuilds containers, and verifies `/health` returns 200 before marking the deploy successful

Secrets used: `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USERNAME` (GitHub repository secrets, never committed).

---

## Known Limitations & Trade-offs

Documented honestly, as the assessment asks:

- **Echo effect wiring is incomplete.** The native module correctly records audio through Oboe and has a working `EchoEffect.cpp` DSP implementation, but the Kotlin-side `setEffect()` currently only stores the selected effect name — it does not yet invoke the C++ echo processing on the recorded file. Recording itself works end-to-end; applying the effect does not yet audibly change the output.
- **Frontend framework deviated from the original plan.** The app is built with Expo/React Native rather than a fully native Kotlin project. To still meet the Oboe requirement, audio recording and effects are implemented as a **custom native Expo module** — real Kotlin + C++ code compiled via NDK/CMake, not Expo's built-in `expo-audio` API. This was a mid-project correction after discovering the initial scaffold used Expo's managed audio APIs, which do not use Oboe.
- **Debug build, not a signed release APK.** Given the assessment's time constraints, no release keystore was created; the submitted APK is a debug build, which is fully functional but not Play Store-distributable as-is.
- **Postgres port was briefly exposed in Docker's port mapping** during cloud deployment (`0.0.0.0:5432`); the EC2 security group does not open 5432 publicly, so this was not actually reachable from outside, but it's a configuration detail worth tightening in a longer-lived deployment.