// Unit tests for Pricing Module

import {
  calculatePurchasePrices,
  calculateSellingPrice,
  calculateAllPrices,
  getSellingPrice,
  formatPrice,
  calculateTransferBudget,
} from '../pricing';
import type { Element, Transfer } from '../schemas';
import { createMockPlayer, mockTransfers } from './fixtures';

describe('Pricing Module', () => {
  describe('calculateSellingPrice', () => {
    it('should return current price when price has not risen', () => {
      const purchasePrice = 80;
      const currentPrice = 80;
      
      const sellingPrice = calculateSellingPrice(purchasePrice, currentPrice);
      
      expect(sellingPrice).toBe(80);
    });

    it('should return current price when price has fallen', () => {
      const purchasePrice = 80;
      const currentPrice = 75;
      
      const sellingPrice = calculateSellingPrice(purchasePrice, currentPrice);
      
      expect(sellingPrice).toBe(75);
    });

    it('should calculate correct selling price when price risen by 2', () => {
      const purchasePrice = 80;
      const currentPrice = 82;
      
      const sellingPrice = calculateSellingPrice(purchasePrice, currentPrice);
      
      // Profit = 2, half = 1, selling = 80 + 1 = 81
      expect(sellingPrice).toBe(81);
    });

    it('should calculate correct selling price when price risen by 3', () => {
      const purchasePrice = 80;
      const currentPrice = 83;
      
      const sellingPrice = calculateSellingPrice(purchasePrice, currentPrice);
      
      // Profit = 3, half = 1 (floor), selling = 80 + 1 = 81
      expect(sellingPrice).toBe(81);
    });

    it('should calculate correct selling price when price risen by 10', () => {
      const purchasePrice = 100;
      const currentPrice = 110;
      
      const sellingPrice = calculateSellingPrice(purchasePrice, currentPrice);
      
      // Profit = 10, half = 5, selling = 100 + 5 = 105
      expect(sellingPrice).toBe(105);
    });
  });

  describe('calculatePurchasePrices', () => {
    const transfers: Transfer[] = [
      { element_in: 1, element_in_cost: 50, element_out: 99, element_out_cost: 45, entry: 1, event: 1, time: '2024-08-01T10:00:00Z' },
      { element_in: 2, element_in_cost: 60, element_out: 98, element_out_cost: 55, entry: 1, event: 1, time: '2024-08-01T10:00:00Z' },
      { element_in: 1, element_in_cost: 55, element_out: 97, element_out_cost: 50, entry: 1, event: 2, time: '2024-08-10T10:00:00Z' }, // Second purchase of player 1
    ];

    it('should use first transfer element_in_cost as purchase price', () => {
      const players = [
        createMockPlayer({ id: 1, now_cost: 55, cost_change_start: 5 }), // Bought for 5.0, now 5.5
        createMockPlayer({ id: 2, now_cost: 65, cost_change_start: 5 }), // Bought for 6.0, now 6.5
        createMockPlayer({ id: 3, now_cost: 70, cost_change_start: 0 }),  // No transfer history, held from start
      ];
      
      const prices = calculatePurchasePrices(players, transfers);
      
      expect(prices.get(1)).toBe(50); // First purchase price
      expect(prices.get(2)).toBe(60); // First purchase price
      expect(prices.get(3)).toBe(70); // now_cost - cost_change_start = 70 - 0 = 70
    });

    it('should handle players with no transfer history', () => {
      const players = [
        createMockPlayer({ id: 10, now_cost: 80, cost_change_start: 10 }), // Price risen 1.0 since start
      ];
      
      const prices = calculatePurchasePrices(players, []);
      
      expect(prices.get(10)).toBe(70); // 80 - 10 = 70
    });
  });

  describe('calculateAllPrices', () => {
    it('should calculate prices for all squad players', () => {
      const squad = [
        createMockPlayer({ id: 1, now_cost: 55, cost_change_start: 5 }),  // Bought 5.0, now 5.5
        createMockPlayer({ id: 2, now_cost: 65, cost_change_start: 5 }),  // Bought 6.0, now 6.5
        createMockPlayer({ id: 3, now_cost: 70, cost_change_start: 0 }),  // Held from start
      ];
      
      const transfers: Transfer[] = [
        { element_in: 1, element_in_cost: 50, element_out: 99, element_out_cost: 45, entry: 1, event: 1, time: '2024-08-01T10:00:00Z' },
        { element_in: 2, element_in_cost: 60, element_out: 98, element_out_cost: 55, entry: 1, event: 1, time: '2024-08-01T10:00:00Z' },
      ];
      
      const prices = calculateAllPrices(squad, transfers);
      
      expect(prices).toHaveLength(3);
      
      // Player 1: bought 5.0, now 5.5, profit 0.5, sell profit 0.2 (floor) = 5.2
      expect(prices[0].purchasePrice).toBe(50);
      expect(prices[0].currentPrice).toBe(55);
      expect(prices[0].sellingPrice).toBe(52);
      expect(prices[0].profit).toBe(2);
      expect(prices[0].priceRisen).toBe(true);
      
      // Player 2: bought 6.0, now 6.5, profit 0.5, sell profit 0.2 = 6.2
      expect(prices[1].purchasePrice).toBe(60);
      expect(prices[1].sellingPrice).toBe(62);
      
      // Player 3: held from start, purchase = 70, no rise
      expect(prices[2].purchasePrice).toBe(70);
      expect(prices[2].sellingPrice).toBe(70);
      expect(prices[2].priceRisen).toBe(false);
    });
  });

  describe('getSellingPrice', () => {
    it('should return selling price for a single player', () => {
      const player = createMockPlayer({ id: 1, now_cost: 55 });
      const purchasePrice = 50;
      
      const sellingPrice = getSellingPrice(player, purchasePrice);
      
      expect(sellingPrice).toBe(52);
    });
  });

  describe('formatPrice', () => {
    it('should format price in millions with 1 decimal', () => {
      expect(formatPrice(50)).toBe('5.0');
      expect(formatPrice(55)).toBe('5.5');
      expect(formatPrice(100)).toBe('10.0');
      expect(formatPrice(123)).toBe('12.3');
    });
  });

  describe('calculateTransferBudget', () => {
    it('should calculate available budget correctly', () => {
      const bank = 10; // 1.0m
      const sellingPrices = [52, 62]; // 5.2m + 6.2m = 11.4m
      const buyingPrices = [80, 70];  // 8.0m + 7.0m = 15.0m
      
      const budget = calculateTransferBudget(bank, sellingPrices, buyingPrices);
      
      // 1.0 + 11.4 - 15.0 = -2.6
      expect(budget).toBe(-26);
    });

    it('should return positive budget when selling more than buying', () => {
      const bank = 10;
      const sellingPrices = [100, 100]; // 20.0m
      const buyingPrices = [80, 70];    // 15.0m
      
      const budget = calculateTransferBudget(bank, sellingPrices, buyingPrices);
      
      // 1.0 + 20.0 - 15.0 = 6.0
      expect(budget).toBe(60);
    });
  });
});