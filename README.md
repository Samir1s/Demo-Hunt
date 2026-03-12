# Demogorgon Hunt - GitHub Repository

Welcome to the **Demogorgon Hunt** Hackathon project!

This repository manages our real-time multiplayer location-based web game.

## Documentation
Please read the game's full specification and branching rules here:
- [Technical Specification & Game Details](docs/demogorgon-game.md)
- [Sprint & Block Breakdown](docs/blocks.md)
- [Git Branching & Roles](docs/gitblock.md)

## Team Roles & Branching
We use strict branches to prevent merge conflicts during the hackathon:
- **Member A (Backend)**: Uses `feat/sX-bY-...` branches.
- **Member B (Frontend)**: Uses `feat/sX-bY-...` branches.
- **Member C (Integration)**: Uses `feat/sX-bY-...` branches.

### Rules
1. Never commit directly to `main` or `dev`.
2. All work happens in feature branches targeting `dev`.
3. Open a Pull Request for review by at least one other member before merging to `dev`.
4. Merges from `dev` to `main` happen only after complete integration tests on real phones.

Happy hunting!
