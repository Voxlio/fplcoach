// FPL Coach Configuration Constants
// All tunable projection constants in one place

export interface Config {
  // Projection weights
  PROJECTION: {
    OWN_MODEL_WEIGHT: number;
    FPL_EP_NEXT_WEIGHT: number;
    MINUTES_SECURITY_CAP: number;
    ATTACK_FACTOR_CLAMP_MIN: number;
    ATTACK_FACTOR_CLAMP_MAX: number;
    DEFENCE_FACTOR_CLAMP_MIN: number;
    DEFENCE_FACTOR_CLAMP_MAX: number;
  };
  POINTS: {
    GOAL_GK: number;
    GOAL_DEF: number;
    GOAL_MID: number;
    GOAL_FWD: number;
    ASSIST: number;
    CLEAN_SHEET_GK: number;
    CLEAN_SHEET_DEF: number;
    CLEAN_SHEET_MID: number;
    APPEARANCE: number;
    BONUS_MAX: number;
    PENALTY_SAVE: number;
    PENALTY_MISS: number;
    YELLOW_CARD: number;
    RED_CARD: number;
    OWN_GOAL: number;
  };
  FORMATION: {
    squad: Record<number, number>;
    maxPerClub: number;
    validFormations: Array<{ gk: number; def: number; mid: number; fwd: number }>;
  };
  TRANSFER: {
    HIT_COST: number;
    HIT_MARGIN: number;
    ROLL_THRESHOLD: number;
    HORIZON_GAMEWEEKS: number;
    UPCOMING_GW_WEIGHT: number;
  };
  AVAILABILITY: {
    INJURED_THRESHOLD: number;
    DOUBTFUL_THRESHOLD: number;
    BENCH_ONLY_THRESHOLD: number;
    MINUTES_SECURITY_LOW: number;
  };
  CACHE: {
    BOOTSTRAP_STATIC: number;
    FIXTURES: number;
    TEAM_PICKS: number;
  };
  API: {
    BASE_URL: string;
    USER_AGENT: string;
  };
  CHIPS: {
    WILDCARD_PROBLEM_STARTERS: number;
    FREE_HIT_BLANK_PLAYERS: number;
    BENCH_BOOST_MIN_BENCH_XP: number;
    TRIPLE_CAPTAIN_MIN_PROJECTION: number;
  };
}

export const CONFIG: Config = {
  // Projection weights
  PROJECTION: {
    OWN_MODEL_WEIGHT: 0.7,
    FPL_EP_NEXT_WEIGHT: 0.3,
    MINUTES_SECURITY_CAP: 1.0,
    ATTACK_FACTOR_CLAMP_MIN: 0.6,
    ATTACK_FACTOR_CLAMP_MAX: 1.5,
    DEFENCE_FACTOR_CLAMP_MIN: 0.6,
    DEFENCE_FACTOR_CLAMP_MAX: 1.5,
  },

  // Points constants
  POINTS: {
    GOAL_GK: 6,
    GOAL_DEF: 6,
    GOAL_MID: 5,
    GOAL_FWD: 4,
    ASSIST: 3,
    CLEAN_SHEET_GK: 4,
    CLEAN_SHEET_DEF: 4,
    CLEAN_SHEET_MID: 1,
    APPEARANCE: 2,
    BONUS_MAX: 3,
    PENALTY_SAVE: 5,
    PENALTY_MISS: -2,
    YELLOW_CARD: -1,
    RED_CARD: -3,
    OWN_GOAL: -2,
  },

  // Formation rules
  FORMATION: {
    squad: { 1: 2, 2: 5, 3: 5, 4: 3 }, // Using position numbers as keys
    maxPerClub: 3,
    validFormations: [
      { gk: 1, def: 3, mid: 5, fwd: 2 }, // 3-5-2
      { gk: 1, def: 3, mid: 4, fwd: 3 }, // 3-4-3
      { gk: 1, def: 4, mid: 5, fwd: 1 }, // 4-5-1
      { gk: 1, def: 4, mid: 4, fwd: 2 }, // 4-4-2
      { gk: 1, def: 4, mid: 3, fwd: 3 }, // 4-3-3
      { gk: 1, def: 5, mid: 4, fwd: 1 }, // 5-4-1
      { gk: 1, def: 5, mid: 3, fwd: 2 }, // 5-3-2
      { gk: 1, def: 5, mid: 2, fwd: 3 }, // 5-2-3
    ],
  },

  // Transfer logic
  TRANSFER: {
    HIT_COST: 4,
    HIT_MARGIN: 0.5, // Only take a hit if gain > 4.5
    ROLL_THRESHOLD: 1.5, // Roll transfer if best gain < 1.5
    HORIZON_GAMEWEEKS: 4,
    UPCOMING_GW_WEIGHT: 2.0, // Double weight for upcoming gameweek
  },

  // Availability thresholds
  AVAILABILITY: {
    INJURED_THRESHOLD: 0, // status i/s/u/n
    DOUBTFUL_THRESHOLD: 0.5, // chance_of_playing < 50
    BENCH_ONLY_THRESHOLD: 0.3, // projected points very low
    MINUTES_SECURITY_LOW: 0.5,
  },

  // Caching (in milliseconds)
  CACHE: {
    BOOTSTRAP_STATIC: 5 * 60 * 1000, // 5 minutes
    FIXTURES: 5 * 60 * 1000, // 5 minutes
    TEAM_PICKS: 60 * 1000, // 60 seconds
  },

  // API
  API: {
    BASE_URL: 'https://fantasy.premierleague.com/api',
    USER_AGENT: 'FPL-Coach/1.0 (https://github.com/user/fpl-coach)',
  },

  // Chip thresholds
  CHIPS: {
    TRIPLE_CAPTAIN_MIN_PROJECTION: 15, // Premium captain with very high projection
    BENCH_BOOST_MIN_BENCH_XP: 12, // Bench projection sum
    WILDCARD_PROBLEM_STARTERS: 4, // 4+ problem starters
    FREE_HIT_BLANK_PLAYERS: 6, // Many blank gameweek players
  },
};