export interface Player {
  player_id: string
  team_id: string
  full_name: string
  email: string | null
  phone: string | null
  role: 'admin' | 'player'
  is_active: boolean
  is_blocked: boolean
  avatar_type: 'initials' | 'gallery' | 'photo'
  avatar_value: string | null
  created_at: string
}

export interface Match {
  match_id: string
  team_id: string
  match_date: string
  label: string | null
  is_locked: boolean
}

export interface Report {
  report_id: string
  player_id: string
  match_id: string
  goals: number
  assists: number
  team_won: number
  clean_sheet: number
  team_color: 'Pink' | 'Blue' | 'Yellow' | 'Other' | null
  created_at: string
  updated_at: string
}

export interface PlayerScore {
  player_id: string
  team_id: string
  full_name: string
  avatar_type: 'initials' | 'gallery' | 'photo'
  avatar_value: string | null
  matches_played: number
  total_goals: number
  total_assists: number
  total_wins: number
  total_cs: number
  total_points: number
}

export interface PracticeMvp {
  match_id: string
  player_id: string
  match_pts: number
}

export interface AllTimeMvp {
  player_id: string
  full_name: string
  avatar_type: 'initials' | 'gallery' | 'photo'
  avatar_value: string | null
  mvp_titles: number
  total_points: number
}

export interface SessionMatchStat {
  match_date: string
  label: string | null
  goals: number
  assists: number
  team_won: number
  clean_sheet: number
  team_color: string | null
  match_pts: number
}

export interface ScoringSettings {
  id: string
  team_id: string
  goal_pts: number
  assist_pts: number
  win_pts: number
  clean_sheet_pts: number
  updated_at: string
}

export interface CustomCategory {
  category_id: string
  team_id: string
  label: string
  pts_per_unit: number
  max_per_match: number
  is_active: boolean
  sort_order: number
  created_at: string
}
