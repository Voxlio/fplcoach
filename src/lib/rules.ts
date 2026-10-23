// Rules Module: Squad composition, formation validation, budget checks
// Pure functions with no external dependencies

import { CONFIG, type Config } from './config';
import type { Element } from './schemas';

// Position constants
export const POSITION = {
  GK: 1,
  DEF: 2,
  MID: 3,
  FWD: 4,
} as const;

export type Position = typeof POSITION[keyof typeof POSITION];

export interface SquadRules {
  squad: Record<number, number>;
  maxPerClub: number;
  validFormations: Array<{ gk: number; def: number; mid: number; fwd: number }>;
}

export const DEFAULT_RULES: SquadRules = {
  squad: CONFIG.FORMATION.squad,
  maxPerClub: CONFIG.FORMATION.maxPerClub,
  validFormations: CONFIG.FORMATION.validFormations as Array<{ gk: number; def: number; mid: number; fwd: number }>,
};

/**
 * Count players by position in a squad
 */
export function countByPosition(players: Element[]): Record<Position, number> {
  const counts: Record<Position, number> = {
    [POSITION.GK]: 0,
    [POSITION.DEF]: 0,
    [POSITION.MID]: 0,
    [POSITION.FWD]: 0,
  };
  
  for (const player of players) {
    if (player.element_type in counts) {
      counts[player.element_type as Position]++;
    }
  }
  
  return counts;
}

/**
 * Check if a squad meets the composition rules
 */
export function validateSquadComposition(players: Element[], rules: SquadRules = DEFAULT_RULES): { valid: boolean; errors: string[] } {
  const counts = countByPosition(players);
  const errors: string[] = [];
  
  // Check squad size (15 players)
  if (players.length !== 15) {
    errors.push(`Squad must have 15 players, has ${players.length}`);
  }
  
  // Check position counts - use numeric keys
  if (counts[POSITION.GK] !== rules.squad[POSITION.GK]) {
    errors.push(`Must have ${rules.squad[POSITION.GK]} goalkeepers, has ${counts[POSITION.GK]}`);
  }
  if (counts[POSITION.DEF] !== rules.squad[POSITION.DEF]) {
    errors.push(`Must have ${rules.squad[POSITION.DEF]} defenders, has ${counts[POSITION.DEF]}`);
  }
  if (counts[POSITION.MID] !== rules.squad[POSITION.MID]) {
    errors.push(`Must have ${rules.squad[POSITION.MID]} midfielders, has ${counts[POSITION.MID]}`);
  }
  if (counts[POSITION.FWD] !== rules.squad[POSITION.FWD]) {
    errors.push(`Must have ${rules.squad[POSITION.FWD]} forwards, has ${counts[POSITION.FWD]}`);
  }
  
  // Check max 3 per club
  const clubCounts = new Map<number, number>();
  for (const player of players) {
    clubCounts.set(player.team, (clubCounts.get(player.team) || 0) + 1);
  }
  for (const [clubId, count] of clubCounts) {
    if (count > rules.maxPerClub) {
      errors.push(`Club ${clubId} has ${count} players (max ${rules.maxPerClub})`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Check if a starting XI (11 players) is a valid formation
 */
export function validateFormation(
  starters: Element[],
  rules: SquadRules = DEFAULT_RULES
): { valid: boolean; formation: string | null; errors: string[] } {
  if (starters.length !== 11) {
    return { valid: false, formation: null, errors: [`Starting XI must have 11 players, has ${starters.length}`] };
  }
  
  const counts = countByPosition(starters);
  const errors: string[] = [];
  
  // Must have exactly 1 GK
  if (counts[POSITION.GK] !== 1) {
    errors.push(`Must have exactly 1 GK, has ${counts[POSITION.GK]}`);
  }
  
  // Check position ranges
  if (counts[POSITION.DEF] < 3 || counts[POSITION.DEF] > 5) {
    errors.push(`Defenders must be 3-5, has ${counts[POSITION.DEF]}`);
  }
  if (counts[POSITION.MID] < 2 || counts[POSITION.MID] > 5) {
    errors.push(`Midfielders must be 2-5, has ${counts[POSITION.MID]}`);
  }
  if (counts[POSITION.FWD] < 1 || counts[POSITION.FWD] > 3) {
    errors.push(`Forwards must be 1-3, has ${counts[POSITION.FWD]}`);
  }
  
  // Check against valid formations
  const formation = `${counts[POSITION.DEF]}-${counts[POSITION.MID]}-${counts[POSITION.FWD]}`;
  const isValidFormation = rules.validFormations.some(
    f => f.def === counts[POSITION.DEF] && f.mid === counts[POSITION.MID] && f.fwd === counts[POSITION.FWD]
  );
  
  if (!isValidFormation) {
    errors.push(`Formation ${formation} is not valid`);
  }
  
  return { valid: errors.length === 0, formation: isValidFormation ? formation : null, errors };
}

/**
 * Check budget constraint for a squad
 */
export function validateBudget(
  players: Element[],
  bank: number,
  totalValue: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const squadValue = players.reduce((sum, p) => sum + p.now_cost, 0);
  
  if (squadValue > totalValue) {
    errors.push(`Squad value ${squadValue / 10}m exceeds total budget ${totalValue / 10}m`);
  }
  
  if (bank < 0) {
    errors.push(`Bank cannot be negative: ${bank / 10}m`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get all valid formations for a given set of 15 players
 * Returns all valid 11-player subsets
 */
export function getValidFormations(players: Element[]): Element[][] {
  // This is a combinatorial problem - we'll use a simpler approach
  // Group by position and try all valid formation patterns
  const byPosition = {
    [POSITION.GK]: players.filter(p => p.element_type === POSITION.GK),
    [POSITION.DEF]: players.filter(p => p.element_type === POSITION.DEF),
    [POSITION.MID]: players.filter(p => p.element_type === POSITION.MID),
    [POSITION.FWD]: players.filter(p => p.element_type === POSITION.FWD),
  };
  
  const validXIs: Element[][] = [];
  
  for (const formation of DEFAULT_RULES.validFormations) {
    // Check if we have enough players for this formation
    if (byPosition[POSITION.GK].length < formation.gk) continue;
    if (byPosition[POSITION.DEF].length < formation.def) continue;
    if (byPosition[POSITION.MID].length < formation.mid) continue;
    if (byPosition[POSITION.FWD].length < formation.fwd) continue;
    
    // For each position, we need to choose N players
    // We'll generate combinations - for simplicity, we'll take the top N by projected points later
    // Here we just validate the formation is possible
    validXIs.push([]); // Placeholder - actual selection happens in best-xi.ts
  }
  
  return validXIs;
}

/**
 * Check if adding a player would violate the 3-per-club rule
 */
export function wouldViolateClubLimit(
  currentPlayers: Element[],
  newPlayer: Element,
  playerToRemove?: Element
): boolean {
  const clubCounts = new Map<number, number>();
  
  for (const p of currentPlayers) {
    clubCounts.set(p.team, (clubCounts.get(p.team) || 0) + 1);
  }
  
  // Remove the outgoing player
  if (playerToRemove) {
    const count = clubCounts.get(playerToRemove.team) || 0;
    if (count > 0) clubCounts.set(playerToRemove.team, count - 1);
  }
  
  // Add the new player
  const newCount = (clubCounts.get(newPlayer.team) || 0) + 1;
  
  return newCount > DEFAULT_RULES.maxPerClub;
}