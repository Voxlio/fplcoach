// Projections Module: Calculate projected points per player per fixture
// Pure functions with tunable constants from config

import { CONFIG } from './config';
import type { Element, Fixture, Team } from './schemas';
import { POSITION } from './rules';

export interface PlayerProjection {
  playerId: number;
  gameweek: number;
  fixtureId: number | null;
  isHome: boolean;
  opponentId: number;
  projectedPoints: number;
  availability: number;
  minutesSecurity: number;
  attackFactor: number;
  defenceFactor: number;
  attackingPoints: number;
  cleanSheetPoints: number;
  appearancePoints: number;
  bonusPoints: number;
  epNext: number;
  blendedPoints: number;
}

export interface FixtureProjection {
  fixture: Fixture;
  homeTeamProjections: Map<number, PlayerProjection>; // playerId -> projection
  awayTeamProjections: Map<number, PlayerProjection>;
}

/**
 * Calculate availability based on status and chance of playing
 */
export function calculateAvailability(player: Element): number {
  // Status: a=available, d=doubtful, i=injured, s=suspended, u=unavailable, n=not in squad
  const injuredStatuses = ['i', 's', 'u', 'n'];
  if (injuredStatuses.includes(player.status)) {
    return CONFIG.PROJECTION.OWN_MODEL_WEIGHT * 0; // Will be 0 after multiplication
  }
  
  if (player.status === 'd' && player.chance_of_playing_next_round !== null) {
    return player.chance_of_playing_next_round / 100;
  }
  
  // For available players, use chance_of_playing_this_round if present, else 1
  if (player.chance_of_playing_this_round !== null) {
    return player.chance_of_playing_this_round / 100;
  }
  
  return 1.0;
}

/**
 * Calculate minutes security based on minutes played and starts
 */
export function calculateMinutesSecurity(player: Element, finishedGameweeks: number): number {
  if (finishedGameweeks === 0) {
    // Early season: use starts as proxy
    const appearances = player.starts + (player.minutes > 0 ? 1 : 0); // rough estimate
    if (appearances === 0) return 0.5; // Unknown
    return Math.min(player.starts / appearances, 1.0);
  }
  
  const expectedMinutes = 90 * finishedGameweeks;
  const minutesRatio = player.minutes / expectedMinutes;
  const startsRatio = player.starts / Math.max(finishedGameweeks, 1);
  
  // Blend minutes ratio with starts ratio (boost for regular starters)
  const security = (minutesRatio * 0.7) + (startsRatio * 0.3);
  
  return Math.min(Math.max(security, 0), CONFIG.PROJECTION.MINUTES_SECURITY_CAP);
}

/**
 * Calculate attack factor for a fixture
 */
export function calculateAttackFactor(
  player: Element,
  fixture: Fixture,
  teams: Map<number, Team>,
  leagueAvgAttackHome: number,
  leagueAvgAttackAway: number,
  leagueAvgDefenceHome: number,
  leagueAvgDefenceAway: number
): number {
  const isHome = fixture.team_h === player.team;
  const opponentId = isHome ? fixture.team_a : fixture.team_h;
  
  const ownTeam = teams.get(player.team);
  const oppTeam = teams.get(opponentId);
  
  if (!ownTeam || !oppTeam) return 1.0;
  
  // Own team attack strength for the venue
  const ownAttack = isHome ? ownTeam.strength_attack_home : ownTeam.strength_attack_away;
  
  // Opponent defence strength for the opposite venue
  const oppDefence = isHome ? oppTeam.strength_defence_away : oppTeam.strength_defence_home;
  
  // Normalise around league average
  const leagueAvgAttack = isHome ? leagueAvgAttackHome : leagueAvgAttackAway;
  const leagueAvgDefence = isHome ? leagueAvgDefenceAway : leagueAvgDefenceHome;
  
  const attackRatio = ownAttack / leagueAvgAttack;
  const defenceRatio = leagueAvgDefence / oppDefence; // Inverted: weaker defence = higher factor
  
  const factor = (attackRatio + defenceRatio) / 2;
  
  return Math.min(
    Math.max(factor, CONFIG.PROJECTION.ATTACK_FACTOR_CLAMP_MIN),
    CONFIG.PROJECTION.ATTACK_FACTOR_CLAMP_MAX
  );
}

/**
 * Calculate defence factor for a fixture (clean sheet probability)
 */
export function calculateDefenceFactor(
  player: Element,
  fixture: Fixture,
  teams: Map<number, Team>,
  leagueAvgAttackHome: number,
  leagueAvgAttackAway: number,
  leagueAvgDefenceHome: number,
  leagueAvgDefenceAway: number
): number {
  const isHome = fixture.team_h === player.team;
  const opponentId = isHome ? fixture.team_a : fixture.team_h;
  
  const ownTeam = teams.get(player.team);
  const oppTeam = teams.get(opponentId);
  
  if (!ownTeam || !oppTeam) return 1.0;
  
  // Own team defence strength for the venue
  const ownDefence = isHome ? ownTeam.strength_defence_home : ownTeam.strength_defence_away;
  
  // Opponent attack strength for the opposite venue
  const oppAttack = isHome ? oppTeam.strength_attack_away : oppTeam.strength_attack_home;
  
  // Normalise around league average
  const leagueAvgDefence = isHome ? leagueAvgDefenceHome : leagueAvgDefenceAway;
  const leagueAvgAttack = isHome ? leagueAvgAttackAway : leagueAvgAttackHome;
  
  const defenceRatio = ownDefence / leagueAvgDefence;
  const attackRatio = leagueAvgAttack / oppAttack; // Inverted: weaker attack = higher factor
  
  const factor = (defenceRatio + attackRatio) / 2;
  
  return Math.min(
    Math.max(factor, CONFIG.PROJECTION.DEFENCE_FACTOR_CLAMP_MIN),
    CONFIG.PROJECTION.DEFENCE_FACTOR_CLAMP_MAX
  );
}

/**
 * Calculate attacking points projection
 */
export function calculateAttackingPoints(
  player: Element,
  attackFactor: number,
  minutesSecurity: number
): number {
  const xG90 = parseFloat(player.expected_goals_per_90) || 0;
  const xA90 = parseFloat(player.expected_assists_per_90) || 0;
  
  // Goal points by position
  const goalPoints = {
    [POSITION.GK]: CONFIG.POINTS.GOAL_GK,
    [POSITION.DEF]: CONFIG.POINTS.GOAL_DEF,
    [POSITION.MID]: CONFIG.POINTS.GOAL_MID,
    [POSITION.FWD]: CONFIG.POINTS.GOAL_FWD,
  };
  
  const goalPts = goalPoints[player.element_type as keyof typeof goalPoints] || 0;
  
  // Base attacking points per 90
  const attackingPer90 = (xG90 * goalPts) + (xA90 * CONFIG.POINTS.ASSIST);
  
  // Set-piece bonus
  let setPieceBonus = 0;
  if (player.penalties_order === 1) setPieceBonus += 0.15; // Penalty taker
  if (player.direct_freekicks_order === 1) setPieceBonus += 0.08; // Direct FK taker
  if (player.corners_and_indirect_freekicks_order === 1) setPieceBonus += 0.05; // Corner taker
  
  const totalPer90 = attackingPer90 + setPieceBonus;
  
  // Scale by attack factor and minutes security
  return totalPer90 * attackFactor * minutesSecurity;
}

/**
 * Calculate clean sheet points projection
 */
export function calculateCleanSheetPoints(
  player: Element,
  defenceFactor: number,
  minutesSecurity: number
): number {
  const xGC90 = parseFloat(player.expected_goals_conceded_per_90) || 1.2; // Default if missing
  
  // Probability of clean sheet based on xGC (rough approximation)
  // xGC of 0.5 -> ~60% CS, xGC of 1.0 -> ~35% CS, xGC of 1.5 -> ~20% CS
  const csProb = Math.max(0, Math.min(1, 1.2 - (xGC90 * 0.5)));
  
  // Clean sheet points by position
  const csPoints = {
    [POSITION.GK]: CONFIG.POINTS.CLEAN_SHEET_GK,
    [POSITION.DEF]: CONFIG.POINTS.CLEAN_SHEET_DEF,
    [POSITION.MID]: CONFIG.POINTS.CLEAN_SHEET_MID,
    [POSITION.FWD]: 0,
  };
  
  const points = csPoints[player.element_type as keyof typeof csPoints] || 0;
  
  return csProb * points * defenceFactor * minutesSecurity;
}

/**
 * Calculate appearance points projection
 */
export function calculateAppearancePoints(
  player: Element,
  minutesSecurity: number
): number {
  // Probability of 60+ minutes
  const p60 = Math.min(minutesSecurity * 1.1, 1.0); // Slight boost for likely starters
  
  // Base appearance points
  let points = CONFIG.POINTS.APPEARANCE * p60;
  
  // Bonus allowance (rough average of 0.5 per game for starters)
  points += 0.5 * minutesSecurity;
  
  // Defensive contribution bonus for DEF/MID
  if (player.element_type === POSITION.DEF || player.element_type === POSITION.MID) {
    points += 0.15 * minutesSecurity; // Tackles, interceptions, clearances
  }
  
  return points;
}

/**
 * Calculate bonus points projection (simplified)
 */
export function calculateBonusPoints(player: Element, minutesSecurity: number): number {
  // ICT index is a good proxy for bonus potential
  const ict = parseFloat(player.ict_index) || 0;
  const maxIct = 150; // Rough max
  
  // Normalize and scale
  const bonusPotential = Math.min(ict / maxIct, 1.0) * CONFIG.POINTS.BONUS_MAX;
  
  return bonusPotential * minutesSecurity;
}

/**
 * Calculate league averages for normalization
 */
export function calculateLeagueAverages(teams: Team[]): {
  attackHome: number;
  attackAway: number;
  defenceHome: number;
  defenceAway: number;
} {
  const count = teams.length;
  return {
    attackHome: teams.reduce((sum, t) => sum + t.strength_attack_home, 0) / count,
    attackAway: teams.reduce((sum, t) => sum + t.strength_attack_away, 0) / count,
    defenceHome: teams.reduce((sum, t) => sum + t.strength_defence_home, 0) / count,
    defenceAway: teams.reduce((sum, t) => sum + t.strength_defence_away, 0) / count,
  };
}

/**
 * Project points for a player for a specific fixture
 */
export function projectPlayerForFixture(
  player: Element,
  fixture: Fixture,
  teams: Map<number, Team>,
  leagueAverages: ReturnType<typeof calculateLeagueAverages>,
  finishedGameweeks: number
): PlayerProjection {
  const availability = calculateAvailability(player);
  const minutesSecurity = calculateMinutesSecurity(player, finishedGameweeks);
  const attackFactor = calculateAttackFactor(player, fixture, teams, 
    leagueAverages.attackHome, leagueAverages.attackAway,
    leagueAverages.defenceHome, leagueAverages.defenceAway);
  const defenceFactor = calculateDefenceFactor(player, fixture, teams,
    leagueAverages.attackHome, leagueAverages.attackAway,
    leagueAverages.defenceHome, leagueAverages.defenceAway);
  
  const attackingPoints = calculateAttackingPoints(player, attackFactor, minutesSecurity);
  const cleanSheetPoints = calculateCleanSheetPoints(player, defenceFactor, minutesSecurity);
  const appearancePoints = calculateAppearancePoints(player, minutesSecurity);
  const bonusPoints = calculateBonusPoints(player, minutesSecurity);
  
  // Sum of model points
  const modelPoints = attackingPoints + cleanSheetPoints + appearancePoints + bonusPoints;
  
  // FPL's ep_next as sanity check
  const epNext = parseFloat(player.ep_next) || 0;
  
  // Blend: 70% own model, 30% FPL's ep_next
  const blendedPoints = (CONFIG.PROJECTION.OWN_MODEL_WEIGHT * modelPoints) + 
                        (CONFIG.PROJECTION.FPL_EP_NEXT_WEIGHT * epNext);
  
  // Apply availability
  const finalPoints = blendedPoints * availability;
  
  const isHome = fixture.team_h === player.team;
  
  return {
    playerId: player.id,
    gameweek: fixture.event || 0,
    fixtureId: fixture.id,
    isHome,
    opponentId: isHome ? fixture.team_a : fixture.team_h,
    projectedPoints: finalPoints,
    availability,
    minutesSecurity,
    attackFactor,
    defenceFactor,
    attackingPoints,
    cleanSheetPoints,
    appearancePoints,
    bonusPoints,
    epNext,
    blendedPoints,
  };
}

/**
 * Get all fixtures for a team in a gameweek (handles blanks and doubles)
 */
export function getTeamFixturesInGameweek(
  teamId: number,
  gameweek: number,
  fixtures: Fixture[]
): Fixture[] {
  return fixtures.filter(f => 
    f.event === gameweek && (f.team_h === teamId || f.team_a === teamId)
  );
}

/**
 * Project points for a player for a gameweek (sum of all fixtures)
 */
export function projectPlayerForGameweek(
  player: Element,
  gameweek: number,
  fixtures: Fixture[],
  teams: Map<number, Team>,
  leagueAverages: ReturnType<typeof calculateLeagueAverages>,
  finishedGameweeks: number
): PlayerProjection[] {
  const teamFixtures = getTeamFixturesInGameweek(player.team, gameweek, fixtures);
  
  if (teamFixtures.length === 0) {
    // Blank gameweek - return zero projection with availability info
    const availability = calculateAvailability(player);
    return [{
      playerId: player.id,
      gameweek,
      fixtureId: null,
      isHome: false,
      opponentId: 0,
      projectedPoints: 0,
      availability,
      minutesSecurity: 0,
      attackFactor: 1,
      defenceFactor: 1,
      attackingPoints: 0,
      cleanSheetPoints: 0,
      appearancePoints: 0,
      bonusPoints: 0,
      epNext: parseFloat(player.ep_next) || 0,
      blendedPoints: 0,
    }];
  }
  
  return teamFixtures.map(fixture => 
    projectPlayerForFixture(player, fixture, teams, leagueAverages, finishedGameweeks)
  );
}

/**
 * Project points for all players for the next N gameweeks
 */
export function projectAllPlayers(
  players: Element[],
  fixtures: Fixture[],
  teams: Team[],
  horizonGameweeks: number,
  finishedGameweeks: number
): Map<number, PlayerProjection[]> {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const leagueAverages = calculateLeagueAverages(teams);
  
  // Find current/next gameweek
  const currentGw = finishedGameweeks;
  const projectionGameweeks = Array.from(
    { length: horizonGameweeks }, 
    (_, i) => currentGw + 1 + i
  );
  
  const projections = new Map<number, PlayerProjection[]>();
  
  for (const player of players) {
    const allProjections: PlayerProjection[] = [];
    
    for (const gw of projectionGameweeks) {
      const gwProjections = projectPlayerForGameweek(
        player, gw, fixtures, teamMap, leagueAverages, finishedGameweeks
      );
      allProjections.push(...gwProjections);
    }
    
    projections.set(player.id, allProjections);
  }
  
  return projections;
}

/**
 * Get total projected points for a player over the horizon
 */
export function getTotalProjectedPoints(
  projections: PlayerProjection[],
  upcomingGameweek: number,
  horizonGameweeks: number
): { upcoming: number; horizon: number } {
  let upcoming = 0;
  let horizon = 0;
  
  for (const p of projections) {
    if (p.gameweek === upcomingGameweek) {
      upcoming += p.projectedPoints;
    }
    if (p.gameweek >= upcomingGameweek && p.gameweek < upcomingGameweek + horizonGameweeks) {
      horizon += p.projectedPoints;
    }
  }
  
  return { upcoming, horizon };
}