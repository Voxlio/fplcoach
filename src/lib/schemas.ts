// Zod schemas for validating FPL API responses
// Fail with clear messages if fields are missing or renamed

import { z } from 'zod';

// Bootstrap-static schemas
export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_name: z.string(),
  strength: z.number(),
  strength_attack_home: z.number(),
  strength_attack_away: z.number(),
  strength_defence_home: z.number(),
  strength_defence_away: z.number(),
});

export const ElementTypeSchema = z.object({
  id: z.number(),
  singular_name: z.string(),
  singular_name_short: z.string(),
  plural_name: z.string(),
  plural_name_short: z.string(),
});

export const EventSchema = z.object({
  id: z.number(),
  name: z.string(),
  deadline_time: z.string(),
  deadline_time_epoch: z.number(),
  deadline_time_game_offset: z.number(),
  finished: z.boolean(),
  data_checked: z.boolean(),
  is_current: z.boolean(),
  is_next: z.boolean(),
  is_previous: z.boolean(),
  cup_leagues_created: z.boolean(),
  h2h_ko_matches_created: z.boolean(),
  ranked_count: z.number(),
  chip_plays: z.number(),
  most_selected: z.number(),
  most_transferred_in: z.number(),
  top_element: z.number(),
  top_element_info: z.object({
    id: z.number(),
    points: z.number(),
  }),
  transfers_made: z.number(),
  most_captained: z.number(),
  most_vice_captained: z.number(),
});

export const ElementSchema = z.object({
  id: z.number(),
  web_name: z.string(),
  team: z.number(),
  element_type: z.number(),
  now_cost: z.number(),
  cost_change_start: z.number(),
  cost_change_event: z.number(),
  cost_change_event_fall: z.number(),
  status: z.enum(['a', 'd', 'i', 's', 'u', 'n']),
  chance_of_playing_next_round: z.number().nullable(),
  chance_of_playing_this_round: z.number().nullable(),
  news: z.string(),
  news_added: z.string().nullable(),
  form: z.string(),
  points_per_game: z.string(),
  total_points: z.number(),
  minutes: z.number(),
  starts: z.number(),
  expected_goals: z.string(),
  expected_assists: z.string(),
  expected_goals_per_90: z.string(),
  expected_assists_per_90: z.string(),
  expected_goals_conceded_per_90: z.string(),
  penalties_order: z.number(),
  corners_and_indirect_freekicks_order: z.number(),
  direct_freekicks_order: z.number(),
  selected_by_percent: z.string(),
  ep_next: z.string(),
  ep_this: z.string(),
  transfers_in_event: z.number(),
  transfers_out_event: z.number(),
  value_form: z.string(),
  value_season: z.string(),
  ict_index: z.string(),
  influence: z.string(),
  creativity: z.string(),
  threat: z.string(),
  ict_index_rank: z.number(),
  influence_rank: z.number(),
  creativity_rank: z.number(),
  threat_rank: z.number(),
  ict_index_rank_type: z.number(),
  influence_rank_type: z.number(),
  creativity_rank_type: z.number(),
  threat_rank_type: z.number(),
});

export const BootstrapStaticSchema = z.object({
  events: z.array(EventSchema),
  game_settings: z.object({
    league_join_private_max: z.number(),
    league_join_public_max: z.number(),
    league_max_size_public_classic: z.number(),
    league_max_size_public_h2h: z.number(),
    league_max_size_private_h2h: z.number(),
    league_max_size_private_classic: z.number(),
    league_prefix_public: z.string(),
    league_points_h2h_win: z.number(),
    league_points_h2h_lose: z.number(),
    league_points_h2h_draw: z.number(),
    league_points_cup_win: z.number(),
    league_points_cup_lose: z.number(),
    league_points_cup_draw: z.number(),
    squad_squadplay: z.number(),
    squad_squadsize: z.number(),
    squad_team_limit: z.number(),
    squad_total_spend: z.number(),
    ui_use_special_shirts: z.boolean(),
    ui_use_special_shirts_extra: z.boolean(),
    ui_use_custom_team_names: z.boolean(),
  }),
  phases: z.array(z.object({
    id: z.number(),
    name: z.string(),
    start_event: z.number(),
    stop_event: z.number(),
  })),
  teams: z.array(TeamSchema),
  elements: z.array(ElementSchema),
  element_stats: z.array(z.object({
    label: z.string(),
    name: z.string(),
  })),
  element_types: z.array(ElementTypeSchema),
});

// Fixtures schema
export const FixtureSchema = z.object({
  id: z.number(),
  code: z.number(),
  team_h: z.number(),
  team_h_score: z.number().nullable(),
  team_a: z.number(),
  team_a_score: z.number().nullable(),
  event: z.number().nullable(),
  finished: z.boolean(),
  finished_provisional: z.boolean(),
  kickoff_time: z.string(),
  minutes: z.number(),
  provisional_start_time: z.boolean(),
  started: z.boolean(),
  team_h_difficulty: z.number(),
  team_a_difficulty: z.number(),
  pulse_id: z.number(),
});

// Entry (manager) schema
export const EntrySchema = z.object({
  id: z.number(),
  joined_time: z.string(),
  started_event: z.number(),
  player_first_name: z.string(),
  player_last_name: z.string(),
  player_region_id: z.number(),
  player_region_name: z.string(),
  player_region_iso_code_short: z.string(),
  player_region_iso_code_long: z.string(),
  years_active: z.number(),
  name: z.string(),
  name_change_blocked: z.boolean(),
  entered_events: z.array(z.number()),
  current_event: z.number(),
  summary_overall_points: z.number(),
  summary_overall_rank: z.number(),
  summary_event_points: z.number(),
  summary_event_rank: z.number(),
  last_deadline_bank: z.number(),
  last_deadline_value: z.number(),
  last_deadline_total_transfers: z.number(),
});

// Picks schema
export const PickSchema = z.object({
  element: z.number(),
  position: z.number(),
  multiplier: z.number(),
  is_captain: z.boolean(),
  is_vice_captain: z.boolean(),
});

export const EntryHistorySchema = z.object({
  event: z.number(),
  points: z.number(),
  total_points: z.number(),
  rank: z.number(),
  rank_sort: z.number(),
  overall_rank: z.number(),
  percentile_rank: z.number(),
  bank: z.number(),
  value: z.number(),
  event_transfers: z.number(),
  event_transfers_cost: z.number(),
  points_on_bench: z.number(),
});

export const PicksResponseSchema = z.object({
  active_chip: z.string().nullable(),
  automatic_subs: z.array(z.object({
    element_in: z.number(),
    element_out: z.number(),
    event: z.number(),
  })),
  entry_history: EntryHistorySchema,
  picks: z.array(PickSchema),
});

// Transfers schema
export const TransferSchema = z.object({
  element_in: z.number(),
  element_in_cost: z.number(),
  element_out: z.number(),
  element_out_cost: z.number(),
  entry: z.number(),
  event: z.number(),
  time: z.string(),
});

export const PlayerProjectionSchema = z.object({
  playerId: z.number(),
  gameweek: z.number(),
  fixtureId: z.number().nullable(),
  isHome: z.boolean(),
  opponentId: z.number(),
  projectedPoints: z.number(),
  availability: z.number(),
  minutesSecurity: z.number(),
  attackFactor: z.number(),
  defenceFactor: z.number(),
  attackingPoints: z.number(),
  cleanSheetPoints: z.number(),
  appearancePoints: z.number(),
  bonusPoints: z.number(),
  epNext: z.number(),
  blendedPoints: z.number(),
});

export const TransferSuggestionSchema = z.object({
  out: ElementSchema,
  in: ElementSchema,
  priceChange: z.number(),
  projectedGainUpcoming: z.number(),
  projectedGainHorizon: z.number(),
  newBank: z.number(),
  reason: z.string(),
  isHit: z.boolean(),
  hitCost: z.number(),
  netGain: z.number(),
});

export type Team = z.infer<typeof TeamSchema>;
export type Element = z.infer<typeof ElementSchema>;
export type Event = z.infer<typeof EventSchema>;
export type ElementType = z.infer<typeof ElementTypeSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Pick = z.infer<typeof PickSchema>;
export type EntryHistory = z.infer<typeof EntryHistorySchema>;
export type Transfer = z.infer<typeof TransferSchema>;
export type PicksResponse = z.infer<typeof PicksResponseSchema>;
export type BootstrapStatic = z.infer<typeof BootstrapStaticSchema>;
export type PlayerProjection = z.infer<typeof PlayerProjectionSchema>;
export type TransferSuggestion = z.infer<typeof TransferSuggestionSchema>;