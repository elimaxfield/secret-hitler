import type {
  GamePhase,
  PlayerRole,
  PartyType,
  TeamType,
  ExecutiveActionType,
  PolicyType,
} from '@/types/game';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          room_code: string;
          phase: GamePhase;
          liberal_policies: number;
          fascist_policies: number;
          policy_deck: PolicyType[];
          discard_pile: PolicyType[];
          election_tracker: number;
          election_round: number;
          president_index: number | null;
          chancellor_id: string | null;
          previous_president_id: string | null;
          previous_chancellor_id: string | null;
          drawn_policies: PolicyType[] | null;
          president_choices: PolicyType[] | null;
          pending_executive_action: ExecutiveActionType | null;
          investigated_players: string[];
          special_election_president_index: number | null;
          veto_unlocked: boolean;
          veto_requested: boolean;
          player_count: number;
          created_at: string;
          started_at: string | null;
          ended_at: string | null;
          winner: TeamType | null;
        };
        Insert: {
          id?: string;
          room_code: string;
          phase?: GamePhase;
          liberal_policies?: number;
          fascist_policies?: number;
          policy_deck?: PolicyType[];
          discard_pile?: PolicyType[];
          election_tracker?: number;
          election_round?: number;
          president_index?: number | null;
          chancellor_id?: string | null;
          previous_president_id?: string | null;
          previous_chancellor_id?: string | null;
          drawn_policies?: PolicyType[] | null;
          president_choices?: PolicyType[] | null;
          pending_executive_action?: ExecutiveActionType | null;
          investigated_players?: string[];
          special_election_president_index?: number | null;
          veto_unlocked?: boolean;
          veto_requested?: boolean;
          player_count?: number;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
          winner?: TeamType | null;
        };
        Update: {
          id?: string;
          room_code?: string;
          phase?: GamePhase;
          liberal_policies?: number;
          fascist_policies?: number;
          policy_deck?: PolicyType[];
          discard_pile?: PolicyType[];
          election_tracker?: number;
          election_round?: number;
          president_index?: number | null;
          chancellor_id?: string | null;
          previous_president_id?: string | null;
          previous_chancellor_id?: string | null;
          drawn_policies?: PolicyType[] | null;
          president_choices?: PolicyType[] | null;
          pending_executive_action?: ExecutiveActionType | null;
          investigated_players?: string[];
          special_election_president_index?: number | null;
          veto_unlocked?: boolean;
          veto_requested?: boolean;
          player_count?: number;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
          winner?: TeamType | null;
        };
      };
      players: {
        Row: {
          id: string;
          game_id: string;
          name: string;
          session_id: string;
          role: PlayerRole | null;
          party: PartyType | null;
          is_alive: boolean;
          is_spectator: boolean;
          seat_index: number | null;
          is_connected: boolean;
          last_seen: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          name: string;
          session_id: string;
          role?: PlayerRole | null;
          party?: PartyType | null;
          is_alive?: boolean;
          is_spectator?: boolean;
          seat_index?: number | null;
          is_connected?: boolean;
          last_seen?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          name?: string;
          session_id?: string;
          role?: PlayerRole | null;
          party?: PartyType | null;
          is_alive?: boolean;
          is_spectator?: boolean;
          seat_index?: number | null;
          is_connected?: boolean;
          last_seen?: string;
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          election_round: number;
          vote: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          election_round: number;
          vote?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_id?: string;
          election_round?: number;
          vote?: boolean | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      game_phase: GamePhase;
      player_role: PlayerRole;
      party_type: PartyType;
      team_type: TeamType;
      executive_action_type: ExecutiveActionType;
    };
  };
}
