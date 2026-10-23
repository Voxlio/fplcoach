// API Route: /api/team
// Returns full team analysis for the given team ID

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeTeam, type TeamAnalysisInput } from '@/lib/analysis';

// Query parameter validation
const TeamQuerySchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0, 'Invalid team ID'),
  fts: z.string().optional().transform(val => val ? parseInt(val, 10) : 1).refine(val => val >= 1 && val <= 5, 'Free transfers must be 1-5'),
  bank: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  horizon: z.string().optional().transform(val => val ? parseInt(val, 10) : 4).refine(val => val >= 1 && val <= 10, 'Horizon must be 1-10'),
  refresh: z.string().optional().transform(val => val === 'true'),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    
    // Validate query params
    const validation = TeamQuerySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { id, fts, bank, horizon, refresh } = validation.data;
    
    // Analyze team
    const input: TeamAnalysisInput = {
      entryId: id,
      freeTransfers: fts,
      bank,
      horizonGameweeks: horizon,
      bypassCache: refresh,
    };
    
    const result = await analyzeTeam(input);
    
    // Transform for JSON serialization (convert Maps to objects)
    const response = {
      ...result,
      flags: Object.fromEntries(result.flags),
      squad: result.squad.map(p => ({
        ...p,
        // Don't send all element fields to reduce payload
        // UI only needs key fields
      })),
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      },
    });
    
  } catch (error) {
    console.error('Team analysis error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('FPL API error: 404')) {
        return NextResponse.json(
          { error: 'Team not found. Check your team ID.' },
          { status: 404 }
        );
      }
      if (error.message.includes('FPL API error: 429')) {
        return NextResponse.json(
          { error: 'FPL API rate limited. Please wait a moment.' },
          { status: 429 }
        );
      }
      if (error.message.includes('validation failed')) {
        return NextResponse.json(
          { error: 'FPL API data format changed. Please report this issue.' },
          { status: 502 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze team. Please try again.' },
      { status: 500 }
    );
  }
}