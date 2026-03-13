# 👾 Demogorgon Hunt

**Demogorgon Hunt** is a real-time multiplayer location-based web game inspired by *Stranger Things* and *Among Us*, built specifically for hackathons.

One player is secretly assigned the role of the **Demogorgon**, whose objective is to hunt down and catch all other players. The remaining players are **Security Agents**, whose goal is to survive the time limit or correctly accuse and identify the Demogorgon using limited radar intel.

---

## 🚀 Features

- **Real-time Multiplayer:** Powered by Socket.IO for sub-second position updates and game events.
- **In-Memory Game Engine:** No database required. A lightweight, ephemeral Node.js server manages room state, game phases, and proximity tracking.
- **Role Assignment:** Secret auto-assignment of roles (`DEMOGORGON` vs `SECURITY`) when the host starts the game.
- **Proximity Engine:** 5 Hz server tick cycle computes Euclidean distance between players, emitting `LOW` (alert) and `HIGH` (capture) proximity warnings.
- **Sanitised Radar:** Security players can see movement blips but cannot identify *who* the Demogorgon is — all blips appear as `UNKNOWN`. The Demogorgon sees everyone as `PREY`.
- **Catch & Accuse Logic:** 
  - **Catch:** The Demogorgon can instantly eliminate the nearest Security player within a 5-meter radius.
  - **Accuse:** Security players have *one* chance to guess the Demogorgon's identity. A wrong guess strips their ability to accuse; a correct guess instantly wins the game for the Security team.
- **Authoritative 5-Minute Timer:** Server-side countdown ensures matches end cleanly, evaluating win conditions on timeout.

---

## 🛠️ Technology Stack

- **Backend:** Node.js, Express, Socket.IO, TypeScript
- **Frontend:** React (SPA) *(to be implemented)*
- **State Management:** In-memory TypeScript `Map` objects for blazing fast read/writes.
- **Deployment:** Ready for single-process cloud deployments (Render, Railway, Vercel).

---

## 📂 Project Structure

```text
demogorgon-hunt/
├── docs/                # Technical specs, block breakdowns, and git rules
├── server/              # Node.js + Socket.IO Backend
│   ├── src/
│   │   ├── index.ts     # Main server entry, Socket event handlers, Proximity loop
│   │   ├── store.ts     # In-memory maps for Rooms & Players, game configs
│   │   └── types.ts     # Shared TypeScript interfaces (Room, Player, Position, Roles)
│   ├── package.json
│   └── tsconfig.json
└── README.md            # You are here!
```

---

## 🚦 Getting Started (Backend)

The backend is fully implemented and ready to act as the authoritative game server.

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Samir1s/Demo-Hunt.git
   cd Demo-Hunt/server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment:**
   Create a `.env` file in the `server/` directory based on the `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Default port is `3001`.*

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The server will start with hot-reloading via `tsx watch`.

### Health Check
Verify the server is running by hitting the health endpoint:
```bash
curl http://localhost:3001/health
# Expected output: {"status":"ok"}
```

---

## 📜 Development & Branching Rules

This project adheres to a strict branching strategy to prevent merge conflicts during rapid hackathon development:

- `main` — Production-ready, demo-stable code.
- `dev` — The primary integration branch.
- `feat/sX-bY-name` — Feature branches branched from `dev` (e.g., `feat/s1-b2-room-logic`).

For complete Git guidelines and team member roles, please refer to [`docs/gitblock.md`](./docs/gitblock.md).

For the sprint-by-sprint development plan, refer to [`docs/blocks.md`](./docs/blocks.md).

---

## 🎮 Game Rules & Win Conditions

**Phase 1: Lobby**
- Players join a room using a unique code.
- The first player is assigned as the Host.
- Game can start once `MIN_PLAYERS` (default: 2) are connected.

**Phase 2: Running**
- Roles are secretly assigned.
- The 5-minute round timer begins.
- Proximity Engine tracks movement and issues zone alerts (`ALERT_RADIUS=15m`, `CAPTURE_RADIUS=5m`).

**Phase 3: Finished**
- **Demogorgon Wins:** If all Security agents are caught OR the timer expires and all agents are caught.
- **Security Wins:** If a Security agent correctly accuses the Demogorgon OR the timer expires with at least one Security agent still alive.

---
*Built for the IIIT Hackathon.*
