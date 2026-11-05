# Arctic Appetite

Crash game on the shared /gamehub engine (FeedingFranzeeAPI, game id `arctic-appetite`, `Engine: Custom`) — the Feeding
Franzee concept under the polar ice. You start as a penguin; as the multiplier climbs you evolve into a seal, polar bear,
orca and finally the Ice Leviathan. When the round crashes, the next creature up the food chain gets you.

| Tier | Creature | Evolves at |
|---|---|---|
| 0 (food) | Krill | 0.5x |
| 1 (start) | Penguin | 1.00x |
| 2 | Seal | 2x |
| 3 | Polar Bear | 5x |
| 4 | Orca | 10x |
| 5 | Ice Leviathan | 25x |

The multipliers are edited in the Game Back Office (Games → Arctic Appetite → Evolution); the frontend loads them at
startup from `GET /api/games/arctic-appetite/evolution`. The art keys (`krill` … `leviathan`) are fixed.

Steering works as in Feeding Franzee: hold and drag to eat smaller prey for multiplier boosts, and avoid the ice shards
(the server's "mines"). Free bets, rain, leaderboards, races and round drops come from the promo engine like the other
crash games.

## Run locally

1. Start the API (Development, `http://localhost:5003`).
2. `npm install`, then `npm run dev` → http://localhost:5193 (Vite proxies `/api`, `/gamehub` and `/promohub` to the API).

The game id lives in `src/api/base.ts` (`GAME_ID`); it tags the dev token, the bet limits and the evolution ladder.

**Deploy:** `npm run build` (uses `VITE_API_BASE` from `.env.production`) and host `dist/` at
`https://arcticappetite.easygamesdemo.co.za/` (the game's `LaunchUrl`; already in the API's AllowedOrigins). Before real
wallets accept bets, set the game's `ProviderGameId` in the back office.
