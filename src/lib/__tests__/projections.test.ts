// Unit tests for Projections Module

import {
  calculateAvailability,
  calculateMinutesSecurity,
  calculateAttackFactor,
  calculateDefenceFactor,
  calculateAttackingPoints,
  calculateCleanSheetPoints,
  calculateAppearancePoints,
  calculateBonusPoints,
  calculateLeagueAverages,
  projectPlayerForFixture,
  projectPlayerForGameweek,
  projectAllPlayers,
  getTotalProjectedPoints,
} from '../projections';
import type { Element, Fixture, Team } from '../schemas';
import { createMockPlayer, mockTeams, mockFixtures } from './fixtures';

describe('Projections Module', () => {
  describe('calculateAvailability', () => {
    it('should return 0 for injured status', () => {
      const player = createMockPlayer({ status: 'i' });
      expect(calculateAvailability(player)).toBe(0);
    });

    it('should return 0 for suspended status', () => {
      const player = createMockPlayer({ status: 's' });
      expect(calculateAvailability(player)).toBe(0);
    });

    it('should return 0 for unavailable status', () => {
      const player = createMockPlayer({ status: 'u' });
      expect(calculateAvailability(player)).toBe(0);
    });

    it('should return 0 for not in squad status', () => {
      const player = createMockPlayer({ status: 'n' });
      expect(calculateAvailability(player)).toBe(0);
    });

    it('should return chance_of_playing/100 for doubtful', () => {
      const player = createMockPlayer({ status: 'd', chance_of_playing_next_round: 75 });
      expect(calculateAvailability(player)).toBe(0.75);
    });

    it('should return 1 for available player with no chance data', () => {
      const player = createMockPlayer({ status: 'a', chance_of_playing_next_round: null, chance_of_playing_this_round: null });
      expect(calculateAvailability(player)).toBe(1.0);
    });

    it('should use chance_of_playing_this_round when available', () => {
      const player = createMockPlayer({ status: 'a', chance_of_playing_this_round: 80 });
      expect(calculateAvailability(player)).toBe(0.8);
    });
  });

  describe('calculateMinutesSecurity', () => {
    it('should return 0.5 for player with no minutes early season', () => {
      const player = createMockPlayer({ minutes: 0, starts: 0 });
      expect(calculateMinutesSecurity(player, 0)).toBe(0.5);
    });

    it('should calculate security based on starts early season', () => {
      const player = createMockPlayer({ minutes: 90, starts: 1 }); // 1 start in 1 game
      expect(calculateMinutesSecurity(player, 0)).toBe(0.5);
    });

    it('should calculate security based on minutes ratio', () => {
      const player = createMockPlayer({ minutes: 900, starts: 10 }); // 10 games, 900 mins
      const security = calculateMinutesSecurity(player, 10); // 10 finished GWs
      // expectedMinutes = 900, minutesRatio = 1.0, startsRatio = 1.0
      // security = 0.7*1.0 + 0.3*1.0 = 1.0
      expect(security).toBe(1.0);
    });

    it('should cap security at 1.0', () => {
      const player = createMockPlayer({ minutes: 2000, starts: 25 }); // More than possible
      const security = calculateMinutesSecurity(player, 20);
      expect(security).toBe(1.0);
    });

    it('should return low security for rotation player', () => {
      const player = createMockPlayer({ minutes: 450, starts: 5 }); // 10 games, 450 mins
      const security = calculateMinutesSecurity(player, 10);
      // expectedMinutes = 900, minutesRatio = 0.5, startsRatio = 0.5
      // security = 0.7*0.5 + 0.3*0.5 = 0.5
      expect(security).toBeCloseTo(0.5, 1);
    });
  });

  describe('calculateLeagueAverages', () => {
    it('should calculate correct averages', () => {
      const teams = mockTeams;
      const averages = calculateLeagueAverages(teams);
      
      // Attack home: (4+3+3+3+4+2+2+3+5+5)/10 = 34/10 = 3.4
      expect(averages.attackHome).toBe(3.4);
      // Attack away: (4+3+2+3+3+2+2+2+5+5)/10 = 31/10 = 3.1
      expect(averages.attackAway).toBe(3.1);
      // Defence home: (4+3+3+3+4+3+3+3+4+5)/10 = 35/10 = 3.5
      expect(averages.defenceHome).toBe(3.5);
      // Defence away: (4+3+3+3+3+2+2+3+4+4)/10 = 31/10 = 3.1
      expect(averages.defenceAway).toBe(3.1);
    });
  });

  describe('calculateAttackFactor', () => {
    const teams = new Map(mockTeams.map(t => [t.id, t]));
    const averages = calculateLeagueAverages(mockTeams);

    it('should calculate factor for home fixture', () => {
      const player = createMockPlayer({ team: 1 }); // Arsenal (attack_home: 4)
      const fixture = mockFixtures[0]; // ARS vs AVL (team_h=1, team_a=2)
      
      const factor = calculateAttackFactor(player, fixture, teams, 
        averages.attackHome, averages.attackAway, averages.defenceHome, averages.defenceAway);
      
      // Arsenal attack_home = 4, league avg attack_home = 3.4 -> ratio = 4/3.4 = 1.176
      // AVL defence_away = 3, league avg defence_away = 3.1 -> ratio = 3.1/3 = 1.033
      // factor = (1.176 + 1.033)/2 = 1.105
      expect(factor).toBeCloseTo(1.1, 1);
    });

    it('should calculate factor for away fixture', () => {
      const player = createMockPlayer({ team: 2 }); // Aston Villa (attack_away: 3)
      const fixture = mockFixtures[0]; // ARS vs AVL (team_h=1, team_a=2)
      
      const factor = calculateAttackFactor(player, fixture, teams,
        averages.attackHome, averages.attackAway, averages.defenceHome, averages.defenceAway);
      
      // AVL attack_away = 3, league avg attack_away = 3.1 -> ratio = 3/3.1 = 0.968
      // ARS defence_home = 4, league avg defence_home = 3.5 -> ratio = 3.5/4 = 0.875
      // factor = (0.968 + 0.875)/2 = 0.921 -> clamped to 0.921 (within 0.6-1.5)
      expect(factor).toBeCloseTo(0.92, 2);
    });

    it('should clamp factor to max 1.5', () => {
      const strongTeam: Team = { id: 99, name: 'Super', short_name: 'SUP', strength: 5, strength_attack_home: 5, strength_attack_away: 5, strength_defence_home: 5, strength_defence_away: 5 };
      const weakTeam: Team = { id: 98, name: 'Weak', short_name: 'WEA', strength: 1, strength_attack_home: 1, strength_attack_away: 1, strength_defence_home: 1, strength_defence_away: 1 };
      const teamsMap = new Map([[99, strongTeam], [98, weakTeam]]);
      const avg = { attackHome: 3, attackAway: 3, defenceHome: 3, defenceAway: 3 };
      
      const player = createMockPlayer({ team: 99 });
      const fixture = { ...mockFixtures[0], team_h: 99, team_a: 98 };
      
      const factor = calculateAttackFactor(player, fixture, teamsMap, avg.attackHome, avg.attackAway, avg.defenceHome, avg.defenceAway);
      
      expect(factor).toBe(1.5); // Clamped
    });

    it('should clamp factor to min 0.6', () => {
      const strongTeam: Team = { id: 99, name: 'Super', short_name: 'SUP', strength: 5, strength_attack_home: 5, strength_attack_away: 5, strength_defence_home: 5, strength_defence_away: 5 };
      const weakTeam: Team = { id: 98, name: 'Weak', short_name: 'WEA', strength: 1, strength_attack_home: 1, strength_attack_away: 1, strength_defence_home: 1, strength_defence_away: 1 };
      const teamsMap = new Map([[99, strongTeam], [98, weakTeam]]);
      const avg = { attackHome: 3, attackAway: 3, defenceHome: 3, defenceAway: 3 };
      
      const player = createMockPlayer({ team: 98 });
      const fixture = { ...mockFixtures[0], team_h: 99, team_a: 98 };
      
      const factor = calculateAttackFactor(player, fixture, teamsMap, avg.attackHome, avg.attackAway, avg.defenceHome, avg.defenceAway);
      
      expect(factor).toBe(0.6); // Clamped
    });
  });

  describe('calculateDefenceFactor', () => {
    const teams = new Map(mockTeams.map(t => [t.id, t]));
    const averages = calculateLeagueAverages(mockTeams);

    it('should calculate defence factor for home fixture', () => {
      const player = createMockPlayer({ team: 1, element_type: 2 }); // Arsenal defender
      const fixture = mockFixtures[0]; // ARS vs AVL
      
      const factor = calculateDefenceFactor(player, fixture, teams,
        averages.attackHome, averages.attackAway, averages.defenceHome, averages.defenceAway);
      
      // Arsenal defence_home = 4, league avg = 3.5 -> ratio = 4/3.5 = 1.143
      // AVL attack_away = 3, league avg = 3.1 -> ratio = 3.1/3 = 1.033
      // factor = (1.143 + 1.033)/2 = 1.088
      expect(factor).toBeCloseTo(1.09, 2);
    });
  });

  describe('calculateAttackingPoints', () => {
    it('should calculate attacking points for midfielder', () => {
      const player = createMockPlayer({ 
        element_type: 3, // MID
        expected_goals_per_90: '0.30',
        expected_assists_per_90: '0.20',
        penalties_order: 1,
      });
      
      const points = calculateAttackingPoints(player, 1.0, 1.0);
      
      // xG * 5 + xA * 3 = 0.30 * 5 + 0.20 * 3 = 1.5 + 0.6 = 2.1
      // Penalty bonus = 0.15
      // Total per 90 = 2.25
      // With factor 1.0 and security 1.0 = 2.25
      expect(points).toBeCloseTo(2.25, 2);
    });

    it('should calculate attacking points for forward', () => {
      const player = createMockPlayer({ 
        element_type: 4, // FWD
        expected_goals_per_90: '0.50',
        expected_assists_per_90: '0.10',
      });
      
      const points = calculateAttackingPoints(player, 1.0, 1.0);
      
      // xG * 4 + xA * 3 = 0.50 * 4 + 0.10 * 3 = 2.0 + 0.3 = 2.3
      expect(points).toBeCloseTo(2.3, 1);
    });

    it('should scale with attack factor and minutes security', () => {
      const player = createMockPlayer({ 
        element_type: 3,
        expected_goals_per_90: '0.30',
        expected_assists_per_90: '0.20',
      });
      
      const points = calculateAttackingPoints(player, 1.2, 0.8);
      
      // Base = 2.1, with factor 1.2 and security 0.8 = 2.1 * 1.2 * 0.8 = 2.016
      expect(points).toBeCloseTo(2.016, 2);
    });
  });

  describe('calculateCleanSheetPoints', () => {
    it('should calculate CS points for defender', () => {
      const player = createMockPlayer({ 
        element_type: 2, // DEF
        expected_goals_conceded_per_90: '0.8',
      });
      
      const points = calculateCleanSheetPoints(player, 1.0, 1.0);
      
      // csProb = 1.2 - 0.8*0.5 = 0.8
      // CS points for DEF = 4
      // 0.8 * 4 * 1.0 * 1.0 = 3.2
      expect(points).toBeCloseTo(3.2, 1);
    });

    it('should calculate CS points for midfielder', () => {
      const player = createMockPlayer({ 
        element_type: 3, // MID
        expected_goals_conceded_per_90: '0.8',
      });
      
      const points = calculateCleanSheetPoints(player, 1.0, 1.0);
      
      // csProb = 0.8
      // CS points for MID = 1
      // 0.8 * 1 = 0.8
      expect(points).toBeCloseTo(0.8, 1);
    });

    it('should return 0 for forward', () => {
      const player = createMockPlayer({ element_type: 4 });
      const points = calculateCleanSheetPoints(player, 1.0, 1.0);
      expect(points).toBe(0);
    });
  });

  describe('calculateAppearancePoints', () => {
    it('should give appearance points for likely starter', () => {
      const player = createMockPlayer({ element_type: 3 });
      const points = calculateAppearancePoints(player, 1.0);
      
      // 2 * 1.0 (p60) + 0.5 * 1.0 (bonus) + 0.15 * 1.0 (def bonus for MID) = 2.65
      expect(points).toBeCloseTo(2.65, 2);
    });

    it('should give fewer points for rotation player', () => {
      const player = createMockPlayer({ element_type: 3 });
      const points = calculateAppearancePoints(player, 0.5);
      
      // 2 * 0.55 + 0.5 * 0.5 + 0.15 * 0.5 = 1.1 + 0.25 + 0.075 = 1.425
      expect(points).toBeCloseTo(1.425, 2);
    });
  });

  describe('calculateBonusPoints', () => {
    it('should calculate bonus based on ICT index', () => {
      const player = createMockPlayer({ ict_index: '100.0' });
      const points = calculateBonusPoints(player, 1.0);
      
      // 100/150 * 3 = 2.0
      expect(points).toBeCloseTo(2.0, 1);
    });

    it('should cap bonus at max', () => {
      const player = createMockPlayer({ ict_index: '200.0' });
      const points = calculateBonusPoints(player, 1.0);
      
      // min(200/150, 1) * 3 = 3.0
      expect(points).toBe(3.0);
    });
  });

  describe('projectPlayerForFixture', () => {
    it('should return projection with all components', () => {
      const player = createMockPlayer({ 
        id: 16, // Saka
        team: 1,
        element_type: 3,
        expected_goals_per_90: '0.40',
        expected_assists_per_90: '0.30',
        expected_goals_conceded_per_90: '0.8',
        ict_index: '100.0',
        penalties_order: 1,
        form: '8.0',
        ep_next: '7.5',
      });
      
      const teams = new Map(mockTeams.map(t => [t.id, t]));
      const averages = calculateLeagueAverages(mockTeams);
      const fixture = mockFixtures[0]; // ARS vs AVL
      
      const projection = projectPlayerForFixture(player, fixture, teams, averages, 20);
      
      expect(projection.playerId).toBe(16);
      expect(projection.gameweek).toBe(3);
      expect(projection.fixtureId).toBe(101);
      expect(projection.isHome).toBe(true);
      expect(projection.opponentId).toBe(2);
      expect(projection.projectedPoints).toBeGreaterThan(0);
      expect(projection.availability).toBe(1.0);
      expect(projection.attackFactor).toBeGreaterThan(0);
      expect(projection.defenceFactor).toBeGreaterThan(0);
      expect(projection.attackingPoints).toBeGreaterThan(0);
      expect(projection.cleanSheetPoints).toBeGreaterThanOrEqual(0);
      expect(projection.appearancePoints).toBeGreaterThan(0);
      expect(projection.bonusPoints).toBeGreaterThan(0);
      expect(projection.epNext).toBe(7.5);
      expect(projection.blendedPoints).toBeGreaterThan(0);
    });

    it('should return 0 points for injured player', () => {
      const player = createMockPlayer({ status: 'i', ep_next: '5.0' });
      const teams = new Map(mockTeams.map(t => [t.id, t]));
      const averages = calculateLeagueAverages(mockTeams);
      const fixture = mockFixtures[0];
      
      const projection = projectPlayerForFixture(player, fixture, teams, averages, 20);
      
      expect(projection.projectedPoints).toBe(0);
      expect(projection.availability).toBe(0);
    });
  });

  describe('projectPlayerForGameweek', () => {
    it('should return single projection for single fixture', () => {
      const player = createMockPlayer({ team: 1 });
      const teams = new Map(mockTeams.map(t => [t.id, t]));
      const averages = calculateLeagueAverages(mockTeams);
      
      const projections = projectPlayerForGameweek(player, 3, mockFixtures, teams, averages, 20);
      
      // Team 1 (Arsenal) has 1 fixture in GW3
      expect(projections).toHaveLength(1);
      expect(projections[0].gameweek).toBe(3);
    });

    it('should return multiple projections for double gameweek', () => {
      const player = createMockPlayer({ team: 1 }); // Arsenal
      const teams = new Map(mockTeams.map(t => [t.id, t]));
      const averages = calculateLeagueAverages(mockTeams);
      
      // GW4 has 2 fixtures for Arsenal (ids 105 and 109)
      const projections = projectPlayerForGameweek(player, 4, mockFixtures, teams, averages, 20);
      
      expect(projections).toHaveLength(2);
    });

    it('should return blank projection for blank gameweek', () => {
      const player = createMockPlayer({ team: 3 }); // Brentford - no fixture in GW4
      const teams = new Map(mockTeams.map(t => [t.id, t]));
      const averages = calculateLeagueAverages(mockTeams);
      
      const projections = projectPlayerForGameweek(player, 4, mockFixtures, teams, averages, 20);
      
      expect(projections).toHaveLength(1);
      expect(projections[0].projectedPoints).toBe(0);
      expect(projections[0].fixtureId).toBeNull();
    });
  });

  describe('getTotalProjectedPoints', () => {
    it('should sum points for upcoming and horizon gameweeks', () => {
      const projections = [
        { playerId: 1, gameweek: 3, fixtureId: 1, isHome: true, opponentId: 2, projectedPoints: 5.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 2, cleanSheetPoints: 2, appearancePoints: 1, bonusPoints: 0, epNext: 5, blendedPoints: 5 },
        { playerId: 1, gameweek: 3, fixtureId: 2, isHome: false, opponentId: 3, projectedPoints: 3.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 1, cleanSheetPoints: 1, appearancePoints: 1, bonusPoints: 0, epNext: 3, blendedPoints: 3 }, // Double GW
        { playerId: 1, gameweek: 4, fixtureId: 3, isHome: true, opponentId: 4, projectedPoints: 4.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 2, cleanSheetPoints: 1, appearancePoints: 1, bonusPoints: 0, epNext: 4, blendedPoints: 4 },
        { playerId: 1, gameweek: 5, fixtureId: 4, isHome: false, opponentId: 5, projectedPoints: 6.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 3, cleanSheetPoints: 1, appearancePoints: 2, bonusPoints: 0, epNext: 6, blendedPoints: 6 },
      ];
      
      const result = getTotalProjectedPoints(projections, 3, 4);
      
      // Upcoming (GW3): 5.0 + 3.0 = 8.0
      // Horizon (GW3-6): 8.0 + 4.0 + 6.0 = 18.0
      expect(result.upcoming).toBe(8.0);
      expect(result.horizon).toBe(18.0);
    });
  });
});