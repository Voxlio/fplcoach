// Test data fixtures for unit tests
// Hand-made JSON data matching FPL API structure

import { Element, Team, Fixture, Event, ElementType, Transfer } from '../schemas';

export const mockTeams: Team[] = [
  { id: 1, name: 'Arsenal', short_name: 'ARS', strength: 4, strength_attack_home: 4, strength_attack_away: 4, strength_defence_home: 4, strength_defence_away: 4 },
  { id: 2, name: 'Aston Villa', short_name: 'AVL', strength: 3, strength_attack_home: 3, strength_attack_away: 3, strength_defence_home: 3, strength_defence_away: 3 },
  { id: 3, name: 'Brentford', short_name: 'BRE', strength: 3, strength_attack_home: 3, strength_attack_away: 2, strength_defence_home: 3, strength_defence_away: 3 },
  { id: 4, name: 'Brighton', short_name: 'BHA', strength: 3, strength_attack_home: 3, strength_attack_away: 3, strength_defence_home: 3, strength_defence_away: 3 },
  { id: 5, name: 'Chelsea', short_name: 'CHE', strength: 4, strength_attack_home: 4, strength_attack_away: 3, strength_defence_home: 4, strength_defence_away: 3 },
  { id: 6, name: 'Crystal Palace', short_name: 'CRY', strength: 2, strength_attack_home: 2, strength_attack_away: 2, strength_defence_home: 3, strength_defence_away: 2 },
  { id: 7, name: 'Everton', short_name: 'EVE', strength: 2, strength_attack_home: 2, strength_attack_away: 2, strength_defence_home: 3, strength_defence_away: 2 },
  { id: 8, name: 'Fulham', short_name: 'FUL', strength: 3, strength_attack_home: 3, strength_attack_away: 2, strength_defence_home: 3, strength_defence_away: 3 },
  { id: 9, name: 'Liverpool', short_name: 'LIV', strength: 5, strength_attack_home: 5, strength_attack_away: 5, strength_defence_home: 4, strength_defence_away: 4 },
  { id: 10, name: 'Man City', short_name: 'MCI', strength: 5, strength_attack_home: 5, strength_attack_away: 5, strength_defence_home: 5, strength_defence_away: 4 },
];

export const mockElementTypes: ElementType[] = [
  { id: 1, singular_name: 'Goalkeeper', singular_name_short: 'GK', plural_name: 'Goalkeepers', plural_name_short: 'GKs' },
  { id: 2, singular_name: 'Defender', singular_name_short: 'DEF', plural_name: 'Defenders', plural_name_short: 'DEFs' },
  { id: 3, singular_name: 'Midfielder', singular_name_short: 'MID', plural_name: 'Midfielders', plural_name_short: 'MIDs' },
  { id: 4, singular_name: 'Forward', singular_name_short: 'FWD', plural_name: 'Forwards', plural_name_short: 'FWDs' },
];

export const mockEvents: Event[] = [
  {
    id: 1, name: 'Gameweek 1', deadline_time: '2024-08-17T10:00:00Z', deadline_time_epoch: 1723888800,
    deadline_time_game_offset: 0, finished: true, data_checked: true, is_current: false, is_next: false, is_previous: true,
    cup_leagues_created: false, h2h_ko_matches_created: false, ranked_count: 0, chip_plays: 0,
    most_selected: 0, most_transferred_in: 0, top_element: 0, top_element_info: { id: 0, points: 0 },
    transfers_made: 0, most_captained: 0, most_vice_captained: 0
  },
  {
    id: 2, name: 'Gameweek 2', deadline_time: '2024-08-24T10:00:00Z', deadline_time_epoch: 1724493600,
    deadline_time_game_offset: 0, finished: true, data_checked: true, is_current: false, is_next: false, is_previous: true,
    cup_leagues_created: false, h2h_ko_matches_created: false, ranked_count: 0, chip_plays: 0,
    most_selected: 0, most_transferred_in: 0, top_element: 0, top_element_info: { id: 0, points: 0 },
    transfers_made: 0, most_captained: 0, most_vice_captained: 0
  },
  {
    id: 3, name: 'Gameweek 3', deadline_time: '2024-08-31T10:00:00Z', deadline_time_epoch: 1725098400,
    deadline_time_game_offset: 0, finished: false, data_checked: false, is_current: true, is_next: false, is_previous: false,
    cup_leagues_created: false, h2h_ko_matches_created: false, ranked_count: 0, chip_plays: 0,
    most_selected: 0, most_transferred_in: 0, top_element: 0, top_element_info: { id: 0, points: 0 },
    transfers_made: 0, most_captained: 0, most_vice_captained: 0
  },
  {
    id: 4, name: 'Gameweek 4', deadline_time: '2024-09-14T10:00:00Z', deadline_time_epoch: 1726308000,
    deadline_time_game_offset: 0, finished: false, data_checked: false, is_current: false, is_next: true, is_previous: false,
    cup_leagues_created: false, h2h_ko_matches_created: false, ranked_count: 0, chip_plays: 0,
    most_selected: 0, most_transferred_in: 0, top_element: 0, top_element_info: { id: 0, points: 0 },
    transfers_made: 0, most_captained: 0, most_vice_captained: 0
  },
];

export const createMockPlayer = (overrides: Partial<Element> = {}): Element => ({
  id: 1,
  web_name: 'Test Player',
  team: 1,
  element_type: 3,
  now_cost: 80,
  cost_change_start: 0,
  cost_change_event: 0,
  cost_change_event_fall: 0,
  status: 'a',
  chance_of_playing_next_round: 100,
  chance_of_playing_this_round: 100,
  news: '',
  news_added: null,
  form: '5.0',
  points_per_game: '5.0',
  total_points: 50,
  minutes: 1800,
  starts: 20,
  expected_goals: '5.0',
  expected_assists: '3.0',
  expected_goals_per_90: '0.25',
  expected_assists_per_90: '0.15',
  expected_goals_conceded_per_90: '1.0',
  penalties_order: 0,
  corners_and_indirect_freekicks_order: 0,
  direct_freekicks_order: 0,
  selected_by_percent: '10.0',
  ep_next: '4.5',
  ep_this: '4.0',
  transfers_in_event: 1000,
  transfers_out_event: 500,
  value_form: '1.0',
  value_season: '1.0',
  ict_index: '50.0',
  influence: '50.0',
  creativity: '50.0',
  threat: '50.0',
  ict_index_rank: 100,
  influence_rank: 100,
  creativity_rank: 100,
  threat_rank: 100,
  ict_index_rank_type: 1,
  influence_rank_type: 1,
  creativity_rank_type: 1,
  threat_rank_type: 1,
  ...overrides,
});

export const mockElements: Element[] = [
  // Goalkeepers
  createMockPlayer({ id: 1, web_name: 'Raya', team: 1, element_type: 1, now_cost: 55, expected_goals_per_90: '0.0', expected_assists_per_90: '0.0', expected_goals_conceded_per_90: '0.8', total_points: 80, minutes: 1800, starts: 20, form: '6.0', ep_next: '5.0' }),
  createMockPlayer({ id: 2, web_name: 'Alisson', team: 9, element_type: 1, now_cost: 55, expected_goals_per_90: '0.0', expected_assists_per_90: '0.0', expected_goals_conceded_per_90: '0.7', total_points: 85, minutes: 1800, starts: 20, form: '6.5', ep_next: '5.5' }),
  createMockPlayer({ id: 3, web_name: 'Ederson', team: 10, element_type: 1, now_cost: 55, expected_goals_per_90: '0.0', expected_assists_per_90: '0.0', expected_goals_conceded_per_90: '0.6', total_points: 90, minutes: 1800, starts: 20, form: '7.0', ep_next: '6.0' }),
  createMockPlayer({ id: 4, web_name: 'Martinez', team: 2, element_type: 1, now_cost: 50, expected_goals_per_90: '0.0', expected_assists_per_90: '0.0', expected_goals_conceded_per_90: '1.0', total_points: 60, minutes: 1800, starts: 20, form: '4.5', ep_next: '4.0' }),
  createMockPlayer({ id: 5, web_name: 'Pickford', team: 7, element_type: 1, now_cost: 50, expected_goals_per_90: '0.0', expected_assists_per_90: '0.0', expected_goals_conceded_per_90: '1.2', total_points: 55, minutes: 1800, starts: 20, form: '4.0', ep_next: '3.5' }),
  // Defenders
  createMockPlayer({ id: 6, web_name: 'Saliba', team: 1, element_type: 2, now_cost: 65, expected_goals_per_90: '0.05', expected_assists_per_90: '0.05', expected_goals_conceded_per_90: '0.8', total_points: 75, minutes: 1800, starts: 20, form: '5.5', ep_next: '5.0' }),
  createMockPlayer({ id: 7, web_name: 'Gabriel', team: 1, element_type: 2, now_cost: 60, expected_goals_per_90: '0.05', expected_assists_per_90: '0.05', expected_goals_conceded_per_90: '0.8', total_points: 70, minutes: 1800, starts: 20, form: '5.0', ep_next: '4.5' }),
  createMockPlayer({ id: 8, web_name: 'Alexander-Arnold', team: 9, element_type: 2, now_cost: 75, expected_goals_per_90: '0.10', expected_assists_per_90: '0.30', expected_goals_conceded_per_90: '0.7', total_points: 100, minutes: 1800, starts: 20, form: '7.0', ep_next: '6.5', direct_freekicks_order: 1 }),
  createMockPlayer({ id: 9, web_name: 'Robertson', team: 9, element_type: 2, now_cost: 70, expected_goals_per_90: '0.05', expected_assists_per_90: '0.20', expected_goals_conceded_per_90: '0.7', total_points: 90, minutes: 1800, starts: 20, form: '6.0', ep_next: '5.5' }),
  createMockPlayer({ id: 10, web_name: 'Walker', team: 10, element_type: 2, now_cost: 60, expected_goals_per_90: '0.03', expected_assists_per_90: '0.10', expected_goals_conceded_per_90: '0.6', total_points: 65, minutes: 1800, starts: 20, form: '4.5', ep_next: '4.0' }),
  createMockPlayer({ id: 11, web_name: 'Dias', team: 10, element_type: 2, now_cost: 60, expected_goals_per_90: '0.05', expected_assists_per_90: '0.05', expected_goals_conceded_per_90: '0.6', total_points: 70, minutes: 1800, starts: 20, form: '5.0', ep_next: '4.5' }),
  createMockPlayer({ id: 12, web_name: 'Trippier', team: 8, element_type: 2, now_cost: 55, expected_goals_per_90: '0.05', expected_assists_per_90: '0.25', expected_goals_conceded_per_90: '1.0', total_points: 80, minutes: 1800, starts: 20, form: '5.5', ep_next: '5.0', direct_freekicks_order: 1 }),
  createMockPlayer({ id: 13, web_name: 'White', team: 1, element_type: 2, now_cost: 55, expected_goals_per_90: '0.05', expected_assists_per_90: '0.10', expected_goals_conceded_per_90: '0.8', total_points: 60, minutes: 1800, starts: 20, form: '4.0', ep_next: '3.5' }),
  createMockPlayer({ id: 14, web_name: 'Tomiyasu', team: 1, element_type: 2, now_cost: 45, expected_goals_per_90: '0.02', expected_assists_per_90: '0.05', expected_goals_conceded_per_90: '0.8', total_points: 40, minutes: 900, starts: 10, form: '3.0', ep_next: '2.5' }),
  createMockPlayer({ id: 15, web_name: 'Cash', team: 2, element_type: 2, now_cost: 50, expected_goals_per_90: '0.05', expected_assists_per_90: '0.15', expected_goals_conceded_per_90: '1.0', total_points: 55, minutes: 1800, starts: 20, form: '4.0', ep_next: '3.5' }),
  // Midfielders
  createMockPlayer({ id: 16, web_name: 'Saka', team: 1, element_type: 3, now_cost: 100, expected_goals_per_90: '0.40', expected_assists_per_90: '0.30', expected_goals_conceded_per_90: '0.8', total_points: 150, minutes: 1800, starts: 20, form: '8.0', ep_next: '7.5', penalties_order: 1 }),
  createMockPlayer({ id: 17, web_name: 'Odegaard', team: 1, element_type: 3, now_cost: 85, expected_goals_per_90: '0.30', expected_assists_per_90: '0.25', expected_goals_conceded_per_90: '0.8', total_points: 120, minutes: 1800, starts: 20, form: '7.0', ep_next: '6.5' }),
  createMockPlayer({ id: 18, web_name: 'Salah', team: 9, element_type: 3, now_cost: 130, expected_goals_per_90: '0.60', expected_assists_per_90: '0.35', expected_goals_conceded_per_90: '0.7', total_points: 200, minutes: 1800, starts: 20, form: '10.0', ep_next: '9.5', penalties_order: 1 }),
  createMockPlayer({ id: 19, web_name: 'De Bruyne', team: 10, element_type: 3, now_cost: 100, expected_goals_per_90: '0.25', expected_assists_per_90: '0.40', expected_goals_conceded_per_90: '0.6', total_points: 140, minutes: 1800, starts: 20, form: '7.5', ep_next: '7.0' }),
  createMockPlayer({ id: 20, web_name: 'Son', team: 6, element_type: 3, now_cost: 100, expected_goals_per_90: '0.45', expected_assists_per_90: '0.20', expected_goals_conceded_per_90: '1.2', total_points: 130, minutes: 1800, starts: 20, form: '7.0', ep_next: '6.5' }),
  createMockPlayer({ id: 21, web_name: 'Bruno', team: 8, element_type: 3, now_cost: 90, expected_goals_per_90: '0.30', expected_assists_per_90: '0.25', expected_goals_conceded_per_90: '1.0', total_points: 110, minutes: 1800, starts: 20, form: '6.0', ep_next: '5.5', penalties_order: 1 }),
  createMockPlayer({ id: 22, web_name: 'Maddison', team: 6, element_type: 3, now_cost: 80, expected_goals_per_90: '0.25', expected_assists_per_90: '0.20', expected_goals_conceded_per_90: '1.2', total_points: 90, minutes: 1800, starts: 20, form: '5.5', ep_next: '5.0' }),
  createMockPlayer({ id: 23, web_name: 'Bowen', team: 4, element_type: 3, now_cost: 75, expected_goals_per_90: '0.35', expected_assists_per_90: '0.15', expected_goals_conceded_per_90: '1.0', total_points: 100, minutes: 1800, starts: 20, form: '6.0', ep_next: '5.5' }),
  createMockPlayer({ id: 24, web_name: 'Palmer', team: 5, element_type: 3, now_cost: 70, expected_goals_per_90: '0.30', expected_assists_per_90: '0.25', expected_goals_conceded_per_90: '1.0', total_points: 95, minutes: 1800, starts: 20, form: '6.5', ep_next: '6.0', penalties_order: 1 }),
  createMockPlayer({ id: 25, web_name: 'Rice', team: 1, element_type: 3, now_cost: 65, expected_goals_per_90: '0.10', expected_assists_per_90: '0.10', expected_goals_conceded_per_90: '0.8', total_points: 70, minutes: 1800, starts: 20, form: '4.5', ep_next: '4.0' }),
  // Forwards
  createMockPlayer({ id: 26, web_name: 'Haaland', team: 10, element_type: 4, now_cost: 150, expected_goals_per_90: '0.90', expected_assists_per_90: '0.10', expected_goals_conceded_per_90: '0.6', total_points: 220, minutes: 1800, starts: 20, form: '11.0', ep_next: '10.5', penalties_order: 1 }),
  createMockPlayer({ id: 27, web_name: 'Watkins', team: 2, element_type: 4, now_cost: 90, expected_goals_per_90: '0.50', expected_assists_per_90: '0.20', expected_goals_conceded_per_90: '1.0', total_points: 140, minutes: 1800, starts: 20, form: '8.0', ep_next: '7.5' }),
  createMockPlayer({ id: 28, web_name: 'Isak', team: 8, element_type: 4, now_cost: 85, expected_goals_per_90: '0.45', expected_assists_per_90: '0.15', expected_goals_conceded_per_90: '1.0', total_points: 130, minutes: 1800, starts: 20, form: '7.5', ep_next: '7.0' }),
  createMockPlayer({ id: 29, web_name: 'Solanke', team: 6, element_type: 4, now_cost: 75, expected_goals_per_90: '0.40', expected_assists_per_90: '0.10', expected_goals_conceded_per_90: '1.2', total_points: 100, minutes: 1800, starts: 20, form: '6.0', ep_next: '5.5' }),
  createMockPlayer({ id: 30, web_name: 'Jackson', team: 5, element_type: 4, now_cost: 70, expected_goals_per_90: '0.35', expected_assists_per_90: '0.15', expected_goals_conceded_per_90: '1.0', total_points: 90, minutes: 1800, starts: 20, form: '5.5', ep_next: '5.0' }),
];

export const mockFixtures: Fixture[] = [
  // GW3 fixtures (current)
  { id: 101, code: 1, team_h: 1, team_h_score: null, team_a: 2, team_a_score: null, event: 3, finished: false, finished_provisional: false, kickoff_time: '2024-08-31T14:00:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 3, team_a_difficulty: 3, pulse_id: 1 },
  { id: 102, code: 2, team_h: 9, team_h_score: null, team_a: 10, team_a_score: null, event: 3, finished: false, finished_provisional: false, kickoff_time: '2024-08-31T16:30:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 4, team_a_difficulty: 4, pulse_id: 2 },
  { id: 103, code: 3, team_h: 5, team_h_score: null, team_a: 4, team_a_score: null, event: 3, finished: false, finished_provisional: false, kickoff_time: '2024-09-01T13:00:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 3, team_a_difficulty: 3, pulse_id: 3 },
  { id: 104, code: 4, team_h: 8, team_h_score: null, team_a: 6, team_a_score: null, event: 3, finished: false, finished_provisional: false, kickoff_time: '2024-09-01T13:00:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 2, team_a_difficulty: 2, pulse_id: 4 },
  // GW4 fixtures (next)
  { id: 105, code: 5, team_h: 2, team_h_score: null, team_a: 1, team_a_score: null, event: 4, finished: false, finished_provisional: false, kickoff_time: '2024-09-14T14:00:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 3, team_a_difficulty: 3, pulse_id: 5 },
  { id: 106, code: 6, team_h: 10, team_h_score: null, team_a: 9, team_a_score: null, event: 4, finished: false, finished_provisional: false, kickoff_time: '2024-09-14T16:30:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 4, team_a_difficulty: 4, pulse_id: 6 },
  { id: 107, code: 7, team_h: 4, team_h_score: null, team_a: 5, team_a_score: null, event: 4, finished: false, finished_provisional: false, kickoff_time: '2024-09-15T13:00:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 3, team_a_difficulty: 3, pulse_id: 7 },
  { id: 108, code: 8, team_h: 6, team_h_score: null, team_a: 8, team_a_score: null, event: 4, finished: false, finished_provisional: false, kickoff_time: '2024-09-15T13:00:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 2, team_a_difficulty: 2, pulse_id: 8 },
  // Double gameweek for team 1 (ARS) in GW4
  { id: 109, code: 9, team_h: 1, team_h_score: null, team_a: 7, team_a_score: null, event: 4, finished: false, finished_provisional: false, kickoff_time: '2024-09-18T19:45:00Z', minutes: 0, provisional_start_time: false, started: false, team_h_difficulty: 2, team_a_difficulty: 3, pulse_id: 9 },
  // Blank for team 3 (BRE) in GW4 - no fixture
];

export const mockTransfers: Transfer[] = [
  { element_in: 16, element_in_cost: 100, element_out: 99, element_out_cost: 80, entry: 123, event: 1, time: '2024-08-10T10:00:00Z' }, // Saka bought for 10.0
  { element_in: 26, element_in_cost: 140, element_out: 98, element_out_cost: 70, entry: 123, event: 1, time: '2024-08-10T10:00:00Z' }, // Haaland bought for 14.0
  { element_in: 6, element_in_cost: 60, element_out: 97, element_out_cost: 55, entry: 123, event: 2, time: '2024-08-20T10:00:00Z' }, // Saliba bought for 6.0
];

export const mockEntry = {
  id: 123,
  joined_time: '2020-08-01T10:00:00Z',
  started_event: 1,
  player_first_name: 'Test',
  player_last_name: 'User',
  player_region_id: 1,
  player_region_name: 'England',
  player_region_iso_code_short: 'ENG',
  player_region_iso_code_long: 'England',
  years_active: 4,
  name: 'Test Team',
  name_change_blocked: false,
  entered_events: [1, 2, 3],
  current_event: 3,
  summary_overall_points: 1500,
  summary_overall_rank: 100000,
  summary_event_points: 60,
  summary_event_rank: 50000,
  last_deadline_bank: 10, // 1.0m
  last_deadline_value: 1000, // 100.0m
  last_deadline_total_transfers: 3,
};

export const mockPicks = [
  { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false }, // Raya
  { element: 6, position: 2, multiplier: 1, is_captain: false, is_vice_captain: false }, // Saliba
  { element: 7, position: 3, multiplier: 1, is_captain: false, is_vice_captain: false }, // Gabriel
  { element: 8, position: 4, multiplier: 1, is_captain: false, is_vice_captain: false }, // TAA
  { element: 9, position: 5, multiplier: 1, is_captain: false, is_vice_captain: false }, // Robertson
  { element: 16, position: 6, multiplier: 1, is_captain: true, is_vice_captain: false }, // Saka (C)
  { element: 17, position: 7, multiplier: 1, is_captain: false, is_vice_captain: false }, // Odegaard
  { element: 18, position: 8, multiplier: 1, is_captain: false, is_vice_captain: true }, // Salah (VC)
  { element: 19, position: 9, multiplier: 1, is_captain: false, is_vice_captain: false }, // De Bruyne
  { element: 26, position: 10, multiplier: 1, is_captain: false, is_vice_captain: false }, // Haaland
  { element: 27, position: 11, multiplier: 1, is_captain: false, is_vice_captain: false }, // Watkins
  { element: 2, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false }, // Alisson (bench)
  { element: 10, position: 13, multiplier: 0, is_captain: false, is_vice_captain: false }, // Walker (bench)
  { element: 20, position: 14, multiplier: 0, is_captain: false, is_vice_captain: false }, // Son (bench)
  { element: 28, position: 15, multiplier: 0, is_captain: false, is_vice_captain: false }, // Isak (bench)
];

export const mockEntryHistory = {
  event: 3,
  points: 60,
  total_points: 1500,
  rank: 50000,
  rank_sort: 50000,
  overall_rank: 100000,
  percentile_rank: 10,
  bank: 10,
  value: 1000,
  event_transfers: 1,
  event_transfers_cost: 0,
  points_on_bench: 5,
};