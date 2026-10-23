// Chips Advisory Module: Rule-based chip recommendations
// No predictions, only rules based on current squad state

import { CONFIG } from './config';
import type { Element } from './schemas';
import { PlayerProjection } from './projections';
import { BestXIResult, PlayerFlag } from './best-xi';

export interface ChipAdvice {
  wildcard: ChipRecommendation;
  freeHit: ChipRecommendation;
  benchBoost: ChipRecommendation;
  tripleCaptain: ChipRecommendation;
  summary: string;
}

export interface ChipRecommendation {
  recommended: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}

/**
 * Analyze squad for chip recommendations
 */
export function analyzeChips(
  squad: Element[],
  bestXI: BestXIResult,
  projections: Map<number, PlayerProjection[]>,
  upcomingGameweek: number,
  horizonGameweeks: number,
  fixtures: Map<number, { team_h: number; team_a: number; finished: boolean }>,
  teams: Map<number, { short_name: string }>
): ChipAdvice {
  // Count problem starters
  const starterIds = new Set(bestXI.starters.map(p => p.id));
  const problemStarters = bestXI.starters.filter(p => {
    const flags = bestXI.flags.filter(f => f.playerId === p.id && f.severity === 'high');
    return flags.length > 0;
  });
  
  // Count blank gameweek players in squad
  let blankPlayers = 0;
  for (const player of squad) {
    const proj = projections.get(player.id) || [];
    const upcoming = proj.filter(p => p.gameweek === upcomingGameweek);
    if (upcoming.length === 0 || upcoming.every(p => p.fixtureId === null)) {
      blankPlayers++;
    }
  }
  
  // Calculate bench projection sum
  let benchProjection = 0;
  for (const player of bestXI.bench) {
    const proj = projections.get(player.id) || [];
    const upcoming = proj.filter(p => p.gameweek === upcomingGameweek);
    benchProjection += upcoming.reduce((sum, p) => sum + p.projectedPoints, 0);
  }
  
  // Check for double gameweek captain candidate
  let hasDoubleGameweekCaptain = false;
  let bestCaptainProjection = 0;
  for (const player of bestXI.starters) {
    const proj = projections.get(player.id) || [];
    const upcoming = proj.filter(p => p.gameweek === upcomingGameweek);
    const total = upcoming.reduce((sum, p) => sum + p.projectedPoints, 0);
    if (total > bestCaptainProjection) {
      bestCaptainProjection = total;
    }
    if (upcoming.length >= 2) {
      hasDoubleGameweekCaptain = true;
    }
  }
  
  // Wildcard: 4+ problem starters
  const wildcard: ChipRecommendation = {
    recommended: problemStarters.length >= CONFIG.CHIPS.WILDCARD_PROBLEM_STARTERS,
    reason: problemStarters.length >= CONFIG.CHIPS.WILDCARD_PROBLEM_STARTERS
      ? `${problemStarters.length} starters have serious issues (injury, doubt, or terrible fixtures). Wildcard allows a full rebuild.`
      : `Only ${problemStarters.length} problem starters. Wildcard not needed yet.`,
    confidence: problemStarters.length >= CONFIG.CHIPS.WILDCARD_PROBLEM_STARTERS ? 'high' : 'low',
    details: problemStarters.map(p => `${p.web_name}: ${bestXI.flags.find(f => f.playerId === p.id)?.message}`).join('; '),
  };
  
  // Free Hit: Many blank gameweek players
  const freeHit: ChipRecommendation = {
    recommended: blankPlayers >= CONFIG.CHIPS.FREE_HIT_BLANK_PLAYERS,
    reason: blankPlayers >= CONFIG.CHIPS.FREE_HIT_BLANK_PLAYERS
      ? `${blankPlayers} players have blank gameweeks. Free Hit lets you field 11 players for one week only.`
      : `Only ${blankPlayers} blank gameweek players. Free Hit not needed.`,
    confidence: blankPlayers >= CONFIG.CHIPS.FREE_HIT_BLANK_PLAYERS ? 'medium' : 'low',
    details: `${blankPlayers}/${squad.length} players blank in GW${upcomingGameweek}.`,
  };
  
  // Bench Boost: High bench projection
  const benchBoost: ChipRecommendation = {
    recommended: benchProjection >= CONFIG.CHIPS.BENCH_BOOST_MIN_BENCH_XP,
    reason: benchProjection >= CONFIG.CHIPS.BENCH_BOOST_MIN_BENCH_XP
      ? `Bench projected ${benchProjection.toFixed(1)} points. Bench Boost counts all 15 players.`
      : `Bench only projected ${benchProjection.toFixed(1)} points (threshold: ${CONFIG.CHIPS.BENCH_BOOST_MIN_BENCH_XP}). Not worth Bench Boost.`,
    confidence: benchProjection >= CONFIG.CHIPS.BENCH_BOOST_MIN_BENCH_XP ? 'medium' : 'low',
    details: `Bench xP: ${benchProjection.toFixed(1)}. Threshold: ${CONFIG.CHIPS.BENCH_BOOST_MIN_BENCH_XP}.`,
  };
  
  // Triple Captain: Premium captain with double GW or very high projection
  const tripleCaptain: ChipRecommendation = {
    recommended: hasDoubleGameweekCaptain || bestCaptainProjection >= CONFIG.CHIPS.TRIPLE_CAPTAIN_MIN_PROJECTION,
    reason: hasDoubleGameweekCaptain
      ? `Captain has a double gameweek. Triple Captain maximizes a premium asset's haul.`
      : bestCaptainProjection >= CONFIG.CHIPS.TRIPLE_CAPTAIN_MIN_PROJECTION
        ? `Captain projected ${bestCaptainProjection.toFixed(1)} points. Triple Captain could yield massive returns.`
        : `Best captain projected ${bestCaptainProjection.toFixed(1)} points (threshold: ${CONFIG.CHIPS.TRIPLE_CAPTAIN_MIN_PROJECTION}). No clear Triple Captain candidate.`,
    confidence: (hasDoubleGameweekCaptain || bestCaptainProjection >= CONFIG.CHIPS.TRIPLE_CAPTAIN_MIN_PROJECTION) ? 'medium' : 'low',
    details: `Best starter xP: ${bestCaptainProjection.toFixed(1)}. Double GW: ${hasDoubleGameweekCaptain ? 'Yes' : 'No'}.`,
  };
  
  // Summary
  const recommendedChips = [wildcard, freeHit, benchBoost, tripleCaptain].filter(c => c.recommended);
  let summary: string;
  
  if (recommendedChips.length === 0) {
    summary = 'No chip recommended this week.';
  } else if (recommendedChips.length === 1) {
    const chip = recommendedChips[0];
    const chipName = chip === wildcard ? 'Wildcard' : chip === freeHit ? 'Free Hit' : chip === benchBoost ? 'Bench Boost' : 'Triple Captain';
    summary = `Recommendation: Play ${chipName}. ${chip.reason}`;
  } else {
    const names = recommendedChips.map(c => 
      c === wildcard ? 'Wildcard' : c === freeHit ? 'Free Hit' : c === benchBoost ? 'Bench Boost' : 'Triple Captain'
    ).join(', ');
    summary = `Multiple chips viable: ${names}. Choose based on your strategy.`;
  }
  
  return {
    wildcard,
    freeHit,
    benchBoost,
    tripleCaptain,
    summary,
  };
}

/**
 * Check if a chip has already been used this season
 */
export function getUsedChips(entryHistory: Array<{ event: number; chip: string }>): Set<string> {
  const used = new Set<string>();
  for (const h of entryHistory) {
    if (h.chip && h.chip !== 'none') {
      used.add(h.chip);
    }
  }
  return used;
}

/**
 * Filter chip advice to only show available chips
 */
export function filterAvailableChips(
  advice: ChipAdvice,
  usedChips: Set<string>
): ChipAdvice {
  const chipMap: Record<string, Exclude<keyof ChipAdvice, 'summary'>> = {
    wildcard: 'wildcard',
    freehit: 'freeHit',
    bboost: 'benchBoost',
    '3xc': 'tripleCaptain',
  };
  
  const result: ChipAdvice = {
    wildcard: { ...advice.wildcard },
    freeHit: { ...advice.freeHit },
    benchBoost: { ...advice.benchBoost },
    tripleCaptain: { ...advice.tripleCaptain },
    summary: advice.summary,
  };
  
  for (const [chipKey, adviceKey] of Object.entries(chipMap)) {
    if (usedChips.has(chipKey)) {
      const current = result[adviceKey];
      result[adviceKey] = {
        recommended: false,
        reason: `${chipKey} already used this season.`,
        confidence: 'low',
        details: current.details,
      };
    }
  }
  
  // Update summary
  const availableRecommended = [result.wildcard, result.freeHit, result.benchBoost, result.tripleCaptain]
    .filter(c => c.recommended && !usedChips.has(
      c === result.wildcard ? 'wildcard' :
      c === result.freeHit ? 'freehit' :
      c === result.benchBoost ? 'bboost' : '3xc'
    ));
  
  if (availableRecommended.length === 0) {
    result.summary = 'No chip recommended this week (or all recommended chips already used).';
  }
  
  return result;
}