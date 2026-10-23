// API Route: /api/players
// Searchable player list for manual comparison

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchPlayers } from '@/lib/analysis';

const PlayersQuerySchema = z.object({
  pos: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined).refine(val => !val || (val >= 1 && val <= 4), 'Position must be 1-4'),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined).refine(val => !val || (val >= 3.5 && val <= 15), 'Max price must be 3.5-15'),
  minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined).refine(val => !val || (val >= 3.5 && val <= 15), 'Min price must be 3.5-15'),
  team: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined).refine(val => !val || (val >= 1 && val <= 20), 'Team must be 1-20'),
  sort: z.string().optional().refine(val => !val || ['xp', 'horizon', 'price', 'form', 'total'].includes(val), 'Invalid sort'),
  gw: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined).refine(val => !val || (val >= 1 && val <= 38), 'Gameweek must be 1-38'),
  horizon: z.string().optional().transform(val => val ? parseInt(val, 10) : 4).refine(val => val >= 1 && val <= 10, 'Horizon must be 1-10'),
  refresh: z.string().optional().transform(val => val === 'true'),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    
    const validation = PlayersQuerySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { pos, maxPrice, minPrice, team, sort, gw, horizon, refresh } = validation.data;
    
    const players = await searchPlayers({
      position: pos,
      maxPrice,
      minPrice,
      team,
      sort: sort as 'xp' | 'horizon' | 'price' | 'form' | 'total' | undefined,
      gameweek: gw,
      horizonGameweeks: horizon,
      bypassCache: refresh,
    });
    
    // Return only essential fields for the player list
    const simplified = players.map(p => ({
      id: p.id,
      web_name: p.web_name,
      team: p.team,
      element_type: p.element_type,
      now_cost: p.now_cost,
      status: p.status,
      chance_of_playing_next_round: p.chance_of_playing_next_round,
      form: p.form,
      points_per_game: p.points_per_game,
      total_points: p.total_points,
      minutes: p.minutes,
      starts: p.starts,
      expected_goals_per_90: p.expected_goals_per_90,
      expected_assists_per_90: p.expected_assists_per_90,
      expected_goals_conceded_per_90: p.expected_goals_conceded_per_90,
      penalties_order: p.penalties_order,
      corners_and_indirect_freekicks_order: p.corners_and_indirect_freekicks_order,
      direct_freekicks_order: p.direct_freekicks_order,
      selected_by_percent: p.selected_by_percent,
      ep_next: p.ep_next,
      transfers_in_event: p.transfers_in_event,
      transfers_out_event: p.transfers_out_event,
      cost_change_event: p.cost_change_event,
      _projectedUpcoming: '_projectedUpcoming' in p ? (p as { _projectedUpcoming?: number })._projectedUpcoming : undefined,
      _projectedHorizon: '_projectedHorizon' in p ? (p as { _projectedHorizon?: number })._projectedHorizon : undefined,
    }));
    
    return NextResponse.json({ players: simplified }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
    
  } catch (error) {
    console.error('Players search error:', error);
    return NextResponse.json(
      { error: 'Failed to search players' },
      { status: 500 }
    );
  }
}