# ROXSTAR Mobile

Expo Router frontend for the reviewed ROXSTAR Node/PostgreSQL/Socket.IO backend. The design is optimized for the assessment demo: local Android Oboe recordings, real-time rooms, server-driven spin eliminations, and a winner screen.

## Run in VS Code

1. Open this folder in VS Code and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `EXPO_PUBLIC_API_URL`:
   - Android emulator: `http://10.0.2.2:4000`
   - real device: `http://YOUR_COMPUTER_LAN_IP:4000`
   - deployed backend: its public HTTPS URL
4. Run `npx expo start --dev-client`, then open the Android development build.

The custom Oboe native module means Expo Go cannot record audio. Use the existing Android development build or `npx expo run:android`.

## Backend contract used

- `POST /rooms` with `{ username, deviceId }`
- `POST /rooms/:roomCode/join` with `{ username, deviceId }`
- `POST /rooms/:roomId/leave` with `{ userId }`
- `GET /rooms/:roomId`
- `POST /rooms/:roomId/drafts/share`
- `GET /rooms/:roomId/spin`
- Socket.IO: `join_room`, `leave_room`, `share_draft`, `start_spin`, and the corresponding room/spin broadcasts.

The app deliberately starts spins with Socket.IO because that is the only current backend path that runs the five-second elimination engine and broadcasts events.
