// Main Analysis Module: Orchestrates all sub-modules for team analysis
// This is the entry point for the API route

import { CONFIG } from './config';
import {
  getBootstrapStatic,
  getFixtures,
  getEntry,
  getPicks,
  getTransfers,
  getRelevantGameweek,
  clearCache,
} from './fpl-client';
import { validateSquadComposition, validateBudget, POSITION } from './rules';
import { calculateAllPrices, type PlayerPrice } from './pricing';
import {
  projectAllPlayers,
  type PlayerProjection,
  getTotalProjectedPoints,
} from './projections';
import { findBestXI, selectCaptainAndVice, type BestXIResult, type CaptainOption } from './best-xi';
import { analyzeTransfers, type TransferSuggestion } from './transfers';
import { analyzeChips, filterAvailableChips, getUsedChips, type ChipAdvice } from './chips';
import type { Element, Fixture, Team, Entry, Transfer } from './schemas';

export interface TeamAnalysisInput {
  entryId: number;
  freeTransfers?: number;
  bank?: number; // User override, in tenths of millions
  horizonGameweeks?: number;
  bypassCache?: boolean;
}

export interface TeamAnalysisOutput {
  entry: Entry;
  gameweek: number;
  deadline: string;
  deadlineEpoch: number;
  squad: EnrichedPlayer[];
  bestXI: BestXIResult;
  captain: {
    captainId: number;
    viceCaptainId: number;
    options: CaptainOption[];
  };
  transfers: {
    single: TransferSuggestion[];
    double: TransferSuggestion[];
    rollAdvice: { roll: boolean; reason: string };
    bestGain: number;
  };
  chips: ChipAdvice;
  prices: PlayerPrice[];
  bank: number;
  totalValue: number;
  freeTransfers: number;
  flags: Map<number, string[]>; // playerId -> flag messages
}

export interface EnrichedPlayer extends Element {
  projectedPoints: number;
  horizonPoints: number;
  sellingPrice: number;
  purchasePrice: number;
  flags: string[];
  isStarter: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface FixtureInfo {
  id: number;
  kickoff_time: string;
  team_h: number;
  team_a: number;
  finished: boolean;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

/**
 * Main analysis function
 */
export async function analyzeTeam(input: TeamAnalysisInput): Promise<TeamAnalysisOutput> {
  const {
    entryId,
    freeTransfers = 1,
    bank: userBank,
    horizonGameweeks = CONFIG.TRANSFER.HORIZON_GAMEWEEKS,
    bypassCache = false,
  } = input;
  
  // Fetch all required data in parallel
  const [bootstrap, fixtures, entry, transfers] = await Promise.all([
    getBootstrapStatic(bypassCache),
    getFixtures(bypassCache),
    getEntry(entryId, bypassCache),
    getTransfers(entryId, bypassCache),
  ]);
  
  // Determine relevant gameweek
  const relevantGw = getRelevantGameweek(bootstrap.events);
  const gameweek = relevantGw.id;
  const deadline = relevantGw.deadline_time;
  const deadlineEpoch = relevantGw.deadline_time_epoch;
  const finishedGameweeks = bootstrap.events.filter(e => e.finished).length;
  
  // Get picks for this gameweek
  const picksResponse = await getPicks(entryId, gameweek, bypassCache);
  const picks = picksResponse.picks;
  const entryHistory = picksResponse.entry_history;
  const activeChip = picksResponse.active_chip;
  
  // Use API bank if user didn't provide override
  const bank = userBank ?? entryHistory.bank;
  const totalValue = entryHistory.value;
  
  // Build squad from picks
  const elementMap = new Map(bootstrap.elements.map(e => [e.id, e]));
  const squad: Element[] = picks.map(pick => {
    const element = elementMap.get(pick.element);
    if (!element) throw new Error(`Player ${pick.element} not found in bootstrap`);
    return { ...element, pickPosition: pick.position, isCaptain: pick.is_captain, isViceCaptain: pick.is_vice_captain };
  });
  
  // Validate squad
  const squadValidation = validateSquadComposition(squad);
  if (!squadValidation.valid) {
    console.warn('Squad validation warnings:', squadValidation.errors);
  }
  
  // Validate budget
  const budgetValidation = validateBudget(squad, bank, totalValue);
  if (!budgetValidation.valid) {
    console.warn('Budget validation warnings:', budgetValidation.errors);
  }
  
  // Calculate prices
  const prices = calculateAllPrices(squad, transfers);
  const priceMap = new Map(prices.map(p => [p.playerId, { purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice }]));
  
  // Project all players (including all FPL players for transfer search)
  const allProjections = projectAllPlayers(
    bootstrap.elements,
    fixtures,
    bootstrap.teams,
    horizonGameweeks,
    finishedGameweeks
  );
  
  // Find best XI
  const bestXI = findBestXI(squad, allProjections, gameweek);
  
  // Build fixture and team maps for captain selection
  const fixtureMap = new Map<number, FixtureInfo>(
    fixtures
      .filter(f => f.event === gameweek)
      .map(f => [f.id, {
        id: f.id,
        kickoff_time: f.kickoff_time,
        team_h: f.team_h,
        team_a: f.team_a,
        finished: f.finished,
        team_h_difficulty: f.team_h_difficulty,
        team_a_difficulty: f.team_a_difficulty,
      }])
  );
  
  const teamMap = new Map(bootstrap.teams.map(t => [t.id, { id: t.id, name: t.name, short_name: t.short_name }]));
  
  // Select captain and vice-captain
  const { captainId, viceCaptainId, captainOptions } = selectCaptainAndVice(
    bestXI.starters,
    allProjections,
    gameweek,
    teamMap,
    fixtureMap
  );
  
  // Update bestXI with captain info
  bestXI.captainId = captainId;
  bestXI.viceCaptainId = viceCaptainId;
  
  // Analyze transfers
  const transferAnalysis = analyzeTransfers({
    squad,
    allPlayers: bootstrap.elements,
    projections: allProjections,
    prices: priceMap,
    bank,
    freeTransfers,
    upcomingGameweek: gameweek,
    horizonGameweeks,
  });
  
  // Analyze chips
  // Build fixtures map for chip analysis
  const chipFixtureMap = new Map(fixtures.map(f => [f.id, { team_h: f.team_h, team_a: f.team_a, finished: f.finished }]));
  const chipTeamMap = new Map(bootstrap.teams.map(t => [t.id, { short_name: t.short_name }]));
  
  let chipsAdvice = analyzeChips(
    squad,
    bestXI,
    allProjections,
    gameweek,
    horizonGameweeks,
    chipFixtureMap,
    chipTeamMap
  );
  
  // Filter out used chips (entry doesn't have history, would need separate API call)
  const usedChips = getUsedChips([]);
  chipsAdvice = filterAvailableChips(chipsAdvice, usedChips);
  
  // Build enriched squad for UI
  const starterIds = new Set(bestXI.starters.map(p => p.id));
  const enrichedSquad: EnrichedPlayer[] = squad.map(player => {
    const priceInfo = priceMap.get(player.id);
    const projections = allProjections.get(player.id) || [];
    const { upcoming, horizon } = getTotalProjectedPoints(projections, gameweek, horizonGameweeks);
    
    const playerFlags = bestXI.flags
      .filter(f => f.playerId === player.id)
      .map(f => f.message);
    
    return {
      ...player,
      projectedPoints: upcoming,
      horizonPoints: horizon,
      sellingPrice: priceInfo?.sellingPrice || player.now_cost,
      purchasePrice: priceInfo?.purchasePrice || player.now_cost,
      flags: playerFlags,
      isStarter: starterIds.has(player.id),
      isCaptain: player.id === captainId,
      isViceCaptain: player.id === viceCaptainId,
    };
  });
  
  // Sort: starters first (by position order), then bench
  enrichedSquad.sort((a, b) => {
    if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
    // Position order: GK, DEF, MID, FWD
    const posOrder = { 1: 0, 2: 1, 3: 2, 4: 3 };
    const aPos = posOrder[a.element_type as keyof typeof posOrder] || 99;
    const bPos = posOrder[b.element_type as keyof typeof posOrder] || 99;
    if (aPos !== bPos) return aPos - bPos;
    return b.projectedPoints - a.projectedPoints;
  });
  
  // Build flags map
  const flagsMap = new Map<number, string[]>();
  for (const player of enrichedSquad) {
    if (player.flags.length > 0) {
      flagsMap.set(player.id, player.flags);
    }
  }
  
  return {
    entry,
    gameweek,
    deadline,
    deadlineEpoch,
    squad: enrichedSquad,
    bestXI,
    captain: { captainId, viceCaptainId, options: captainOptions },
    transfers: {
      single: transferAnalysis.singleTransfers,
      double: transferAnalysis.doubleTransfers,
      rollAdvice: transferAnalysis.rollAdvice,
      bestGain: transferAnalysis.bestGain,
    },
    chips: chipsAdvice,
    prices,
    bank,
    totalValue,
    freeTransfers,
    flags: flagsMap,
  };
}

/**
 * Search players for the Players tab
 */
export async function searchPlayers(params: {
  position?: number;
  maxPrice?: number;
  minPrice?: number;
  team?: number;
  sort?: 'xp' | 'horizon' | 'price' | 'form' | 'total';
  gameweek?: number;
  horizonGameweeks?: number;
  bypassCache?: boolean;
}): Promise<Element[]> {
  const [bootstrap, fixtures] = await Promise.all([
    getBootstrapStatic(params.bypassCache),
    getFixtures(params.bypassCache),
  ]);
  
  let players = bootstrap.elements;
  
  if (params.position) {
    players = players.filter(p => p.element_type === params.position);
  }
  
  if (params.maxPrice) {
    players = players.filter(p => p.now_cost <= params.maxPrice! * 10);
  }
  
  if (params.minPrice) {
    players = players.filter(p => p.now_cost >= params.minPrice! * 10);
  }
  
  if (params.team) {
    players = players.filter(p => p.team === params.team);
  }
  
  // Filter out unavailable
  players = players.filter(p => p.status === 'a' || p.status === 'd');
  
  // Project points if gameweek provided
  if (params.gameweek) {
    const horizon = params.horizonGameweeks || CONFIG.TRANSFER.HORIZON_GAMEWEEKS;
    const finishedGameweeks = bootstrap.events.filter(e => e.finished).length;
    const allProjections = projectAllPlayers(players, fixtures, bootstrap.teams, horizon, finishedGameweeks);
    
    // Add projected points to each player
    const playersWithXP = players.map(p => {
      const projections = allProjections.get(p.id) || [];
      const { upcoming, horizon: horizonPoints } = getTotalProjectedPoints(projections, params.gameweek!, horizon);
      return { ...p, _projectedUpcoming: upcoming, _projectedHorizon: horizonPoints };
    });
    
    // Sort
    switch (params.sort) {
      case 'xp':
        playersWithXP.sort((a, b) => b._projectedUpcoming - a._projectedUpcoming);
        break;
      case 'horizon':
        playersWithXP.sort((a, b) => b._projectedHorizon - a._projectedHorizon);
        break;
      case 'price':
        playersWithXP.sort((a, b) => b.now_cost - a.now_cost);
        break;
      case 'form':
        playersWithXP.sort((a, b) => parseFloat(b.form) - parseFloat(a.form));
        break;
      case 'total':
        playersWithXP.sort((a, b) => b.total_points - a.total_points);
        break;
    }
    
    return playersWithXP;
  }
  
  // Default sort by total points
  players.sort((a, b) => b.total_points - a.total_points);
  
  return players;
}