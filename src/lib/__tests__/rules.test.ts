// Unit tests for Rules Module

import {
  POSITION,
  countByPosition,
  validateSquadComposition,
  validateFormation,
  validateBudget,
  wouldViolateClubLimit,
} from '../rules';
import type { Element } from '../schemas';
import { mockElements } from './fixtures';

describe('Rules Module', () => {
  describe('countByPosition', () => {
    it('should count players by position correctly', () => {
      const players = [
        mockElements[0], // GK - Raya
        mockElements[1], // GK - Alisson
        mockElements[5], // DEF - Saliba
        mockElements[6], // DEF - Gabriel
        mockElements[7], // DEF - Alexander-Arnold
        mockElements[8], // DEF - Robertson
        mockElements[9], // DEF - Walker
        mockElements[15], // MID - Saka
        mockElements[16], // MID - Odegaard
        mockElements[17], // MID - Salah
        mockElements[18], // MID - De Bruyne
        mockElements[19], // MID - Son
        mockElements[25], // FWD - Haaland (index 25)
        mockElements[26], // FWD - Watkins (index 26)
        mockElements[27], // FWD - Isak (index 27)
      ];
      
      const counts = countByPosition(players);
      
      expect(counts[POSITION.GK]).toBe(2);
      expect(counts[POSITION.DEF]).toBe(5);
      expect(counts[POSITION.MID]).toBe(5);
      expect(counts[POSITION.FWD]).toBe(3);
    });
  });

  describe('validateSquadComposition', () => {
    it('should validate a correct squad', () => {
      // Valid squad with max 3 per club
      // GK: Martinez (team 2), Pickford (team 7)
      // DEF: Saliba (1), Gabriel (1), TAA (9), Trippier (8), Cash (2) - teams: 1:2, 9:1, 8:1, 2:2
      // MID: Salah (9), De Bruyne (10), Son (6), Bruno (8), Maddison (6) - teams: 9:2, 10:1, 6:2, 8:2
      // FWD: Haaland (10), Watkins (2), Isak (8) - teams: 10:2, 2:3, 8:3
      // Total: team 1:2, team 2:3, team 7:1, team 9:2, team 10:2, team 8:3, team 6:2
      const validSquad: Element[] = [
        mockElements[3], // Martinez - team 2 (GK)
        mockElements[4], // Pickford - team 7 (GK)
        mockElements[5], // Saliba - team 1 (DEF)
        mockElements[6], // Gabriel - team 1 (DEF)
        mockElements[7], // TAA - team 9 (DEF)
        mockElements[11], // Trippier - team 8 (DEF)
        mockElements[14], // Cash - team 2 (DEF)
        mockElements[17], // Salah - team 9 (MID)
        mockElements[18], // De Bruyne - team 10 (MID)
        mockElements[19], // Son - team 6 (MID)
        mockElements[20], // Bruno - team 8 (MID)
        mockElements[21], // Maddison - team 6 (MID)
        mockElements[25], // Haaland - team 10 (FWD)
        mockElements[26], // Watkins - team 2 (FWD)
        mockElements[27], // Isak - team 8 (FWD)
      ];
      
      const result = validateSquadComposition(validSquad);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject squad with wrong number of players', () => {
      const squad = mockElements.slice(0, 14); // Only 14 players
      
      const result = validateSquadComposition(squad);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('15 players'))).toBe(true);
    });

    it('should reject squad with wrong position counts', () => {
      const squad = [
        mockElements[0], // 1 GK (need 2)
        mockElements[5], mockElements[6], mockElements[7], mockElements[8], mockElements[9], // 5 DEF
        mockElements[15], mockElements[16], mockElements[17], mockElements[18], mockElements[19], // 5 MID
        mockElements[25], mockElements[26], mockElements[27], mockElements[28], // 4 FWD (need 3)
      ];
      
      const result = validateSquadComposition(squad);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('goalkeepers'))).toBe(true);
      expect(result.errors.some(e => e.includes('forwards'))).toBe(true);
    });

    it('should reject squad with more than 3 from same club', () => {
      // 4 Arsenal players (ids 1, 5, 6, 7 are all Arsenal/team 1)
      const squad = [
        mockElements[0], mockElements[1], // 2 GK (team 1, 9)
        mockElements[5], mockElements[6], mockElements[12], mockElements[13], // 4 DEF from team 1 (Arsenal)
        mockElements[15], mockElements[16], mockElements[17], mockElements[18], mockElements[19], // 5 MID
        mockElements[25], mockElements[26], mockElements[27], // 3 FWD
      ];
      
      const result = validateSquadComposition(squad);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Club 1'))).toBe(true);
    });
  });

  describe('validateFormation', () => {
    it('should validate 3-4-3 formation', () => {
      const starters = [
        mockElements[0], // 1 GK
        mockElements[5], mockElements[6], mockElements[7], // 3 DEF
        mockElements[15], mockElements[16], mockElements[17], mockElements[18], // 4 MID
        mockElements[25], mockElements[26], mockElements[27], // 3 FWD
      ];
      
      const result = validateFormation(starters);
      
      expect(result.valid).toBe(true);
      expect(result.formation).toBe('3-4-3');
    });

    it('should validate 3-5-2 formation', () => {
      const starters = [
        mockElements[0], // 1 GK
        mockElements[5], mockElements[6], mockElements[7], // 3 DEF
        mockElements[15], mockElements[16], mockElements[17], mockElements[18], mockElements[19], // 5 MID
        mockElements[25], mockElements[26], // 2 FWD
      ];
      
      const result = validateFormation(starters);
      
      expect(result.valid).toBe(true);
      expect(result.formation).toBe('3-5-2');
    });

    it('should validate 4-4-2 formation', () => {
      const starters = [
        mockElements[0], // 1 GK
        mockElements[5], mockElements[6], mockElements[7], mockElements[8], // 4 DEF
        mockElements[15], mockElements[16], mockElements[17], mockElements[18], // 4 MID
        mockElements[25], mockElements[26], // 2 FWD
      ];
      
      const result = validateFormation(starters);
      
      expect(result.valid).toBe(true);
      expect(result.formation).toBe('4-4-2');
    });

    it('should reject formation with wrong player count', () => {
      const starters = mockElements.slice(0, 10); // Only 10 players
      
      const result = validateFormation(starters);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('11 players'))).toBe(true);
    });

    it('should reject formation without GK', () => {
      const starters = [
        mockElements[5], mockElements[6], mockElements[7], // 3 DEF
        mockElements[15], mockElements[16], mockElements[17], mockElements[18], mockElements[19], // 5 MID
        mockElements[26], mockElements[27], mockElements[28], // 3 FWD
        // No GK
      ];
      
      const result = validateFormation(starters);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('1 GK'))).toBe(true);
    });

    it('should reject invalid formation 2-5-4', () => {
      const starters = [
        mockElements[0], mockElements[1], // 2 GK (invalid)
        mockElements[5], mockElements[6], mockElements[7], mockElements[8], mockElements[9], // 5 DEF
        mockElements[15], mockElements[16], mockElements[17], mockElements[18], // 4 MID
        mockElements[24], mockElements[25], // 2 FWD
      ];
      
      const result = validateFormation(starters);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('validateBudget', () => {
    it('should validate squad within budget', () => {
      const players = mockElements.slice(0, 15);
      const bank = 10; // 1.0m
      const totalValue = players.reduce((sum, p) => sum + p.now_cost, 0) + bank;
      
      const result = validateBudget(players, bank, totalValue);
      
      expect(result.valid).toBe(true);
    });

    it('should reject squad over budget', () => {
      const players = mockElements.slice(0, 15);
      const bank = 10;
      const totalValue = players.reduce((sum, p) => sum + p.now_cost, 0) - 50; // 5m under
      
      const result = validateBudget(players, bank, totalValue);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds total budget'))).toBe(true);
    });

    it('should reject negative bank', () => {
      const players = mockElements.slice(0, 15);
      const bank = -10;
      const totalValue = players.reduce((sum, p) => sum + p.now_cost, 0) + bank;
      
      const result = validateBudget(players, bank, totalValue);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('negative'))).toBe(true);
    });
  });

  describe('wouldViolateClubLimit', () => {
    it('should return false when under limit', () => {
      const current = [
        mockElements[5], // Saliba - Arsenal (team 1)
        mockElements[6], // Gabriel - Arsenal (team 1)
      ];
      const newPlayer = mockElements[12]; // White - Arsenal (team 1, index 12)
      
      const result = wouldViolateClubLimit(current, newPlayer);
      
      expect(result).toBe(false); // 3 from Arsenal is OK
    });

    it('should return true when over limit', () => {
      const current = [
        mockElements[5], // Saliba - Arsenal (team 1)
        mockElements[6], // Gabriel - Arsenal (team 1)
        mockElements[12], // White - Arsenal (team 1, index 12)
      ];
      const newPlayer = mockElements[13]; // Tomiyasu - Arsenal (team 1, index 13)
      
      const result = wouldViolateClubLimit(current, newPlayer);
      
      expect(result).toBe(true); // 4 from Arsenal violates limit
    });

    it('should account for player being removed', () => {
      const current = [
        mockElements[5], // Saliba - Arsenal (team 1)
        mockElements[6], // Gabriel - Arsenal (team 1)
        mockElements[12], // White - Arsenal (team 1, index 12)
      ];
      const newPlayer = mockElements[13]; // Tomiyasu - Arsenal (team 1, index 13)
      const removePlayer = mockElements[5]; // Saliba - Arsenal (team 1)
      
      const result = wouldViolateClubLimit(current, newPlayer, removePlayer);
      
      expect(result).toBe(false); // Removing Saliba, adding Tomiyasu = still 3
    });
  });
});