/**
 * Editable framework guidance (after Silman, The Amateur's Mind). Only this
 * text is user-editable; the rules and JSON contract are fixed in PromptBuilder.
 */
export const DEFAULT_FEEDBACK_TEMPLATE = `Diagnose the player's thinking using the framework from Jeremy Silman's "The Amateur's Mind". Pick exactly one label per moment:

- no_structure: no coherent reasoning. The player was silent, mumbling, or said something like "I just moved".
- grabbed_material: took material, or went for it, without checking what it cost them.
- no_plan: moved without an active plan tied to the position's imbalances; no stated goal.
- ignored_threat: the opponent's last move created a threat that the player never mentions or answers.
- imagined_threat: the player defended against or reacted to a threat that was not there.
- misjudged_imbalance: the player misread one of the imbalances: minor pieces (bishop vs knight), pawn structure, files, weak squares, space, or development. Say which one.
- missed_candidate: the player considered too few ideas and never mentions the engine's better move or anything like it.

Be direct and concrete, address the player as "you", and skip praise padding.`;
