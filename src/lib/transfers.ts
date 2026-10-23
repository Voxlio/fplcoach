// Transfers Module: Calculate best transfer suggestions
// Considers budget, club limits, hit costs, and roll threshold

import { CONFIG } from './config';
import type { Element, Transfer } from './schemas';
import { PlayerProjection } from './projections';
import { POSITION } from './rules';
import { calculateAllPrices, getSellingPrice, calculateTransferBudget } from './pricing';

export interface TransferSuggestion {
  out: Element;
  in: Element;
  priceChange: number; // IN cost - OUT selling price (positive = need more budget)
  projectedGainUpcoming: number; // Gain for upcoming gameweek
  projectedGainHorizon: number; // Gain over horizon
  newBank: number;
  reason: string;
  isHit: boolean;
  hitCost: number;
  netGain: number; // projectedGainUpcoming - hitCost
}

export interface TransferSearchParams {
  squad: Element[];
  allPlayers: Element[];
  projections: Map<number, PlayerProjection[]>;
  prices: Map<number, { purchasePrice: number; sellingPrice: number }>;
  bank: number;
  freeTransfers: number;
  upcomingGameweek: number;
  horizonGameweeks: number;
}

interface PlayerScore {
  player: Element;
  upcomingPoints: number;
  horizonPoints: number;
  sellingPrice: number;
}

/**
 * Score a player for transfer OUT (lower is better to sell)
 */
export function scorePlayerOut(
  player: Element,
  projections: Map<number, PlayerProjection[]>,
  upcomingGameweek: number,
  horizonGameweeks: number,
  sellingPrice: number
): PlayerScore {
  const proj = projections.get(player.id) || [];
  
  let upcomingPoints = 0;
  let horizonPoints = 0;
  
  for (const p of proj) {
    if (p.gameweek === upcomingGameweek) {
      upcomingPoints += p.projectedPoints;
    }
    if (p.gameweek >= upcomingGameweek && p.gameweek < upcomingGameweek + horizonGameweeks) {
      horizonPoints += p.projectedPoints;
    }
  }
  
  return { player, upcomingPoints, horizonPoints, sellingPrice };
}

/**
 * Score a player for transfer IN (higher is better)
 */
export function scorePlayerIn(
  player: Element,
  projections: Map<number, PlayerProjection[]>,
  upcomingGameweek: number,
  horizonGameweeks: number
): PlayerScore {
  const proj = projections.get(player.id) || [];
  
  let upcomingPoints = 0;
  let horizonPoints = 0;
  
  for (const p of proj) {
    if (p.gameweek === upcomingGameweek) {
      upcomingPoints += p.projectedPoints;
    }
    if (p.gameweek >= upcomingGameweek && p.gameweek < upcomingGameweek + horizonGameweeks) {
      horizonPoints += p.projectedPoints;
    }
  }
  
  return { player, upcomingPoints, horizonPoints, sellingPrice: 0 };
}

/**
 * Check if a transfer is valid (club limits, position match)
 */
export function isValidTransfer(
  outPlayer: Element,
  inPlayer: Element,
  squad: Element[],
  freeTransfers: number,
  currentTransfersUsed: number
): { valid: boolean; reason: string } {
  // Same position required
  if (outPlayer.element_type !== inPlayer.element_type) {
    return { valid: false, reason: 'Position mismatch' };
  }
  
  // Check if player already in squad
  if (squad.some(p => p.id === inPlayer.id)) {
    return { valid: false, reason: 'Already in squad' };
  }
  
  // Check club limit (3 per club)
  const clubCounts = new Map<number, number>();
  for (const p of squad) {
    if (p.id !== outPlayer.id) {
      clubCounts.set(p.team, (clubCounts.get(p.team) || 0) + 1);
    }
  }
  const inClubCount = (clubCounts.get(inPlayer.team) || 0) + 1;
  if (inClubCount > 3) {
    return { valid: false, reason: `Club limit: ${inClubCount}/3 from ${inPlayer.team}` };
  }
  
  return { valid: true, reason: '' };
}

/**
 * Generate human-readable reason for a transfer
 */
function generateTransferReason(
  outPlayer: Element,
  inPlayer: Element,
  outScore: PlayerScore,
  inScore: PlayerScore,
  upcomingGameweek: number,
  fixtures: Map<number, { team_h: number; team_a: number }>,
  teams: Map<number, { short_name: string }>
): string {
  const outFixture = getFixtureString(outPlayer, upcomingGameweek, fixtures, teams);
  const inFixture = getFixtureString(inPlayer, upcomingGameweek, fixtures, teams);
  
  const gain = inScore.upcomingPoints - outScore.upcomingPoints;
  
  let reason = `${inPlayer.web_name} (${teams.get(inPlayer.team)?.short_name}) has `;
  
  if (gain > 3) {
    reason += `a much better fixture (${inFixture}) vs ${outPlayer.web_name}'s ${outFixture}`;
  } else if (gain > 1) {
    reason += `a better fixture (${inFixture}) vs ${outPlayer.web_name}'s ${outFixture}`;
  } else {
    reason += `similar fixture (${inFixture}) but better underlying stats`;
  }
  
  reason += `. Projected gain: ${gain.toFixed(1)} pts this GW, ${(inScore.horizonPoints - outScore.horizonPoints).toFixed(1)} over ${CONFIG.TRANSFER.HORIZON_GAMEWEEKS} GWs.`;
  
  // Add specific stats
  const inXG90 = parseFloat(inPlayer.expected_goals_per_90) || 0;
  const outXG90 = parseFloat(outPlayer.expected_goals_per_90) || 0;
  if (inXG90 > outXG90 + 0.1) {
    reason += ` Higher xG/90 (${inXG90.toFixed(2)} vs ${outXG90.toFixed(2)}).`;
  }
  
  const inXA90 = parseFloat(inPlayer.expected_assists_per_90) || 0;
  const outXA90 = parseFloat(outPlayer.expected_assists_per_90) || 0;
  if (inXA90 > outXA90 + 0.05) {
    reason += ` Higher xA/90 (${inXA90.toFixed(2)} vs ${outXA90.toFixed(2)}).`;
  }
  
  if (inPlayer.penalties_order === 1 && outPlayer.penalties_order !== 1) {
    reason += ` Penalty taker.`;
  }
  
  return reason;
}

function getFixtureString(
  player: Element,
  gameweek: number,
  fixtures: Map<number, { team_h: number; team_a: number }>,
  teams: Map<number, { short_name: string }>
): string {
  // Find the fixture for this player's team in the gameweek
  for (const fixture of fixtures.values()) {
    if (fixture.team_h === player.team || fixture.team_a === player.team) {
      const isHome = fixture.team_h === player.team;
      const oppId = isHome ? fixture.team_a : fixture.team_h;
      const oppName = teams.get(oppId)?.short_name || oppId;
      return isHome ? `vs ${oppName} (H)` : `@ ${oppName} (A)`;
    }
  }
  return 'Blank';
}

/**
 * Find best single transfers
 */
export function findBestSingleTransfers(
  params: TransferSearchParams
): TransferSuggestion[] {
  const { squad, allPlayers, projections, prices, bank, freeTransfers, upcomingGameweek, horizonGameweeks } = params;
  
  const suggestions: TransferSuggestion[] = [];
  
  // Score all OUT candidates (our players)
  const outScores: PlayerScore[] = [];
  for (const player of squad) {
    const priceInfo = prices.get(player.id);
    if (!priceInfo) continue;
    
    const score = scorePlayerOut(player, projections, upcomingGameweek, horizonGameweeks, priceInfo.sellingPrice);
    outScores.push(score);
  }
  
  // Sort OUT candidates by projected points (worst first - prioritize selling low performers)
  outScores.sort((a, b) => a.upcomingPoints - b.upcomingPoints);
  
  // Hard prioritize: injured/out players (availability 0) and bench-only
  const problemOuts = outScores.filter(s => {
    const proj = projections.get(s.player.id) || [];
    const upcoming = proj.find(p => p.gameweek === upcomingGameweek);
    return upcoming?.availability === 0 || upcoming?.projectedPoints === 0;
  });
  
  const normalOuts = outScores.filter(s => {
    const proj = projections.get(s.player.id) || [];
    const upcoming = proj.find(p => p.gameweek === upcomingGameweek);
    return upcoming?.availability !== 0 && upcoming?.projectedPoints !== 0;
  });
  
  const prioritizedOuts = [...problemOuts, ...normalOuts];
  
  // For each OUT candidate, find best IN candidates
  for (const outScore of prioritizedOuts) {
    const outPlayer = outScore.player;
    const position = outPlayer.element_type;
    
    // Find all same-position players not in squad
    const inCandidates = allPlayers.filter(p => 
      p.element_type === position && 
      !squad.some(s => s.id === p.id) &&
      p.status !== 'u' && // Skip unavailable
      p.status !== 'n'    // Skip not in squad
    );
    
    // Score IN candidates
    const inScores = inCandidates.map(p => scorePlayerIn(p, projections, upcomingGameweek, horizonGameweeks));
    
    // Sort by horizon points (descending)
    inScores.sort((a, b) => b.horizonPoints - a.horizonPoints);
    
    // Take top 15 for budget pruning
    const topInCandidates = inScores.slice(0, 15);
    
    for (const inScore of topInCandidates) {
      const inPlayer = inScore.player;
      
      // Check validity
      const validity = isValidTransfer(outPlayer, inPlayer, squad, freeTransfers, 0);
      if (!validity.valid) continue;
      
      // Check budget
      const outPriceInfo = prices.get(outPlayer.id);
      if (!outPriceInfo) continue;
      
      const priceChange = inPlayer.now_cost - outPriceInfo.sellingPrice;
      const newBank = bank - priceChange;
      
      if (newBank < 0) continue; // Can't afford
      
      // Calculate gains
      const upcomingGain = inScore.upcomingPoints - outScore.upcomingPoints;
      const horizonGain = inScore.horizonPoints - outScore.horizonPoints;
      
      // Weighted score: upcoming GW double weight
      const weightedGain = (upcomingGain * CONFIG.TRANSFER.UPCOMING_GW_WEIGHT) + horizonGain;
      
      // Determine if hit needed
      const transfersUsed = 0; // Single transfer
      const isHit = transfersUsed >= freeTransfers;
      const hitCost = isHit ? CONFIG.TRANSFER.HIT_COST : 0;
      const netGain = upcomingGain - hitCost;
      
      // Only suggest if net gain is positive (or it's a problem player replacement)
      const isProblemPlayer = outScore.upcomingPoints < 1.0;
      if (netGain > -1 || isProblemPlayer) {
        const reason = generateTransferReason(
          outPlayer, inPlayer, outScore, inScore, upcomingGameweek,
          new Map(), // fixtures map would be passed in real implementation
          new Map()  // teams map
        );
        
        suggestions.push({
          out: outPlayer,
          in: inPlayer,
          priceChange,
          projectedGainUpcoming: upcomingGain,
          projectedGainHorizon: horizonGain,
          newBank,
          reason,
          isHit,
          hitCost,
          netGain,
        });
      }
    }
  }
  
  // Sort by net gain (descending)
  suggestions.sort((a, b) => b.netGain - a.netGain);
  
  // Return top 5
  return suggestions.slice(0, 5);
}

/**
 * Find best double transfers (for 2+ free transfers)
 */
export function findBestDoubleTransfers(
  params: TransferSearchParams
): TransferSuggestion[] {
  const { squad, allPlayers, projections, prices, bank, freeTransfers, upcomingGameweek, horizonGameweeks } = params;
  
  if (freeTransfers < 2) return [];
  
  const suggestions: TransferSuggestion[] = [];
  
  // Score all OUT candidates
  const outScores: PlayerScore[] = [];
  for (const player of squad) {
    const priceInfo = prices.get(player.id);
    if (!priceInfo) continue;
    const score = scorePlayerOut(player, projections, upcomingGameweek, horizonGameweeks, priceInfo.sellingPrice);
    outScores.push(score);
  }
  
  outScores.sort((a, b) => a.upcomingPoints - b.upcomingPoints);
  const topOutCandidates = outScores.slice(0, 5); // Top 5 worst performers
  
  // For each pair of OUT candidates, find best pair of IN candidates
  for (let i = 0; i < topOutCandidates.length; i++) {
    for (let j = i + 1; j < topOutCandidates.length; j++) {
      const out1 = topOutCandidates[i];
      const out2 = topOutCandidates[j];
      
      // Must be different positions or we need 2 IN of same position
      const pos1 = out1.player.element_type;
      const pos2 = out2.player.element_type;
      
      // Find IN candidates for each position
      const inCandidates1 = allPlayers.filter(p => 
        p.element_type === pos1 && !squad.some(s => s.id === p.id) && p.status === 'a'
      );
      const inCandidates2 = allPlayers.filter(p => 
        p.element_type === pos2 && !squad.some(s => s.id === p.id) && p.status === 'a'
      );
      
      const inScores1 = inCandidates1.map(p => scorePlayerIn(p, projections, upcomingGameweek, horizonGameweeks)).slice(0, 10);
      const inScores2 = inCandidates2.map(p => scorePlayerIn(p, projections, upcomingGameweek, horizonGameweeks)).slice(0, 10);
      
      // Try combinations
      for (const in1 of inScores1) {
        for (const in2 of inScores2) {
          if (in1.player.id === in2.player.id) continue; // Can't buy same player twice
          
          // Check club limits for both
          const validity1 = isValidTransfer(out1.player, in1.player, squad, freeTransfers, 0);
          const validity2 = isValidTransfer(out2.player, in2.player, squad, freeTransfers, 1);
          
          if (!validity1.valid || !validity2.valid) continue;
          
          // Check budget
          const out1Price = prices.get(out1.player.id)?.sellingPrice || 0;
          const out2Price = prices.get(out2.player.id)?.sellingPrice || 0;
          const totalOut = out1Price + out2Price;
          const totalIn = in1.player.now_cost + in2.player.now_cost;
          const priceChange = totalIn - totalOut;
          const newBank = bank - priceChange;
          
          if (newBank < 0) continue;
          
          // Calculate combined gain
          const upcomingGain = (in1.upcomingPoints + in2.upcomingPoints) - (out1.upcomingPoints + out2.upcomingPoints);
          const horizonGain = (in1.horizonPoints + in2.horizonPoints) - (out1.horizonPoints + out2.horizonPoints);
          
          const isHit = 2 > freeTransfers; // 2 transfers used
          const hitCost = isHit ? CONFIG.TRANSFER.HIT_COST : 0;
          const netGain = upcomingGain - hitCost;
          
          if (netGain > CONFIG.TRANSFER.HIT_COST + CONFIG.TRANSFER.HIT_MARGIN) {
            // Only recommend hit if gain exceeds 4.5
            suggestions.push({
              out: out1.player, // Primary out for display
              in: in1.player,   // Primary in for display
              priceChange,
              projectedGainUpcoming: upcomingGain,
              projectedGainHorizon: horizonGain,
              newBank,
              reason: `Double transfer: ${out1.player.web_name} -> ${in1.player.web_name}, ${out2.player.web_name} -> ${in2.player.web_name}. Combined gain: ${upcomingGain.toFixed(1)} pts.`,
              isHit,
              hitCost,
              netGain,
            });
          }
        }
      }
    }
  }
  
  suggestions.sort((a, b) => b.netGain - a.netGain);
  return suggestions.slice(0, 3);
}

/**
 * Decide whether to roll the transfer
 */
export function shouldRollTransfer(
  bestSingleGain: number,
  freeTransfers: number
): { roll: boolean; reason: string } {
  if (freeTransfers >= 2) {
    return { roll: false, reason: 'Multiple free transfers available' };
  }
  
  if (bestSingleGain < CONFIG.TRANSFER.ROLL_THRESHOLD) {
    return { 
      roll: true, 
      reason: `Best gain (${bestSingleGain.toFixed(1)}) is below roll threshold (${CONFIG.TRANSFER.ROLL_THRESHOLD}). Save transfer for next week.` 
    };
  }
  
  return { roll: false, reason: '' };
}

/**
 * Main transfer analysis function
 */
export function analyzeTransfers(params: TransferSearchParams): {
  singleTransfers: TransferSuggestion[];
  doubleTransfers: TransferSuggestion[];
  rollAdvice: { roll: boolean; reason: string };
  bestGain: number;
} {
  const singles = findBestSingleTransfers(params);
  const doubles = findBestDoubleTransfers(params);
  
  const bestSingleGain = singles[0]?.netGain || 0;
  const rollAdvice = shouldRollTransfer(bestSingleGain, params.freeTransfers);
  
  return {
    singleTransfers: singles,
    doubleTransfers: doubles,
    rollAdvice,
    bestGain: bestSingleGain,
  };
}