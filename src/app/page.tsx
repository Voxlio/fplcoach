'use client';

import { useState, useEffect, useCallback } from 'react';

// Types matching our API responses
interface Element {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  status: string;
  chance_of_playing_next_round: number | null;
  form: string;
  points_per_game: string;
  total_points: number;
  minutes: number;
  starts: number;
  expected_goals_per_90: number;
  expected_assists_per_90: number;
  expected_goals_conceded_per_90: number;
  penalties_order: number;
  corners_and_indirect_freekicks_order: number;
  direct_freekicks_order: number;
  selected_by_percent: string;
  ep_next: string;
  transfers_in_event: number;
  transfers_out_event: number;
  cost_change_event: number;
  // Added by API response
  _projectedUpcoming?: number;
  _projectedHorizon?: number;
}

interface PlayerFlag {
  playerId: number;
  type: 'injury' | 'bad_fixture' | 'price_fall' | 'not_starting' | 'bench_only';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

interface BestXIResult {
  formation: { gk: number; def: number; mid: number; fwd: number };
  starters: Element[];
  bench: Element[];
  captainId: number;
  viceCaptainId: number;
  totalProjectedPoints: number;
  flags: PlayerFlag[];
}

interface TransferSuggestion {
  out: Element;
  in: Element;
  priceChange: number;
  projectedGainUpcoming: number;
  projectedGainHorizon: number;
  newBank: number;
  reason: string;
  isHit: boolean;
  hitCost: number;
  netGain: number;
}

interface TransferAnalysis {
  singleTransfers: TransferSuggestion[];
  doubleTransfers: Array<{
    transfer1: TransferSuggestion;
    transfer2: TransferSuggestion;
    combinedGain: number;
    combinedCost: number;
    newBank: number;
  }>;
  rollTransfer: {
    shouldRoll: boolean;
    reason: string;
    bestGain: number;
  };
}

interface ChipRecommendation {
  recommended: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}

interface ChipAdvice {
  wildcard: ChipRecommendation;
  freeHit: ChipRecommendation;
  benchBoost: ChipRecommendation;
  tripleCaptain: ChipRecommendation;
  summary: string;
}

interface TeamAnalysis {
  entry: {
    id: number;
    name: string;
    player_first_name: string;
    player_last_name: string;
    summary_overall_points: number;
    summary_overall_rank: number;
  };
  upcomingGameweek: number;
  horizonGameweeks: number;
  bank: number;
  freeTransfers: number;
  squad: Element[];
  bestXI: BestXIResult;
  transfers: TransferAnalysis;
  captainOptions: Array<{ player: Element; projectedPoints: number; isVice?: boolean }>;
  chips: ChipAdvice;
  flags: Record<number, PlayerFlag[]>;
  totalValue: number;
}

type Tab = 'squad' | 'transfers' | 'captain' | 'chips' | 'players';

const POSITION_NAMES: Record<number, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

const POSITION_COLORS: Record<number, string> = {
  1: 'bg-blue-900/30 text-blue-300',
  2: 'bg-green-900/30 text-green-300',
  3: 'bg-yellow-900/30 text-yellow-300',
  4: 'bg-red-900/30 text-red-300',
};

function formatPrice(cost: number): string {
  return `£${(cost / 10).toFixed(1)}m`;
}

function getFlagColor(severity: string): string {
  switch (severity) {
    case 'high': return 'bg-red-900/50 text-red-200 border-red-700';
    case 'medium': return 'bg-yellow-900/50 text-yellow-200 border-yellow-700';
    case 'low': return 'bg-blue-900/50 text-blue-200 border-blue-700';
    default: return 'bg-gray-700 text-gray-200 border-gray-600';
  }
}

function getFlagIcon(type: string): string {
  switch (type) {
    case 'injury': return '🏥';
    case 'bad_fixture': return '⚔️';
    case 'price_fall': return '📉';
    case 'not_starting': return '🪑';
    case 'bench_only': return '📋';
    default: return '⚠️';
  }
}

function ChipCard({ title, icon, recommendation, usedChips, chipKey }: {
  title: string;
  icon: string;
  recommendation: ChipRecommendation;
  usedChips: Set<string>;
  chipKey: string;
}) {
  const isUsed = usedChips.has(chipKey);
  const bgColor = recommendation.recommended ? 'bg-green-900/30 border-green-700' : 'bg-gray-800 border-gray-700';
  const textColor = recommendation.recommended ? 'text-green-200' : 'text-gray-300';
  
  return (
    <div className={`p-4 rounded-xl border ${bgColor} ${isUsed ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{title}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${recommendation.recommended ? 'bg-green-900/50 text-green-200' : 'bg-gray-700 text-gray-300'}`}>
              {recommendation.recommended ? 'RECOMMENDED' : 'NOT RECOMMENDED'}
            </span>
            {isUsed && <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-200">USED</span>}
          </div>
          <p className={`mt-2 text-sm ${textColor}`}>{recommendation.reason}</p>
          {recommendation.details && <p className="mt-1 text-xs text-gray-400">{recommendation.details}</p>}
          <p className="mt-2 text-xs text-gray-500">Confidence: <span className="capitalize">{recommendation.confidence}</span></p>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      <p className="mt-4 text-gray-400">Analyzing your team...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold mb-2">Error</h2>
      <p className="text-gray-400 mb-6 max-w-md">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

function TeamIdForm({ onSubmit }: { onSubmit: (id: string) => void }) {
  const [teamId, setTeamId] = useState('');
  const [savedId, setSavedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fpl-team-id');
    }
    return null;
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamId.trim()) {
      localStorage.setItem('fpl-team-id', teamId.trim());
      onSubmit(teamId.trim());
    }
  };
  
  if (savedId && !teamId) {
    return (
      <div className="max-w-md mx-auto p-6 bg-gray-900 rounded-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-center">Welcome back!</h2>
        <p className="text-gray-400 text-center mb-4">
          Your saved team ID: <span className="font-mono text-white">{savedId}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(savedId)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Load Analysis
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('fpl-team-id');
              setSavedId(null);
            }}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            Change
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-4">
          Team ID is stored locally in your browser and never sent to our servers.
        </p>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto p-6 bg-gray-900 rounded-xl border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-center">FPL Coach</h2>
      <p className="text-gray-400 text-center mb-6">
        Enter your FPL Team ID to get personalized gameweek analysis.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          placeholder="e.g. 1234567"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          autoFocus
        />
        <button
          type="submit"
          disabled={!teamId.trim()}
          className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          Analyze Team
        </button>
      </form>
      <p className="text-xs text-gray-500 text-center mt-4">
        Team ID is stored locally in your browser and never sent to our servers.
      </p>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<TeamAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('squad');
  const [fts, setFts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fpl-fts');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });
  const [bank, setBank] = useState<number | undefined>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fpl-bank');
      return saved ? parseInt(saved, 10) : undefined;
    }
    return undefined;
  });
  const [horizon, setHorizon] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fpl-horizon');
      return saved ? parseInt(saved, 10) : 4;
    }
    return 4;
  });
  const [usedChips, setUsedChips] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fpl-used-chips');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  const [teamId, setTeamId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fpl-team-id');
    }
    return null;
  });
  
  const fetchAnalysis = async (refresh = false) => {
    if (!teamId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        id: teamId,
        fts: fts.toString(),
        horizon: horizon.toString(),
        refresh: refresh.toString(),
      });
      if (bank !== undefined) params.set('bank', bank.toString());
      
      const response = await fetch(`/api/team?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze team');
      }
      
      setData(result);
      if (result.entry) {
        // Update used chips from entry history
        // This would come from the entry history in a real implementation
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTeamIdSubmit = (id: string) => {
    setTeamId(id);
    fetchAnalysis();
  };
  
  const handleSettingsChange = () => {
    localStorage.setItem('fpl-fts', fts.toString());
    localStorage.setItem('fpl-bank', bank?.toString() || '');
    localStorage.setItem('fpl-horizon', horizon.toString());
    fetchAnalysis();
  };
  
  const handleChipToggle = (chipKey: string) => {
    const newChips = new Set(usedChips);
    if (newChips.has(chipKey)) {
      newChips.delete(chipKey);
    } else {
      newChips.add(chipKey);
    }
    setUsedChips(newChips);
    localStorage.setItem('fpl-used-chips', JSON.stringify([...newChips]));
  };
  
  if (!teamId) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">FPL Coach</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <TeamIdForm onSubmit={handleTeamIdSubmit} />
        </main>
      </div>
    );
  }
  
  if (loading && !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">FPL Coach</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <LoadingState />
        </main>
      </div>
    );
  }
  
  if (error && !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">FPL Coach</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <ErrorState message={error} onRetry={() => fetchAnalysis(true)} />
        </main>
      </div>
    );
  }
  
  // Main dashboard with data
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'squad', label: 'Squad', icon: '👥' },
    { id: 'transfers', label: 'Transfers', icon: '🔄' },
    { id: 'captain', label: 'Captain', icon: '🎯' },
    { id: 'chips', label: 'Chips', icon: '🎲' },
    { id: 'players', label: 'Players', icon: '🔍' },
  ];
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">FPL Coach</h1>
          <div className="flex items-center gap-4">
            {data && (
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>GW{data.upcomingGameweek}</span>
                <span className="px-2 py-1 bg-gray-800 rounded">£{data.bank / 10}m</span>
                <span className="px-2 py-1 bg-gray-800 rounded">{data.freeTransfers} FT</span>
                <span className="px-2 py-1 bg-gray-800 rounded">{data.horizonGameweeks} GW horizon</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Settings bar */}
        <div className="max-w-6xl mx-auto px-4 pb-3 border-b border-gray-800">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Free Transfers:</label>
              <select
                value={fts}
                onChange={(e) => { setFts(parseInt(e.target.value, 10)); handleSettingsChange(); }}
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Bank:</label>
              <input
                type="number"
                value={bank ?? ''}
                onChange={(e) => { 
                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                  setBank(val); 
                  handleSettingsChange();
                }}
                placeholder="Auto"
                className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Horizon:</label>
              <select
                value={horizon}
                onChange={(e) => { setHorizon(parseInt(e.target.value, 10)); handleSettingsChange(); }}
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} GW</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Used Chips:</label>
              <div className="flex gap-1">
                {['wildcard', 'freehit', 'bboost', '3xc'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleChipToggle(chip)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      usedChips.has(chip)
                        ? 'bg-red-900/50 text-red-200'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {chip === 'wildcard' ? 'WC' : chip === 'freehit' ? 'FH' : chip === 'bboost' ? 'BB' : 'TC'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => fetchAnalysis(true)}
              disabled={loading}
              className="ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-sm font-medium transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <nav className="max-w-6xl mx-auto px-4" aria-label="Main tabs">
          <ul className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide" role="tablist">
            {tabs.map(tab => (
              <li key={tab.id} role="presentation">
                <button
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchAnalysis(true)} className="text-sm underline hover:text-red-100">Retry</button>
          </div>
        )}
        
        {data && (
          <>
            {/* Team header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{data.entry.name}</h2>
                <p className="text-gray-400">
                  {data.entry.player_first_name} {data.entry.player_last_name} • 
                  {data.entry.summary_overall_points.toLocaleString()} pts • 
                  OR: {data.entry.summary_overall_rank.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-300">£{(data.totalValue / 10).toFixed(1)}m</p>
                <p className="text-gray-400 text-sm">Squad Value</p>
              </div>
            </div>
            
            {/* Tab content */}
            {activeTab === 'squad' && <SquadTab data={data} />}
            {activeTab === 'transfers' && <TransfersTab data={data} />}
            {activeTab === 'captain' && <CaptainTab data={data} />}
            {activeTab === 'chips' && <ChipsTab data={data} usedChips={usedChips} />}
            {activeTab === 'players' && <PlayersTab />}
          </>
        )}
      </main>
    </div>
  );
}

function SquadTab({ data }: { data: TeamAnalysis }) {
  const { bestXI, flags, squad } = data;
  
  // Compute problem players
  const problemPlayers = bestXI.starters.filter(p => (flags[p.id] || []).some(f => f.severity === 'high'));
  
  return (
    <div className="space-y-6">
      {/* Best XI */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-blue-400">⚽</span> Best XI ({bestXI.formation.gk}-{bestXI.formation.def}-{bestXI.formation.mid}-{bestXI.formation.fwd})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="p-3 font-medium">Player</th>
                <th className="p-3 font-medium text-right">Price</th>
                <th className="p-3 font-medium text-right">Season Pts</th>
                <th className="p-3 font-medium text-right">Form</th>
                <th className="p-3 font-medium text-right">xP (GW{data.upcomingGameweek})</th>
              </tr>
            </thead>
            <tbody>
              {bestXI.starters.map((player) => {
                const isCaptain = player.id === bestXI.captainId;
                const isVice = player.id === bestXI.viceCaptainId;
                const playerFlags = flags[player.id] || [];
                const projectedPoints = player._projectedUpcoming || 0;
                return (
                  <tr key={player.id} className={isCaptain ? 'bg-blue-900/20' : isVice ? 'bg-yellow-900/20' : ''}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${POSITION_COLORS[player.element_type]}`}>
                          {POSITION_NAMES[player.element_type]}
                        </span>
                        <span className={`font-medium ${isCaptain ? 'text-blue-300' : isVice ? 'text-yellow-300' : ''}`}>
                          {player.web_name}
                          {isCaptain && <span className="ml-1 text-blue-400">(C)</span>}
                          {isVice && <span className="ml-1 text-yellow-400">(VC)</span>}
                        </span>
                        {playerFlags.length > 0 && (
                          <div className="flex gap-1 ml-auto">
                            {playerFlags.slice(0, 3).map((flag, i) => (
                              <span
                                key={i}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getFlagColor(flag.severity)}`}
                                title={flag.message}
                              >
                                {getFlagIcon(flag.type)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-gray-400">{formatPrice(player.now_cost)}</td>
                    <td className="p-3 text-right text-gray-400">{player.total_points}</td>
                    <td className="p-3 text-right text-gray-400">{player.form}</td>
                    <td className="p-3 text-right font-medium text-green-300">{projectedPoints.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-700 font-semibold">
                <td className="p-3">Total Projected</td>
                <td className="p-3 text-right"></td>
                <td className="p-3 text-right"></td>
                <td className="p-3 text-right"></td>
                <td className="p-3 text-right text-green-300">{bestXI.totalProjectedPoints.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      
      {/* Bench */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-gray-400">🪑</span> Bench (Ordered by Priority)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="p-3 font-medium">#</th>
                <th className="p-3 font-medium">Player</th>
                <th className="p-3 font-medium text-right">Price</th>
                <th className="p-3 font-medium text-right">Season Pts</th>
                <th className="p-3 font-medium text-right">Form</th>
                <th className="p-3 font-medium text-right">xP (GW{data.upcomingGameweek})</th>
              </tr>
            </thead>
            <tbody>
              {bestXI.bench.map((player, idx) => {
                const playerFlags = flags[player.id] || [];
                const projectedPoints = player._projectedUpcoming || 0;
                return (
                  <tr key={player.id} className="bg-gray-900/50">
                    <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${POSITION_COLORS[player.element_type]}`}>
                          {POSITION_NAMES[player.element_type]}
                        </span>
                        <span className="font-medium">{player.web_name}</span>
                        {playerFlags.length > 0 && (
                          <div className="flex gap-1 ml-auto">
                            {playerFlags.slice(0, 2).map((flag, i) => (
                              <span
                                key={i}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getFlagColor(flag.severity)}`}
                                title={flag.message}
                              >
                                {getFlagIcon(flag.type)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-gray-400">{formatPrice(player.now_cost)}</td>
                    <td className="p-3 text-right text-gray-400">{player.total_points}</td>
                    <td className="p-3 text-right text-gray-400">{player.form}</td>
                    <td className="p-3 text-right font-medium text-green-300">{projectedPoints.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Problem Players */}
      {problemPlayers.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-300">
            <span>⚠️</span> Problem Starters ({problemPlayers.length})
          </h3>
          <div className="space-y-2">
            {problemPlayers.map(player => {
              const playerFlags = (flags[player.id] || []).filter(f => f.severity === 'high');
              return (
                <div key={player.id} className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${POSITION_COLORS[player.element_type]}`}>
                      {POSITION_NAMES[player.element_type]}
                    </span>
                    <span className="font-medium">{player.web_name}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {playerFlags.map((flag, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-red-900/50 text-red-200 rounded" title={flag.message}>
                        {getFlagIcon(flag.type)} {flag.message}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function TransfersTab({ data }: { data: TeamAnalysis }) {
  const { transfers } = data;
  
  return (
    <div className="space-y-6">
      {/* Roll advice */}
      <div className={`p-4 rounded-xl border ${transfers.rollTransfer.shouldRoll ? 'bg-green-900/30 border-green-700' : 'bg-yellow-900/30 border-yellow-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{transfers.rollTransfer.shouldRoll ? '📋 Roll Transfer' : '⚡ Make a Transfer'}</h3>
            <p className="text-gray-400 text-sm mt-1">{transfers.rollTransfer.reason}</p>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium ${transfers.rollTransfer.shouldRoll ? 'bg-green-900/50 text-green-200' : 'bg-yellow-900/50 text-yellow-200'}`}>
            Best Gain: {transfers.rollTransfer.bestGain.toFixed(1)} pts
          </span>
        </div>
      </div>
      
      {/* Single Transfers */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-blue-400">1️⃣</span> Best Single Transfers
        </h3>
        {transfers.singleTransfers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No valid transfers found within budget.</p>
        ) : (
          <div className="space-y-3">
            {transfers.singleTransfers.slice(0, 10).map((t, idx) => (
              <div key={`${t.out.id}-${t.in.id}`} className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">#{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {t.isHit && <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-200 rounded">HIT (-4)</span>}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.netGain > 0 ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
                      Net: {t.netGain > 0 ? '+' : ''}{t.netGain.toFixed(1)} pts
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <p className="text-xs text-red-300 mb-1">OUT</p>
                    <p className="font-medium">{t.out.web_name}</p>
                    <p className="text-sm text-gray-400">{formatPrice(t.out.now_cost)} • {t.out.total_points} pts • {t.out.form} form</p>
                    <p className="text-xs text-gray-500 mt-1">xP: {t.out._projectedUpcoming?.toFixed(1) || '0'}</p>
                  </div>
                  <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <p className="text-xs text-green-300 mb-1">IN</p>
                    <p className="font-medium">{t.in.web_name}</p>
                    <p className="text-sm text-gray-400">{formatPrice(t.in.now_cost)} • {t.in.total_points} pts • {t.in.form} form</p>
                    <p className="text-xs text-gray-500 mt-1">xP: {t.in._projectedUpcoming?.toFixed(1) || '0'}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Price Change</p>
                    <p className="font-medium">{t.priceChange > 0 ? '+' : ''}{formatPrice(t.priceChange * 10)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Horizon Gain</p>
                    <p className="font-medium text-green-300">{t.projectedGainHorizon > 0 ? '+' : ''}{t.projectedGainHorizon.toFixed(1)} pts</p>
                  </div>
                  <div>
                    <p className="text-gray-400">New Bank</p>
                    <p className="font-medium">£{(t.newBank / 10).toFixed(1)}m</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">{t.reason}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Double Transfers */}
      {transfers.doubleTransfers.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-400">2️⃣</span> Best Double Transfers (2 FTs)
          </h3>
          <div className="space-y-3">
            {transfers.doubleTransfers.slice(0, 5).map((d, idx) => (
              <div key={idx} className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">#{idx + 1}</span>
                  <span className="px-3 py-1 rounded text-sm font-medium bg-purple-900/50 text-purple-200">
                    Combined Gain: {d.combinedGain > 0 ? '+' : ''}{d.combinedGain.toFixed(1)} pts
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <p className="text-xs text-red-300 mb-1">Transfer 1</p>
                    <p className="font-medium">{d.transfer1.out.web_name} → {d.transfer1.in.web_name}</p>
                    <p className="text-xs text-gray-400">Net: {d.transfer1.netGain > 0 ? '+' : ''}{d.transfer1.netGain.toFixed(1)} pts</p>
                  </div>
                  <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <p className="text-xs text-red-300 mb-1">Transfer 2</p>
                    <p className="font-medium">{d.transfer2.out.web_name} → {d.transfer2.in.web_name}</p>
                    <p className="text-xs text-gray-400">Net: {d.transfer2.netGain > 0 ? '+' : ''}{d.transfer2.netGain.toFixed(1)} pts</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Total Cost</p>
                    <p className="font-medium">{d.combinedCost > 0 ? '+' : ''}{formatPrice(d.combinedCost * 10)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">New Bank</p>
                    <p className="font-medium">£{(d.newBank / 10).toFixed(1)}m</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CaptainTab({ data }: { data: TeamAnalysis }) {
  const { captainOptions, bestXI, flags } = data;
  
  return (
    <div className="space-y-6">
      {/* Current Captain & Vice */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-yellow-400">🎯</span> Current Selection
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {(() => {
            const captain = bestXI.starters.find(p => p.id === bestXI.captainId);
            const vice = bestXI.starters.find(p => p.id === bestXI.viceCaptainId);
            return (
              <>
                {captain && (
                  <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-xl">
                    <p className="text-xs text-blue-300 mb-1">CAPTAIN (×2)</p>
                    <p className="font-medium text-lg">{captain.web_name}</p>
                    <p className="text-sm text-gray-400">{POSITION_NAMES[captain.element_type]} • {formatPrice(captain.now_cost)}</p>
                    <p className="text-green-300 font-medium mt-2">xP: {captain._projectedUpcoming?.toFixed(1) || '0'} (doubled: {(captain._projectedUpcoming || 0) * 2})</p>
                  </div>
                )}
                {vice && (
                  <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-xl">
                    <p className="text-xs text-yellow-300 mb-1">VICE CAPTAIN</p>
                    <p className="font-medium text-lg">{vice.web_name}</p>
                    <p className="text-sm text-gray-400">{POSITION_NAMES[vice.element_type]} • {formatPrice(vice.now_cost)}</p>
                    <p className="text-green-300 font-medium mt-2">xP: {vice._projectedUpcoming?.toFixed(1) || '0'}</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>
      
      {/* Captain Options */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-green-400">📊</span> Captain Candidates (Top 10)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="p-3 font-medium">#</th>
                <th className="p-3 font-medium">Player</th>
                <th className="p-3 font-medium text-right">xP (GW{data.upcomingGameweek})</th>
                <th className="p-3 font-medium text-right">Season Pts</th>
                <th className="p-3 font-medium text-right">Form</th>
                <th className="p-3 font-medium text-right">Price</th>
                <th className="p-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {captainOptions.slice(0, 10).map((opt, idx) => {
                const playerFlags = flags[opt.player.id] || [];
                const isCaptain = opt.player.id === bestXI.captainId;
                const isVice = opt.player.id === bestXI.viceCaptainId;
                return (
                  <tr key={opt.player.id} className={`border-b border-gray-800 ${isCaptain ? 'bg-blue-900/20' : isVice ? 'bg-yellow-900/20' : ''}`}>
                    <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${POSITION_COLORS[opt.player.element_type]}`}>
                          {POSITION_NAMES[opt.player.element_type]}
                        </span>
                        <span className={`font-medium ${isCaptain ? 'text-blue-300' : isVice ? 'text-yellow-300' : ''}`}>
                          {opt.player.web_name}
                          {isCaptain && <span className="ml-1 text-blue-400">(C)</span>}
                          {isVice && <span className="ml-1 text-yellow-400">(VC)</span>}
                          {opt.isVice && <span className="ml-1 text-gray-400">(auto-VC)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-green-300">{opt.projectedPoints.toFixed(1)}</td>
                    <td className="p-3 text-right text-gray-400">{opt.player.total_points}</td>
                    <td className="p-3 text-right text-gray-400">{opt.player.form}</td>
                    <td className="p-3 text-right text-gray-400">{formatPrice(opt.player.now_cost)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {playerFlags.slice(0, 2).map((flag, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getFlagColor(flag.severity)}`}
                            title={flag.message}
                          >
                            {getFlagIcon(flag.type)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChipsTab({ data, usedChips }: { data: TeamAnalysis; usedChips: Set<string> }) {
  const { chips } = data;
  
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
        <h3 className="font-semibold mb-2">Chip Summary</h3>
        <p className="text-gray-300">{chips.summary}</p>
      </div>
      
      {/* Chip Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <ChipCard
          title="Wildcard"
          icon="🃏"
          recommendation={chips.wildcard}
          usedChips={usedChips}
          chipKey="wildcard"
        />
        <ChipCard
          title="Free Hit"
          icon="🎯"
          recommendation={chips.freeHit}
          usedChips={usedChips}
          chipKey="freehit"
        />
        <ChipCard
          title="Bench Boost"
          icon="🚀"
          recommendation={chips.benchBoost}
          usedChips={usedChips}
          chipKey="bboost"
        />
        <ChipCard
          title="Triple Captain"
          icon="💎"
          recommendation={chips.tripleCaptain}
          usedChips={usedChips}
          chipKey="3xc"
        />
      </div>
      
      {/* Chip Strategy Tips */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-purple-400">💡</span> Strategy Tips
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
            <h4 className="font-medium text-purple-300 mb-2">Wildcard</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Best used when 4+ starters have issues (injuries, bad fixtures, rotation)</li>
              <li>• Consider during international breaks or blank/double gameweeks</li>
              <li>• Two per season: one before GW20, one after</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
            <h4 className="font-medium text-purple-300 mb-2">Free Hit</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Use when 6+ squad players have blank gameweeks</li>
              <li>• Only lasts one gameweek - squad reverts after</li>
              <li>• One per season</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
            <h4 className="font-medium text-purple-300 mb-2">Bench Boost</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Best when bench projected points ≥ 12</li>
              <li>• Target double gameweeks for bench players</li>
              <li>• One per season</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
            <h4 className="font-medium text-purple-300 mb-2">Triple Captain</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Best on premium asset in double gameweek (xP ≥ 15)</li>
              <li>• Or single GW with exceptional fixture & form</li>
              <li>• One per season</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlayersTab() {
  const [players, setPlayers] = useState<Element[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<'xp' | 'horizon' | 'price' | 'form' | 'total'>('xp');
  const [gameweek, setGameweek] = useState('');
  
  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (position) params.set('pos', position.toString());
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('sort', sort);
      if (gameweek) params.set('gw', gameweek);
      
      const response = await fetch(`/api/players?${params}`);
      const result = await response.json();
      if (response.ok) {
        setPlayers(result.players || []);
      }
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  }, [position, maxPrice, sort, gameweek]);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlayers();
  }, [fetchPlayers]);
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl flex flex-wrap gap-4">
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value ? parseInt(e.target.value, 10) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Positions</option>
          <option value="1">Goalkeepers</option>
          <option value="2">Defenders</option>
          <option value="3">Midfielders</option>
          <option value="4">Forwards</option>
        </select>
        
        <input
          type="number"
          step="0.5"
          min="3.5"
          max="15"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Max Price (£m)"
          className="w-40 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
        />
        
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'xp' | 'horizon' | 'price' | 'form' | 'total')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="xp">Sort: xP (Upcoming GW)</option>
          <option value="horizon">Sort: xP (Horizon)</option>
          <option value="price">Sort: Price</option>
          <option value="form">Sort: Form</option>
          <option value="total">Sort: Total Points</option>
        </select>
        
        <input
          type="number"
          min="1"
          max="38"
          value={gameweek}
          onChange={(e) => setGameweek(e.target.value)}
          placeholder="Gameweek"
          className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
        />
      </div>
      
      {/* Results */}
      {loading ? (
        <LoadingState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-left">
                <th className="p-3 font-medium">Player</th>
                <th className="p-3 font-medium text-right">Price</th>
                <th className="p-3 font-medium text-right">Season Pts</th>
                <th className="p-3 font-medium text-right">Form</th>
                <th className="p-3 font-medium text-right">xP (GW)</th>
                <th className="p-3 font-medium text-right">xP (Horizon)</th>
                <th className="p-3 font-medium text-right">Sel%</th>
              </tr>
            </thead>
            <tbody>
              {players.slice(0, 50).map(p => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${POSITION_COLORS[p.element_type]}`}>
                        {POSITION_NAMES[p.element_type]}
                      </span>
                      <span className="font-medium">{p.web_name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right text-gray-400">{formatPrice(p.now_cost)}</td>
                  <td className="p-3 text-right text-gray-400">{p.total_points}</td>
                  <td className="p-3 text-right text-gray-400">{p.form}</td>
                  <td className="p-3 text-right font-medium text-green-300">
                    {p._projectedUpcoming !== undefined ? p._projectedUpcoming.toFixed(1) : '-'}
                  </td>
                  <td className="p-3 text-right font-medium text-blue-300">
                    {p._projectedHorizon !== undefined ? p._projectedHorizon.toFixed(1) : '-'}
                  </td>
                  <td className="p-3 text-right text-gray-400">{p.selected_by_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {players.length === 0 && !loading && (
        <p className="text-gray-400 text-center py-8">No players found matching criteria.</p>
      )}
    </div>
  );
}