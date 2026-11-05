// The six Arctic Appetite creatures, smallest to apex. The multiplier is the
// round multiplier at which the player's creature evolves into that species.
// Krill (0.5x) is below the 1.00x launch point — it exists as ambient "food"
// and in the legend/paytable only.

export type Species = 'krill' | 'penguin' | 'seal' | 'polarbear' | 'orca' | 'leviathan';

export interface FishTier {
  species: Species;
  name: string;
  tier: 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'PREDATOR' | 'MYTHIC';
  /** Display form used in the legend / size label ("Small", "Mythic"). */
  tierLabel: string;
  multiplier: number;
  /** Card/tier accent color (Figma fish cards). */
  accent: string;
  /** Color of the multiplier value in the Species Legend. */
  multColor: string;
  /** Dark tier-pill background on the fish cards. */
  pillBg: string;
  /** Fish-card border color. */
  cardBorder: string;
}

export const FISH_TIERS: FishTier[] = [
  { species: 'krill',     name: 'Krill',         tier: 'TINY',     tierLabel: 'Tiny',     multiplier: 0.5, accent: '#ff9c86', multColor: '#a1c4e6', pillBg: '#3d2a2d', cardBorder: '#614046' },
  { species: 'penguin',   name: 'Penguin',       tier: 'SMALL',    tierLabel: 'Small',    multiplier: 1,   accent: '#ffc94a', multColor: '#1de9b6', pillBg: '#40320d', cardBorder: '#665014' },
  { species: 'seal',      name: 'Seal',          tier: 'MEDIUM',   tierLabel: 'Medium',   multiplier: 2,   accent: '#b8c6d3', multColor: '#00f5ff', pillBg: '#2a3138', cardBorder: '#45505b' },
  { species: 'polarbear', name: 'Polar Bear',    tier: 'LARGE',    tierLabel: 'Large',    multiplier: 5,   accent: '#e8f4ff', multColor: '#00f5ff', pillBg: '#26343f', cardBorder: '#3e5566' },
  { species: 'orca',      name: 'Orca',          tier: 'PREDATOR', tierLabel: 'Predator', multiplier: 10,  accent: '#ffd700', multColor: '#ffd700', pillBg: '#403206', cardBorder: '#66500a' },
  { species: 'leviathan', name: 'Ice Leviathan', tier: 'MYTHIC',   tierLabel: 'Mythic',   multiplier: 25,  accent: '#7ff6ff', multColor: '#ffd700', pillBg: '#0f3340', cardBorder: '#1c5566' },
];

/** The species the player currently IS, given the live multiplier (starts as Penguin at 1.00x). */
export function tierForMultiplier(multiplier: number): FishTier {
  let current = FISH_TIERS[1];
  for (const tier of FISH_TIERS) {
    if (tier.multiplier >= 1 && multiplier >= tier.multiplier) current = tier;
  }
  return current;
}

/** The tier that would EAT the player at the current size — used for the crash animation. */
export function predatorForMultiplier(multiplier: number): FishTier {
  const idx = FISH_TIERS.indexOf(tierForMultiplier(multiplier));
  return FISH_TIERS[Math.min(idx + 1, FISH_TIERS.length - 1)];
}

/** Accent color for a crash-history chip. */
export function tierColorForCrash(multiplier: number): string {
  return tierForMultiplier(multiplier).accent;
}

/** 1-based level for the "LVL n: TIER" growth label (Krill=1 … Ice Leviathan=6). */
export function levelForTier(tier: FishTier): number {
  return FISH_TIERS.indexOf(tier) + 1;
}

/** Progress (0..1) from the current tier's threshold to the next tier's. */
export function progressToNext(multiplier: number): { progress: number; next: FishTier | null } {
  const current = tierForMultiplier(multiplier);
  const idx = FISH_TIERS.indexOf(current);
  const next = idx < FISH_TIERS.length - 1 ? FISH_TIERS[idx + 1] : null;
  if (!next) return { progress: 1, next: null };
  const span = next.multiplier - current.multiplier;
  return {
    progress: Math.min(1, Math.max(0, (multiplier - current.multiplier) / span)),
    next,
  };
}

/** Visual scale of the player creature: 1.00x → ~0.5, 25x+ → ~2.1, log growth. */
export function playerScale(multiplier: number): number {
  return Math.min(2.1, 0.5 + 0.35 * Math.log(Math.max(1, multiplier)) / Math.log(2.4));
}

/**
 * Overwrites the multipliers above with the ones set in the Game Back Office, matched by species.
 * Unknown species are ignored; anything not sent keeps its built-in value.
 */
export function applyEvolutionMultipliers(tiers: { code: string; multiplier: number }[]): void {
  for (const t of tiers) {
    const tier = FISH_TIERS.find((f) => f.species === t.code);
    if (tier && t.multiplier > 0) tier.multiplier = t.multiplier;
  }
}
