import type { FC } from 'react';
import type { Species } from '../../game/fishTiers';
import type { FishProps } from './FishProps';
import { KrillFish } from './KrillFish';
import { PenguinFish } from './PenguinFish';
import { SealFish } from './SealFish';
import { PolarBearFish } from './PolarBearFish';
import { OrcaFish } from './OrcaFish';
import { LeviathanFish } from './LeviathanFish';

// Inline SVG creatures, all drawn facing right in a 2:1 viewBox. Gradient ids
// are uniquified per instance via useId() inside each component, since many
// copies of the same species render at once (krill drifters, swimmers, legend
// icons) and SVG def ids must be unique per document.
const COMPONENTS: Record<Species, FC<FishProps>> = {
  krill: KrillFish,
  penguin: PenguinFish,
  seal: SealFish,
  polarbear: PolarBearFish,
  orca: OrcaFish,
  leviathan: LeviathanFish,
};

export function Fish({ species, ...rest }: FishProps & { species: Species }) {
  const Component = COMPONENTS[species];
  return <Component {...rest} />;
}
