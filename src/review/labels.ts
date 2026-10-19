import type { Imbalance, Label } from '../shared/types';

export const LABEL_TEXT: Record<Label, string> = {
  no_structure: 'No structure',
  grabbed_material: 'Grabbed material',
  no_plan: 'No plan',
  ignored_threat: "Ignored opponent's threat",
  imagined_threat: 'Imagined threat',
  misjudged_imbalance: 'Misjudged imbalance',
  missed_candidate: 'Missed a candidate move',
};

export const IMBALANCE_TEXT: Record<Imbalance, string> = {
  minor_pieces: 'minor pieces',
  pawn_structure: 'pawn structure',
  files: 'files',
  weak_squares: 'weak squares',
  space: 'space',
  development: 'development',
};

export function labelText(label: Label, imbalance: Imbalance | null): string {
  const base = LABEL_TEXT[label];
  return label === 'misjudged_imbalance' && imbalance
    ? `${base}: ${IMBALANCE_TEXT[imbalance]}`
    : base;
}
