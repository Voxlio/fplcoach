// Unit tests for Chips Module

import {
  analyzeChips,
  filterAvailableChips,
  getUsedChips,
  type ChipAdvice,
} from '../chips';
import type { Element, PlayerProjection } from '../schemas';
import { createMockPlayer } from './fixtures';

describe('Chips Module', () => {
  const mockSquad = [
    createMockPlayer({ id: 1, web_name: 'Raya', team: 1, element_type: 1, now_cost: 55 }),
    createMockPlayer({ id: 2, web_name: 'Alisson', team: 9, element_type: 1, now_cost: 55 }),
    createMockPlayer({ id: 6, web_name: 'Saliba', team: 1, element_type: 2, now_cost: 65 }),
    createMockPlayer({ id: 7, web_name: 'Gabriel', team: 1, element_type: 2, now_cost: 60 }),
    createMockPlayer({ id: 8, web_name: 'TAA', team: 9, element_type: 2, now_cost: 75 }),
    createMockPlayer({ id: 9, web_name: 'Robertson', team: 9, element_type: 2, now_cost: 70 }),
    createMockPlayer({ id: 10, web_name: 'Walker', team: 10, element_type: 2, now_cost: 60 }),
    createMockPlayer({ id: 16, web_name: 'Saka', team: 1, element_type: 3, now_cost: 100 }),
    createMockPlayer({ id: 17, web_name: 'Odegaard', team: 1, element_type: 3, now_cost: 85 }),
    createMockPlayer({ id: 18, web_name: 'Salah', team: 9, element_type: 3, now_cost: 130 }),
    createMockPlayer({ id: 19, web_name: 'De Bruyne', team: 10, element_type: 3, now_cost: 100 }),
    createMockPlayer({ id: 20, web_name: 'Son', team: 6, element_type: 3, now_cost: 100 }),
    createMockPlayer({ id: 26, web_name: 'Haaland', team: 10, element_type: 4, now_cost: 150 }),
    createMockPlayer({ id: 27, web_name: 'Watkins', team: 2, element_type: 4, now_cost: 90 }),
    createMockPlayer({ id: 28, web_name: 'Isak', team: 8, element_type: 4, now_cost: 85 }),
  ];

  // Starters for bestXI (first 11)
  const mockStarters = mockSquad.slice(0, 11);
  // Bench (last 4)
  const mockBench = mockSquad.slice(11);

  const mockProjections = new Map<number, PlayerProjection[]>();
  
  // Create mock projections with various scenarios
  for (const player of mockSquad) {
    const isBench = mockBench.some(p => p.id === player.id);
    const projections: PlayerProjection[] = [
      { playerId: player.id, gameweek: 3, fixtureId: 1, isHome: true, opponentId: 2, projectedPoints: isBench ? 2.0 : 5.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 2, cleanSheetPoints: 2, appearancePoints: 1, bonusPoints: 0.5, epNext: 5, blendedPoints: 5 },
    ];
    mockProjections.set(player.id, projections);
  }

  // Add blank gameweek players
  const blankPlayer = createMockPlayer({ id: 99, web_name: 'BlankPlayer', team: 3, element_type: 3, now_cost: 60 });
  mockProjections.set(99, [{ playerId: 99, gameweek: 3, fixtureId: null, isHome: false, opponentId: 0, projectedPoints: 0, availability: 1, minutesSecurity: 0, attackFactor: 1, defenceFactor: 1, attackingPoints: 0, cleanSheetPoints: 0, appearancePoints: 0, bonusPoints: 0, epNext: 0, blendedPoints: 0 }]);

  // Add injured player
  const injuredPlayer = createMockPlayer({ id: 98, web_name: 'InjuredPlayer', team: 4, element_type: 4, now_cost: 70, status: 'i' });
  mockProjections.set(98, [{ playerId: 98, gameweek: 3, fixtureId: 2, isHome: true, opponentId: 5, projectedPoints: 0, availability: 0, minutesSecurity: 0, attackFactor: 1, defenceFactor: 1, attackingPoints: 0, cleanSheetPoints: 0, appearancePoints: 0, bonusPoints: 0, epNext: 0, blendedPoints: 0 }]);

  const mockBestXI = {
    starters: mockStarters,
    bench: mockBench,
    formation: '3-4-3',
    totalProjectedPoints: 60,
    captainId: 18,
    viceCaptainId: 26,
    flags: [
      { playerId: 98, type: 'injury' as const, message: 'Injured', severity: 'high' as const },
    ],
  };

  const mockFixtureMap = new Map();
  const mockTeamMap = new Map([
    [1, { short_name: 'ARS' }],
    [2, { short_name: 'AVL' }],
    [3, { short_name: 'BRE' }],
    [4, { short_name: 'BHA' }],
    [5, { short_name: 'CHE' }],
    [6, { short_name: 'CRY' }],
    [7, { short_name: 'EVE' }],
    [8, { short_name: 'FUL' }],
    [9, { short_name: 'LIV' }],
    [10, { short_name: 'MCI' }],
  ]);

  describe('analyzeChips', () => {
    it('should not recommend any chip for healthy squad', () => {
      const advice = analyzeChips(
        mockSquad,
        mockBestXI,
        mockProjections,
        3,
        4,
        mockFixtureMap,
        mockTeamMap
      );
      
      expect(advice.wildcard.recommended).toBe(false);
      expect(advice.freeHit.recommended).toBe(false);
      expect(advice.benchBoost.recommended).toBe(false);
      expect(advice.tripleCaptain.recommended).toBe(false);
      expect(advice.summary).toContain('No chip recommended');
    });

    it('should recommend Wildcard when 4+ problem starters', () => {
      // Create bestXI with 4 problem starters (using IDs from mockStarters)
      const problemBestXI = {
        ...mockBestXI,
        starters: mockStarters,
        flags: [
          { playerId: mockStarters[0].id, type: 'injury' as const, message: 'Injured', severity: 'high' as const },
          { playerId: mockStarters[1].id, type: 'injury' as const, message: 'Injured', severity: 'high' as const },
          { playerId: mockStarters[2].id, type: 'injury' as const, message: 'Injured', severity: 'high' as const },
          { playerId: mockStarters[3].id, type: 'injury' as const, message: 'Injured', severity: 'high' as const },
        ],
      };
      
      const advice = analyzeChips(
        mockSquad,
        problemBestXI,
        mockProjections,
        3,
        4,
        mockFixtureMap,
        mockTeamMap
      );
      
      expect(advice.wildcard.recommended).toBe(true);
      expect(advice.wildcard.confidence).toBe('high');
      expect(advice.summary).toContain('Wildcard');
    });

    it('should recommend Free Hit when many blank players', () => {
      // Squad with 6 blank players
      const blankSquad = [...mockSquad];
      for (let i = 0; i < 6; i++) {
        blankSquad[i] = { ...blankSquad[i], id: 100 + i };
        mockProjections.set(100 + i, [{ playerId: 100 + i, gameweek: 3, fixtureId: null, isHome: false, opponentId: 0, projectedPoints: 0, availability: 1, minutesSecurity: 0, attackFactor: 1, defenceFactor: 1, attackingPoints: 0, cleanSheetPoints: 0, appearancePoints: 0, bonusPoints: 0, epNext: 0, blendedPoints: 0 }]);
      }
      
      const blankBestXI = {
        ...mockBestXI,
        starters: blankSquad.slice(0, 11),
      };
      
      const advice = analyzeChips(
        blankSquad,
        blankBestXI,
        mockProjections,
        3,
        4,
        mockFixtureMap,
        mockTeamMap
      );
      
      expect(advice.freeHit.recommended).toBe(true);
      expect(advice.summary).toContain('Free Hit');
    });

    it('should recommend Bench Boost when bench projection high', () => {
      // Create high projection bench
      const highBenchProjections = new Map(mockProjections);
      const benchPlayers = mockSquad.slice(11, 15);
      for (const player of benchPlayers) {
        highBenchProjections.set(player.id, [
          { playerId: player.id, gameweek: 3, fixtureId: 1, isHome: true, opponentId: 2, projectedPoints: 5.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 2, cleanSheetPoints: 2, appearancePoints: 1, bonusPoints: 0.5, epNext: 5, blendedPoints: 5 },
        ]);
      }
      
      const advice = analyzeChips(
        mockSquad,
        mockBestXI,
        highBenchProjections,
        3,
        4,
        mockFixtureMap,
        mockTeamMap
      );
      
      // Bench projection = 4 * 5 = 20, threshold is 12
      expect(advice.benchBoost.recommended).toBe(true);
    });

    it('should recommend Triple Captain for double gameweek captain', () => {
      // Give captain a double gameweek
      const doubleGWProjections = new Map(mockProjections);
      doubleGWProjections.set(18, [ // Salah
        { playerId: 18, gameweek: 3, fixtureId: 1, isHome: true, opponentId: 2, projectedPoints: 8.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 3, cleanSheetPoints: 2, appearancePoints: 2, bonusPoints: 1, epNext: 9.5, blendedPoints: 8.0 },
        { playerId: 18, gameweek: 3, fixtureId: 2, isHome: false, opponentId: 5, projectedPoints: 7.0, availability: 1, minutesSecurity: 1, attackFactor: 1, defenceFactor: 1, attackingPoints: 3, cleanSheetPoints: 1, appearancePoints: 2, bonusPoints: 1, epNext: 9.5, blendedPoints: 7.0 },
      ]);
      
      const doubleGWBestXI = {
        ...mockBestXI,
        starters: mockSquad.slice(0, 11),
      };
      
      const advice = analyzeChips(
        mockSquad,
        doubleGWBestXI,
        doubleGWProjections,
        3,
        4,
        mockFixtureMap,
        mockTeamMap
      );
      
      expect(advice.tripleCaptain.recommended).toBe(true);
      expect(advice.tripleCaptain.reason).toContain('double gameweek');
    });

    it('should recommend Triple Captain for very high projection', () => {
      // Give captain (Salah, id 18) very high projection (single fixture but huge xP)
      const highProj = new Map(mockProjections);
      highProj.set(18, [ // Salah - captain
        { playerId: 18, gameweek: 3, fixtureId: 1, isHome: true, opponentId: 2, projectedPoints: 16.0, availability: 1, minutesSecurity: 1, attackFactor: 1.5, defenceFactor: 1, attackingPoints: 10, cleanSheetPoints: 2, appearancePoints: 2, bonusPoints: 2, epNext: 10.5, blendedPoints: 16.0 },
      ]);
      
      const highProjBestXI = {
        ...mockBestXI,
        starters: mockSquad.slice(0, 11),
      };
      
      const advice = analyzeChips(
        mockSquad,
        highProjBestXI,
        highProj,
        3,
        4,
        mockFixtureMap,
        mockTeamMap
      );
      
      expect(advice.tripleCaptain.recommended).toBe(true);
      expect(advice.tripleCaptain.reason).toContain('projected');
    });
  });

  describe('getUsedChips', () => {
    it('should return set of used chips from history', () => {
      const history = [
        { event: 5, chip: 'wildcard' },
        { event: 10, chip: 'freehit' },
        { event: 15, chip: 'none' },
        { event: 20, chip: '3xc' },
      ];
      
      const used = getUsedChips(history);
      
      expect(used.has('wildcard')).toBe(true);
      expect(used.has('freehit')).toBe(true);
      expect(used.has('3xc')).toBe(true);
      expect(used.has('bboost')).toBe(false);
    });

    it('should return empty set for no chips used', () => {
      const history = [
        { event: 5, chip: 'none' },
        { event: 10, chip: 'none' },
      ];
      
      const used = getUsedChips(history);
      
      expect(used.size).toBe(0);
    });
  });

  describe('filterAvailableChips', () => {
    it('should mark used chips as not recommended', () => {
      const advice: ChipAdvice = {
        wildcard: { recommended: true, reason: 'Test', confidence: 'high' },
        freeHit: { recommended: true, reason: 'Test', confidence: 'high' },
        benchBoost: { recommended: true, reason: 'Test', confidence: 'high' },
        tripleCaptain: { recommended: true, reason: 'Test', confidence: 'high' },
        summary: 'All recommended',
      };
      
      const usedChips = new Set(['wildcard', '3xc']);
      const filtered = filterAvailableChips(advice, usedChips);
      
      expect(filtered.wildcard.recommended).toBe(false);
      expect(filtered.wildcard.reason).toContain('already used');
      expect(filtered.tripleCaptain.recommended).toBe(false);
      expect(filtered.tripleCaptain.reason).toContain('already used');
      expect(filtered.freeHit.recommended).toBe(true);
      expect(filtered.benchBoost.recommended).toBe(true);
    });

    it('should update summary when all recommended chips used', () => {
      const advice: ChipAdvice = {
        wildcard: { recommended: true, reason: 'Test', confidence: 'high' },
        freeHit: { recommended: false, reason: 'Test', confidence: 'low' },
        benchBoost: { recommended: false, reason: 'Test', confidence: 'low' },
        tripleCaptain: { recommended: false, reason: 'Test', confidence: 'low' },
        summary: 'Recommendation: Play Wildcard.',
      };
      
      const usedChips = new Set(['wildcard']);
      const filtered = filterAvailableChips(advice, usedChips);
      
      expect(filtered.summary).toContain('already used');
    });
  });
});