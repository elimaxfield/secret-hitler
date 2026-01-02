-- Secret Hitler Online - Initial Database Schema
-- Run this in your Supabase SQL editor

-- ============================================================================
-- Create Enums
-- ============================================================================

CREATE TYPE game_phase AS ENUM (
  'lobby',
  'night',
  'nomination',
  'voting',
  'voting_result',
  'legislative_president',
  'legislative_chancellor',
  'veto_requested',
  'executive_action',
  'game_over'
);

CREATE TYPE player_role AS ENUM ('liberal', 'fascist', 'hitler');

CREATE TYPE party_type AS ENUM ('liberal', 'fascist');

CREATE TYPE team_type AS ENUM ('liberal', 'fascist');

CREATE TYPE executive_action_type AS ENUM (
  'investigate_loyalty',
  'special_election',
  'policy_peek',
  'execution'
);

-- ============================================================================
-- Create Tables
-- ============================================================================

-- Games table: stores all game state
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  phase game_phase NOT NULL DEFAULT 'lobby',

  -- Policy tracking
  liberal_policies INT NOT NULL DEFAULT 0,
  fascist_policies INT NOT NULL DEFAULT 0,
  policy_deck JSONB NOT NULL DEFAULT '[]',
  discard_pile JSONB NOT NULL DEFAULT '[]',

  -- Election state
  election_tracker INT NOT NULL DEFAULT 0,
  election_round INT NOT NULL DEFAULT 0,
  president_index INT,
  chancellor_id UUID,
  previous_president_id UUID,
  previous_chancellor_id UUID,

  -- Legislative session state
  drawn_policies JSONB,
  president_choices JSONB,

  -- Executive action state
  pending_executive_action executive_action_type,
  investigated_players UUID[] DEFAULT '{}',
  special_election_president_index INT,

  -- Veto tracking
  veto_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  veto_requested BOOLEAN NOT NULL DEFAULT FALSE,

  -- Game metadata
  player_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner team_type
);

-- Players table: players in each game
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  session_id VARCHAR(100) NOT NULL,

  -- Role (hidden from other players)
  role player_role,
  party party_type,

  -- Status
  is_alive BOOLEAN NOT NULL DEFAULT TRUE,
  is_spectator BOOLEAN NOT NULL DEFAULT FALSE,
  seat_index INT,

  -- Connection state
  is_connected BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(game_id, seat_index),
  UNIQUE(game_id, session_id)
);

-- Votes table: track all votes for elections
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  election_round INT NOT NULL,
  vote BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(game_id, player_id, election_round)
);

-- ============================================================================
-- Create Indexes
-- ============================================================================

CREATE INDEX idx_games_room_code ON games(room_code);
CREATE INDEX idx_games_phase ON games(phase);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_session_id ON players(session_id);
CREATE INDEX idx_players_game_session ON players(game_id, session_id);
CREATE INDEX idx_votes_game_id ON votes(game_id);
CREATE INDEX idx_votes_game_round ON votes(game_id, election_round);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- For development/demo purposes, allow all operations
-- In production, you'd want more restrictive policies

-- Games: anyone can read and modify (we'll validate in application code)
CREATE POLICY "Allow all operations on games" ON games
  FOR ALL USING (true) WITH CHECK (true);

-- Players: anyone can read and modify
CREATE POLICY "Allow all operations on players" ON players
  FOR ALL USING (true) WITH CHECK (true);

-- Votes: anyone can read and modify
CREATE POLICY "Allow all operations on votes" ON votes
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Enable Realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to clean up old games (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS void AS $$
BEGIN
  -- Delete games older than 24 hours that are still in lobby
  DELETE FROM games
  WHERE phase = 'lobby'
    AND created_at < NOW() - INTERVAL '24 hours';

  -- Delete completed games older than 7 days
  DELETE FROM games
  WHERE phase = 'game_over'
    AND ended_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
