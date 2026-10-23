// Pricing Module: Calculate purchase and selling prices for players
// Based on transfer history and price changes

import { CONFIG } from './config';
import type { Element, Transfer } from './schemas';

export interface PlayerPrice {
  playerId: number;
  purchasePrice: number; // Price when bought (in tenths of millions)
  currentPrice: number;  // Current now_cost
  sellingPrice: number;  // Price if sold now
  profit: number;        // Profit if sold (sellingPrice - purchasePrice)
  priceRisen: boolean;   // Whether price has risen since purchase
}

/**
 * Calculate purchase price for each player in the squad
 * Uses transfer history to find element_in_cost, falls back to (now_cost - cost_change_start)
 */
export function calculatePurchasePrices(
  squadPlayers: Element[],
  transfers: Transfer[]
): Map<number, number> {
  const purchasePrices = new Map<number, number>();
  
  // Build a map of player -> purchase price from transfer history
  // We need the FIRST time each player was bought (element_in_cost)
  const firstPurchasePrice = new Map<number, number>();
  
  for (const transfer of transfers) {
    // Only record the first purchase of each player
    if (!firstPurchasePrice.has(transfer.element_in)) {
      firstPurchasePrice.set(transfer.element_in, transfer.element_in_cost);
    }
  }
  
  for (const player of squadPlayers) {
    const firstPrice = firstPurchasePrice.get(player.id);
    
    if (firstPrice !== undefined) {
      // We have transfer history for this player
      purchasePrices.set(player.id, firstPrice);
    } else {
      // Player held since start of season (or before transfer history)
      // Purchase price = current price - total price change since start
      // cost_change_start is the total price change since season start (can be negative)
      const purchasePrice = player.now_cost - player.cost_change_start;
      purchasePrices.set(player.id, purchasePrice);
    }
  }
  
  return purchasePrices;
}

/**
 * Calculate selling price for a player
 * FPL rule: selling price = purchase price + floor((current - purchase) / 2) if price risen
 * Otherwise selling price = current price
 */
export function calculateSellingPrice(purchasePrice: number, currentPrice: number): number {
  if (currentPrice > purchasePrice) {
    const profit = currentPrice - purchasePrice;
    const sellProfit = Math.floor(profit / 2);
    return purchasePrice + sellProfit;
  }
  return currentPrice;
}

/**
 * Calculate all prices for a squad
 */
export function calculateAllPrices(
  squadPlayers: Element[],
  transfers: Transfer[]
): PlayerPrice[] {
  const purchasePrices = calculatePurchasePrices(squadPlayers, transfers);
  
  return squadPlayers.map(player => {
    const purchasePrice = purchasePrices.get(player.id) || player.now_cost;
    const sellingPrice = calculateSellingPrice(purchasePrice, player.now_cost);
    const profit = sellingPrice - purchasePrice;
    
    return {
      playerId: player.id,
      purchasePrice,
      currentPrice: player.now_cost,
      sellingPrice,
      profit,
      priceRisen: player.now_cost > purchasePrice,
    };
  });
}

/**
 * Get selling price for a single player (for transfer calculations)
 */
export function getSellingPrice(player: Element, purchasePrice: number): number {
  return calculateSellingPrice(purchasePrice, player.now_cost);
}

/**
 * Format price for display (convert from tenths of millions to millions)
 */
export function formatPrice(price: number): string {
  return (price / 10).toFixed(1);
}

/**
 * Calculate available budget for transfers
 * bank + sum of selling prices of players to sell - sum of purchase prices of players to buy
 */
export function calculateTransferBudget(
  bank: number,
  sellingPrices: number[],
  buyingPrices: number[]
): number {
  const totalSelling = sellingPrices.reduce((sum, p) => sum + p, 0);
  const totalBuying = buyingPrices.reduce((sum, p) => sum + p, 0);
  return bank + totalSelling - totalBuying;
}