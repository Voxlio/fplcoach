// Unit tests for Best XI Module

import { findBestXI, selectCaptainAndVice, getUpcomingProjection } from '../best-xi';
import type { Element, PlayerProjection } from '../schemas';
import { createMockPlayer, mockTeams, mockFixtures } from './fixtures';
import { projectAllPlayers } from '../projections';

describe('Best XI Module', () => {
  const mockSquad = [
    // 2 GK
    createMockPlayer({ id: 1, web_name: 'Raya', team: 1, element_type: 1, now_cost: 55, total_points: 80, ep_next: '5.0' }),
    createMockPlayer({ id: 2, web_name: 'Alisson', team: 9, element_type: 1, now_cost: 55, total_points: 85, ep_next: '5.5' }),
    // 5 DEF
    createMockPlayer({ id: 6, web_name: 'Saliba', team: 1, element_type: 2, now_cost: 65, total_points: 75, ep_next: '5.0' }),
    createMockPlayer({ id: 7, web_name: 'Gabriel', team: 1, element_type: 2, now_cost: 60, total_points: 70, ep_next: '4.5' }),
    createMockPlayer({ id: 8, web_name: 'TAA', team: 9, element_type: 2, now_cost: 75, total_points: 100, ep_next: '6.5' }),
    createMockPlayer({ id: 9, web_name: 'Robertson', team: 9, element_type: 2, now_cost: 70, total_points: 90, ep_next: '5.5' }),
    createMockPlayer({ id: 10, web_name: 'Walker', team: 10, element_type: 2, now_cost: 60, total_points: 65, ep_next: '4.0' }),
    // 5 MID
    createMockPlayer({ id: 16, web_name: 'Saka', team: 1, element_type: 3, now_cost: 100, total_points: 150, ep_next: '7.5' }),
    createMockPlayer({ id: 17, web_name: 'Odegaard', team: 1, element_type: 3, now_cost: 85, total_points: 120, ep_next: '6.5' }),
    createMockPlayer({ id: 18, web_name: 'Salah', team: 9, element_type: 3, now_cost: 130, total_points: 200, ep_next: '9.5' }),
    createMockPlayer({ id: 19, web_name: 'De Bruyne', team: 10, element_type: 3, now_cost: 100, total_points: 140, ep_next: '7.0' }),
    createMockPlayer({ id: 20, web_name: 'Son', team: 6, element_type: 3, now_cost: 100, total_points: 130, ep_next: '6.5' }),
    // 3 FWD
    createMockPlayer({ id: 26, web_name: 'Haaland', team: 10, element_type: 4, now_cost: 150, total_points: 220, ep_next: '10.5' }),
    createMockPlayer({ id: 27, web_name: 'Watkins', team: 2, element_type: 4, now_cost: 90, total_points: 140, ep_next: '7.5' }),
    createMockPlayer({ id: 28, web_name: 'Isak', team: 8, element_type: 4, now_cost: 85, total_points: 130, ep_next: '7.0' }),
  ];

  const allElements = [
    ...mockSquad,
    // Additional players for transfer search
    createMockPlayer({ id: 3, web_name: 'Ederson', team: 10, element_type: 1, now_cost: 55 }),
    createMockPlayer({ id: 4, web_name: 'Martinez', team: 2, element_type: 1, now_cost: 50 }),
    createMockPlayer({ id: 5, web_name: 'Pickford', team: 7, element_type: 1, now_cost: 50 }),
    createMockPlayer({ id: 11, web_name: 'Dias', team: 10, element_type: 2, now_cost: 60 }),
    createMockPlayer({ id: 12, web_name: 'Trippier', team: 8, element_type: 2, now_cost: 55 }),
    createMockPlayer({ id: 13, web_name: 'White', team: 1, element_type: 2, now_cost: 55 }),
    createMockPlayer({ id: 14, web_name: 'Tomiyasu', team: 1, element_type: 2, now_cost: 45 }),
    createMockPlayer({ id: 15, web_name: 'Cash', team: 2, element_type: 2, now_cost: 50 }),
    createMockPlayer({ id: 21, web_name: 'Bruno', team: 8, element_type: 3, now_cost: 90 }),
    createMockPlayer({ id: 22, web_name: 'Maddison', team: 6, element_type: 3, now_cost: 80 }),
    createMockPlayer({ id: 23, web_name: 'Bowen', team: 4, element_type: 3, now_cost: 75 }),
    createMockPlayer({ id: 24, web_name: 'Palmer', team: 5, element_type: 3, now_cost: 70 }),
    createMockPlayer({ id: 25, web_name: 'Rice', team: 1, element_type: 3, now_cost: 65 }),
    createMockPlayer({ id: 29, web_name: 'Solanke', team: 6, element_type: 4, now_cost: 75 }),
    createMockPlayer({ id: 30, web_name: 'Jackson', team: 5, element_type: 4, now_cost: 70 }),
  ];

  // Create projections for testing
  const projections = projectAllPlayers(allElements, mockFixtures, mockTeams, 4, 2);

  describe('getUpcomingProjection', () => {
    it('should return projected points for upcoming gameweek', () => {
      const player = mockSquad[0]; // Raya
      const points = getUpcomingProjection(player, projections, 3);
      
      // Should have some projection for GW3
      expect(points).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findBestXI', () => {
    it('should return valid best XI with formation', () => {
      const result = findBestXI(mockSquad, projections, 3);
      
      expect(result.starters).toHaveLength(11);
      expect(result.bench).toHaveLength(4);
      expect(result.formation).toBeTruthy();
      expect(result.totalProjectedPoints).toBeGreaterThan(0);
      expect(result.flags).toBeDefined();
    });

    it('should have 1 GK in starters', () => {
      const result = findBestXI(mockSquad, projections, 3);
      const gkCount = result.starters.filter(p => p.element_type === 1).length;
      expect(gkCount).toBe(1);
    });

    it('should have valid defender count (3-5)', () => {
      const result = findBestXI(mockSquad, projections, 3);
      const defCount = result.starters.filter(p => p.element_type === 2).length;
      expect(defCount).toBeGreaterThanOrEqual(3);
      expect(defCount).toBeLessThanOrEqual(5);
    });

    it('should have valid midfielder count (2-5)', () => {
      const result = findBestXI(mockSquad, projections, 3);
      const midCount = result.starters.filter(p => p.element_type === 3).length;
      expect(midCount).toBeGreaterThanOrEqual(2);
      expect(midCount).toBeLessThanOrEqual(5);
    });

    it('should have valid forward count (1-3)', () => {
      const result = findBestXI(mockSquad, projections, 3);
      const fwdCount = result.starters.filter(p => p.element_type === 4).length;
      expect(fwdCount).toBeGreaterThanOrEqual(1);
      expect(fwdCount).toBeLessThanOrEqual(3);
    });

    it('should sort bench with GK first', () => {
      const result = findBestXI(mockSquad, projections, 3);
      if (result.bench.length > 1) {
        expect(result.bench[0].element_type).toBe(1); // GK first
      }
    });

    it('should include captain and vice-captain IDs', () => {
      const result = findBestXI(mockSquad, projections, 3);
      // These will be set by selectCaptainAndVice
      expect(result.captainId).toBeNull();
      expect(result.viceCaptainId).toBeNull();
    });
  });

  describe('selectCaptainAndVice', () => {
    it('should select captain and vice from different clubs', () => {
      const bestXI = findBestXI(mockSquad, projections, 3);
      const teamMap = new Map(mockTeams.map(t => [t.id, { id: t.id, name: t.name, short_name: t.short_name }]));
      const fixtureMap = new Map(mockFixtures.map(f => [f.id, { 
        id: f.id, 
        kickoff_time: f.kickoff_time, 
        team_h: f.team_h, 
        team_a: f.team_a 
      }]));
      
      const { captainId, viceCaptainId, captainOptions } = selectCaptainAndVice(
        bestXI.starters,
        projections,
        3,
        teamMap,
        fixtureMap
      );
      
      expect(captainId).toBeTruthy();
      expect(viceCaptainId).toBeTruthy();
      expect(captainOptions).toHaveLength(3);
      expect(captainOptions[0].isCaptain).toBe(true);
      
      // Captain and vice should be different players
      if (captainId !== viceCaptainId) {
        const captain = captainOptions.find(o => o.playerId === captainId);
        const vice = captainOptions.find(o => o.playerId === viceCaptainId);
        // Should be from different clubs or different fixtures
        expect(captain?.team).not.toBe(vice?.team);
      }
    });

    it('should rank top 3 by projected points', () => {
      const bestXI = findBestXI(mockSquad, projections, 3);
      const teamMap = new Map(mockTeams.map(t => [t.id, { id: t.id, name: t.name, short_name: t.short_name }]));
      const fixtureMap = new Map(mockFixtures.map(f => [f.id, { 
        id: f.id, 
        kickoff_time: f.kickoff_time, 
        team_h: f.team_h, 
        team_a: f.team_a 
      }]));
      
      const { captainOptions } = selectCaptainAndVice(
        bestXI.starters,
        projections,
        3,
        teamMap,
        fixtureMap
      );
      
      // Should be sorted by projected points descending
      expect(captainOptions[0].projectedPoints).toBeGreaterThanOrEqual(captainOptions[1].projectedPoints);
      expect(captainOptions[1].projectedPoints).toBeGreaterThanOrEqual(captainOptions[2].projectedPoints);
    });
  });
});