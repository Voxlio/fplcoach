// Best XI Module: Select optimal starting XI and bench order
// Brute-force all valid formations

import { CONFIG } from './config';
import type { Element, PlayerProjection } from './schemas';
import { POSITION, validateFormation, countByPosition } from './rules';

export interface BestXIResult {
  starters: Element[];
  bench: Element[];
  formation: string;
  totalProjectedPoints: number;
  captainId: number | null;
  viceCaptainId: number | null;
  flags: PlayerFlag[];
}

export interface PlayerFlag {
  playerId: number;
  type: 'injury' | 'doubt' | 'bad_fixture' | 'price_fall' | 'not_starting' | 'bench_only';
  message: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * Get projected points for a player for the upcoming gameweek
 */
export function getUpcomingProjection(
  player: Element,
  allProjections: Map<number, PlayerProjection[]>,
  upcomingGameweek: number
): number {
  const projections = allProjections.get(player.id) || [];
  const upcoming = projections.filter(p => p.gameweek === upcomingGameweek);
  return upcoming.reduce((sum, p) => sum + p.projectedPoints, 0);
}

/**
 * Check if a player is a starter (minutes security > threshold)
 */
function isLikelyStarter(player: Element, projections: PlayerProjection[]): boolean {
  const avgSecurity = projections.length > 0
    ? projections.reduce((sum, p) => sum + p.minutesSecurity, 0) / projections.length
    : 0;
  return avgSecurity >= CONFIG.AVAILABILITY.MINUTES_SECURITY_LOW;
}

/**
 * Generate problem flags for a player
 */
function generatePlayerFlags(
  player: Element,
  projections: PlayerProjection[],
  upcomingGameweek: number,
  transfersOutEvent: number
): PlayerFlag[] {
  const flags: PlayerFlag[] = [];
  const upcoming = projections.filter(p => p.gameweek === upcomingGameweek);
  
  // Injury/Doubt flag
  if (player.status === 'i' || player.status === 's' || player.status === 'u' || player.status === 'n') {
    flags.push({
      playerId: player.id,
      type: 'injury',
      message: player.news || `${player.web_name} is ${player.status}`,
      severity: 'high',
    });
  } else if (player.status === 'd' || (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 50)) {
    flags.push({
      playerId: player.id,
      type: 'doubt',
      message: player.news || `${player.web_name} is doubtful (${player.chance_of_playing_next_round}% chance)`,
      severity: 'high',
    });
  }
  
  // Bad fixture flag (upcoming gameweek)
  if (upcoming.length > 0) {
    const avgProjection = upcoming.reduce((sum, p) => sum + p.projectedPoints, 0) / upcoming.length;
    if (avgProjection < 2.0) {
      const opponentNames = upcoming.map(p => 
        p.isHome ? `vs ${p.opponentId}(A)` : `@ ${p.opponentId}(H)`
      ).join(', ');
      flags.push({
        playerId: player.id,
        type: 'bad_fixture',
        message: `Difficult fixture${upcoming.length > 1 ? 's' : ''}: ${opponentNames} (${avgProjection.toFixed(1)} xP)`,
        severity: 'medium',
      });
    }
  }
  
  // Price falling soon
  if (transfersOutEvent > 50000) { // High transfers out suggests price fall
    flags.push({
      playerId: player.id,
      type: 'price_fall',
      message: `High transfers out (${transfersOutEvent.toLocaleString()}) - price may fall`,
      severity: 'low',
    });
  }
  
  // Not starting
  if (!isLikelyStarter(player, projections)) {
    flags.push({
      playerId: player.id,
      type: 'not_starting',
      message: `Low minutes security - may not start`,
      severity: 'medium',
    });
  }
  
  // Bench only value
  const upcomingPoints = upcoming.reduce((sum, p) => sum + p.projectedPoints, 0);
  if (upcomingPoints < 1.5 && player.now_cost > 45) { // > 4.5m but low projection
    flags.push({
      playerId: player.id,
      type: 'bench_only',
      message: `Low projected points for cost - bench candidate`,
      severity: 'low',
    });
  }
  
  return flags;
}

/**
 * Find best starting XI by trying all valid formations
 */
export function findBestXI(
  squad: Element[],
  allProjections: Map<number, PlayerProjection[]>,
  upcomingGameweek: number
): BestXIResult {
  // Group players by position
  const byPosition = {
    [POSITION.GK]: squad.filter(p => p.element_type === POSITION.GK),
    [POSITION.DEF]: squad.filter(p => p.element_type === POSITION.DEF),
    [POSITION.MID]: squad.filter(p => p.element_type === POSITION.MID),
    [POSITION.FWD]: squad.filter(p => p.element_type === POSITION.FWD),
  };
  
  // Sort each position by projected points (descending)
  for (const pos of Object.values(byPosition)) {
    pos.sort((a, b) => {
      const aProj = getUpcomingProjection(a, allProjections, upcomingGameweek);
      const bProj = getUpcomingProjection(b, allProjections, upcomingGameweek);
      return bProj - aProj;
    });
  }
  
  let bestXI: Element[] = [];
  let bestBench: Element[] = [];
  let bestFormation = '';
  let bestPoints = -Infinity;
  let allFlags: PlayerFlag[] = [];
  
  // Try each valid formation
  for (const formation of CONFIG.FORMATION.validFormations) {
    // Check if we have enough players
    if (byPosition[POSITION.GK].length < formation.gk) continue;
    if (byPosition[POSITION.DEF].length < formation.def) continue;
    if (byPosition[POSITION.MID].length < formation.mid) continue;
    if (byPosition[POSITION.FWD].length < formation.fwd) continue;
    
    // Select starters: top N from each position by projection
    const starters = [
      ...byPosition[POSITION.GK].slice(0, formation.gk),
      ...byPosition[POSITION.DEF].slice(0, formation.def),
      ...byPosition[POSITION.MID].slice(0, formation.mid),
      ...byPosition[POSITION.FWD].slice(0, formation.fwd),
    ];
    
    // Bench is the rest
    const starterIds = new Set(starters.map(s => s.id));
    const bench = squad.filter(p => !starterIds.has(p.id));
    
    // Sort bench: GK first, then by projection
    bench.sort((a, b) => {
      if (a.element_type === POSITION.GK && b.element_type !== POSITION.GK) return -1;
      if (b.element_type === POSITION.GK && a.element_type !== POSITION.GK) return 1;
      const aProj = getUpcomingProjection(a, allProjections, upcomingGameweek);
      const bProj = getUpcomingProjection(b, allProjections, upcomingGameweek);
      return bProj - aProj;
    });
    
    // Validate formation
    const validation = validateFormation(starters);
    if (!validation.valid) continue;
    
    // Calculate total points
    const totalPoints = starters.reduce((sum, p) => {
      return sum + getUpcomingProjection(p, allProjections, upcomingGameweek);
    }, 0);
    
    if (totalPoints > bestPoints) {
      bestPoints = totalPoints;
      bestXI = starters;
      bestBench = bench;
      bestFormation = validation.formation || '';
      
      // Generate flags for this XI
      allFlags = [];
      for (const player of squad) {
        const proj = allProjections.get(player.id) || [];
        const transfersOut = player.transfers_out_event;
        allFlags.push(...generatePlayerFlags(player, proj, upcomingGameweek, transfersOut));
      }
    }
  }
  
  // If no valid formation found (shouldn't happen with valid squad), fallback
  if (bestXI.length === 0) {
    // Just take top 11 by projection
    const sorted = [...squad].sort((a, b) => 
      getUpcomingProjection(b, allProjections, upcomingGameweek) - 
      getUpcomingProjection(a, allProjections, upcomingGameweek)
    );
    bestXI = sorted.slice(0, 11);
    bestBench = sorted.slice(11);
    bestFormation = 'fallback';
  }
  
  return {
    starters: bestXI,
    bench: bestBench,
    formation: bestFormation,
    totalProjectedPoints: bestPoints,
    captainId: null, // Set by captain module
    viceCaptainId: null,
    flags: allFlags,
  };
}

/**
 * Get the best captain and vice-captain from starters
 */
export function selectCaptainAndVice(
  starters: Element[],
  allProjections: Map<number, PlayerProjection[]>,
  upcomingGameweek: number,
  teams: Map<number, { id: number; name: string; short_name: string }>,
  fixtures: Map<number, { id: number; kickoff_time: string; team_h: number; team_a: number }>
): { captainId: number; viceCaptainId: number; captainOptions: CaptainOption[] } {
  // Get top 3 by projected points
  const withProjections = starters.map(p => ({
    player: p,
    projection: getUpcomingProjection(p, allProjections, upcomingGameweek),
    fixture: getPlayerFixture(p, upcomingGameweek, fixtures),
  })).sort((a, b) => b.projection - a.projection);
  
  const top3 = withProjections.slice(0, 3);
  
  const captainOptions: CaptainOption[] = top3.map((opt, idx) => ({
    rank: idx + 1,
    playerId: opt.player.id,
    name: opt.player.web_name,
    team: teams.get(opt.player.team)?.short_name || '',
    fixture: opt.fixture ? formatFixture(opt.fixture, teams) : 'No fixture',
    projectedPoints: opt.projection,
    isCaptain: idx === 0,
    isViceCaptain: false,
  }));
  
  // Captain is top ranked
  const captainId = top3[0]?.player.id || starters[0]?.id || 0;
  
  // Vice-captain: best player from DIFFERENT club and DIFFERENT match
  let viceCaptainId = captainId;
  const captain = top3[0];
  const captainTeam = captain?.player.team;
  const captainFixtureId = captain?.fixture?.id;
  
  for (const opt of top3.slice(1)) {
    if (opt.player.team !== captainTeam && opt.fixture?.id !== captainFixtureId) {
      viceCaptainId = opt.player.id;
      // Mark as vice in options
      const vcOption = captainOptions.find(o => o.playerId === opt.player.id);
      if (vcOption) vcOption.isViceCaptain = true;
      break;
    }
  }
  
  // If no different club/match found, use second best
  if (viceCaptainId === captainId && top3.length > 1) {
    viceCaptainId = top3[1].player.id;
    const vcOption = captainOptions.find(o => o.playerId === top3[1].player.id);
    if (vcOption) vcOption.isViceCaptain = true;
  }
  
  return { captainId, viceCaptainId, captainOptions };
}

export interface CaptainOption {
  rank: number;
  playerId: number;
  name: string;
  team: string;
  fixture: string;
  projectedPoints: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

function getPlayerFixture(
  player: Element,
  gameweek: number,
  fixtures: Map<number, { id: number; kickoff_time: string; team_h: number; team_a: number }>
): { id: number; kickoff_time: string; team_h: number; team_a: number } | null {
  for (const fixture of fixtures.values()) {
    if ((fixture.team_h === player.team || fixture.team_a === player.team)) {
      return fixture;
    }
  }
  return null;
}

function formatFixture(
  fixture: { id: number; kickoff_time: string; team_h: number; team_a: number },
  teams: Map<number, { id: number; name: string; short_name: string }>
): string {
  const homeTeam = teams.get(fixture.team_h)?.short_name || fixture.team_h;
  const awayTeam = teams.get(fixture.team_a)?.short_name || fixture.team_a;
  const date = new Date(fixture.kickoff_time).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${homeTeam} vs ${awayTeam} (${date})`;
}