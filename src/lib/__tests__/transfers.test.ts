// Unit tests for Transfers Module

import {
  findBestSingleTransfers,
  findBestDoubleTransfers,
  shouldRollTransfer,
  analyzeTransfers,
  scorePlayerOut,
  scorePlayerIn,
  isValidTransfer,
  type TransferSuggestion,
} from '../transfers';
import type { Element, PlayerProjection } from '../schemas';
import { createMockPlayer, mockTransfers, mockFixtures, mockTeams } from './fixtures';
import { projectAllPlayers } from '../projections';
import { calculateAllPrices } from '../pricing';
import { POSITION } from '../rules';

describe('Transfers Module', () => {
  // Create a test squad with only 3 Arsenal players (Raya, Saliba, Gabriel)
  const mockSquad = [
    createMockPlayer({ id: 1, web_name: 'Raya', team: 1, element_type: POSITION.GK, now_cost: 55 }),
    createMockPlayer({ id: 2, web_name: 'Alisson', team: 9, element_type: POSITION.GK, now_cost: 55 }),
    createMockPlayer({ id: 6, web_name: 'Saliba', team: 1, element_type: POSITION.DEF, now_cost: 65 }),
    createMockPlayer({ id: 7, web_name: 'Gabriel', team: 1, element_type: POSITION.DEF, now_cost: 60 }),
    createMockPlayer({ id: 8, web_name: 'TAA', team: 9, element_type: POSITION.DEF, now_cost: 75 }),
    createMockPlayer({ id: 9, web_name: 'Robertson', team: 9, element_type: POSITION.DEF, now_cost: 70 }),
    createMockPlayer({ id: 10, web_name: 'Walker', team: 10, element_type: POSITION.DEF, now_cost: 60 }),
    createMockPlayer({ id: 16, web_name: 'Saka', team: 2, element_type: POSITION.MID, now_cost: 100 }),  // Changed to Villa
    createMockPlayer({ id: 17, web_name: 'Odegaard', team: 2, element_type: POSITION.MID, now_cost: 85 }),  // Changed to Villa
    createMockPlayer({ id: 18, web_name: 'Salah', team: 9, element_type: POSITION.MID, now_cost: 130 }),
    createMockPlayer({ id: 19, web_name: 'De Bruyne', team: 10, element_type: POSITION.MID, now_cost: 100 }),
    createMockPlayer({ id: 20, web_name: 'Son', team: 6, element_type: POSITION.MID, now_cost: 100 }),
    createMockPlayer({ id: 26, web_name: 'Haaland', team: 10, element_type: POSITION.FWD, now_cost: 150 }),
    createMockPlayer({ id: 27, web_name: 'Watkins', team: 2, element_type: POSITION.FWD, now_cost: 90 }),
    createMockPlayer({ id: 28, web_name: 'Isak', team: 8, element_type: POSITION.FWD, now_cost: 85 }),
  ];

  const allElements = [
    ...mockSquad,
    // Additional players for transfer search
    createMockPlayer({ id: 3, web_name: 'Ederson', team: 10, element_type: POSITION.GK, now_cost: 55, ep_next: '6.0', expected_goals_per_90: '0.0', expected_assists_per_90: '0.0', expected_goals_conceded_per_90: '0.6' }),
    createMockPlayer({ id: 4, web_name: 'Martinez', team: 2, element_type: POSITION.GK, now_cost: 50, ep_next: '4.5', expected_goals_per_90: '0.0', expected_assists_per_90: '0.0', expected_goals_conceded_per_90: '1.0' }),
    createMockPlayer({ id: 11, web_name: 'Dias', team: 10, element_type: POSITION.DEF, now_cost: 60, ep_next: '4.5', expected_goals_per_90: '0.05', expected_assists_per_90: '0.05', expected_goals_conceded_per_90: '0.6' }),
    createMockPlayer({ id: 12, web_name: 'Trippier', team: 8, element_type: POSITION.DEF, now_cost: 55, ep_next: '5.0', expected_goals_per_90: '0.05', expected_assists_per_90: '0.25', expected_goals_conceded_per_90: '1.0' }),
    createMockPlayer({ id: 13, web_name: 'White', team: 1, element_type: POSITION.DEF, now_cost: 55, ep_next: '3.5', expected_goals_per_90: '0.05', expected_assists_per_90: '0.10', expected_goals_conceded_per_90: '0.8' }),
    createMockPlayer({ id: 21, web_name: 'Bruno', team: 8, element_type: POSITION.MID, now_cost: 90, ep_next: '5.5', expected_goals_per_90: '0.30', expected_assists_per_90: '0.25', expected_goals_conceded_per_90: '1.0' }),
    createMockPlayer({ id: 22, web_name: 'Maddison', team: 6, element_type: POSITION.MID, now_cost: 80, ep_next: '5.0', expected_goals_per_90: '0.25', expected_assists_per_90: '0.20', expected_goals_conceded_per_90: '1.2' }),
    createMockPlayer({ id: 23, web_name: 'Bowen', team: 4, element_type: POSITION.MID, now_cost: 75, ep_next: '5.5', expected_goals_per_90: '0.35', expected_assists_per_90: '0.15', expected_goals_conceded_per_90: '1.0' }),
    createMockPlayer({ id: 24, web_name: 'Palmer', team: 5, element_type: POSITION.MID, now_cost: 70, ep_next: '6.0', expected_goals_per_90: '0.30', expected_assists_per_90: '0.25', expected_goals_conceded_per_90: '1.0' }),
    createMockPlayer({ id: 29, web_name: 'Solanke', team: 6, element_type: POSITION.FWD, now_cost: 75, ep_next: '5.5', expected_goals_per_90: '0.40', expected_assists_per_90: '0.10', expected_goals_conceded_per_90: '1.2' }),
    createMockPlayer({ id: 30, web_name: 'Jackson', team: 5, element_type: POSITION.FWD, now_cost: 70, ep_next: '5.0', expected_goals_per_90: '0.35', expected_assists_per_90: '0.15', expected_goals_conceded_per_90: '1.0' }),
  ];

  const projections = projectAllPlayers(allElements, mockFixtures, mockTeams, 4, 2);
  const prices = new Map(calculateAllPrices(mockSquad, mockTransfers).map(p => [p.playerId, { purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice }]));

  const testParams = {
    squad: mockSquad,
    allPlayers: allElements,
    projections,
    prices,
    bank: 10, // 1.0m
    freeTransfers: 1,
    upcomingGameweek: 3,
    horizonGameweeks: 4,
  };

  describe('scorePlayerOut', () => {
    it('should score player with projected points', () => {
      const player = mockSquad[0]; // Raya
      const priceInfo = prices.get(player.id)!;
      
      const score = scorePlayerOut(player, projections, 3, 4, priceInfo.sellingPrice);
      
      expect(score.player.id).toBe(1);
      expect(score.upcomingPoints).toBeGreaterThanOrEqual(0);
      expect(score.horizonPoints).toBeGreaterThanOrEqual(0);
      expect(score.sellingPrice).toBe(priceInfo.sellingPrice);
    });
  });

  describe('scorePlayerIn', () => {
    it('should score player with projected points', () => {
      const player = allElements.find(p => p.id === 3)!; // Ederson
      
      const score = scorePlayerIn(player, projections, 3, 4);
      
      expect(score.player.id).toBe(3);
      expect(score.upcomingPoints).toBeGreaterThanOrEqual(0);
      expect(score.horizonPoints).toBeGreaterThanOrEqual(0);
      expect(score.sellingPrice).toBe(0);
    });
  });

  describe('isValidTransfer', () => {
    it('should reject position mismatch', () => {
      const outPlayer = mockSquad[0]; // GK
      const inPlayer = allElements.find(p => p.id === 11)!; // DEF
      
      const result = isValidTransfer(outPlayer, inPlayer, mockSquad, 1, 0);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Position mismatch');
    });

    it('should reject player already in squad', () => {
      const outPlayer = mockSquad[0]; // Raya
      const inPlayer = mockSquad[1]; // Alisson
      
      const result = isValidTransfer(outPlayer, inPlayer, mockSquad, 1, 0);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Already in squad');
    });

    it('should reject club limit violation', () => {
      // Squad already has 3 Arsenal players (1, 6, 7)
      const outPlayer = mockSquad[6]; // Walker (Man City) - DEF
      const inPlayer = allElements.find(p => p.id === 13)!; // White (Arsenal) - DEF
      
      const result = isValidTransfer(outPlayer, inPlayer, mockSquad, 1, 0);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Club limit');
    });

    it('should accept valid transfer', () => {
      const outPlayer = mockSquad[6]; // Walker (Man City) - index 6
      const inPlayer = allElements.find(p => p.id === 11)!; // Dias (Man City) - replacing one Man City with another
      
      const result = isValidTransfer(outPlayer, inPlayer, mockSquad, 1, 0);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('findBestSingleTransfers', () => {
    it('should return transfer suggestions', () => {
      const suggestions = findBestSingleTransfers(testParams);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should sort by net gain descending', () => {
      const suggestions = findBestSingleTransfers(testParams);
      
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].netGain).toBeGreaterThanOrEqual(suggestions[i].netGain);
      }
    });

    it('should include all required fields', () => {
      const suggestions = findBestSingleTransfers(testParams);
      
      if (suggestions.length > 0) {
        const s = suggestions[0];
        expect(s.out).toBeDefined();
        expect(s.in).toBeDefined();
        expect(typeof s.priceChange).toBe('number');
        expect(typeof s.projectedGainUpcoming).toBe('number');
        expect(typeof s.projectedGainHorizon).toBe('number');
        expect(typeof s.newBank).toBe('number');
        expect(typeof s.reason).toBe('string');
        expect(typeof s.isHit).toBe('boolean');
        expect(typeof s.hitCost).toBe('number');
        expect(typeof s.netGain).toBe('number');
      }
    });

    it('should only suggest affordable transfers', () => {
      const suggestions = findBestSingleTransfers(testParams);
      
      for (const s of suggestions) {
        expect(s.newBank).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('findBestDoubleTransfers', () => {
    it('should return empty array when less than 2 free transfers', () => {
      const params = { ...testParams, freeTransfers: 1 };
      const suggestions = findBestDoubleTransfers(params);
      
      expect(suggestions).toHaveLength(0);
    });

    it('should return suggestions when 2 free transfers', () => {
      const params = { ...testParams, freeTransfers: 2 };
      const suggestions = findBestDoubleTransfers(params);
      
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('shouldRollTransfer', () => {
    it('should recommend rolling when gain below threshold', () => {
      const result = shouldRollTransfer(1.0, 1);
      
      expect(result.roll).toBe(true);
      expect(result.reason).toContain('below roll threshold');
    });

    it('should not recommend rolling when gain above threshold', () => {
      const result = shouldRollTransfer(3.0, 1);
      
      expect(result.roll).toBe(false);
    });

    it('should not recommend rolling with 2+ free transfers', () => {
      const result = shouldRollTransfer(0.5, 2);
      
      expect(result.roll).toBe(false);
      expect(result.reason).toContain('Multiple free transfers');
    });
  });

  describe('analyzeTransfers', () => {
    it('should return complete transfer analysis', () => {
      const result = analyzeTransfers(testParams);
      
      expect(result.singleTransfers).toBeDefined();
      expect(result.doubleTransfers).toBeDefined();
      expect(result.rollAdvice).toBeDefined();
      expect(typeof result.bestGain).toBe('number');
    });
  });
});