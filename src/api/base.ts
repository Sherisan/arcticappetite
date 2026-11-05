// In dev, relative URLs go through the Vite proxy (vite.config.ts) to
// localhost:5003. In production the frontend and API are on different hosts
// (games.easygamesdemo.co.za / gameapi.easygamesdemo.co.za) — there is no
// proxy — so builds set VITE_API_BASE to the API's absolute origin.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/** This game's id on the API — tags the session token, limits and evolution ladder. */
export const GAME_ID = 'arctic-appetite';
