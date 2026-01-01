// ============================================================================
// Core Game Types
// ============================================================================

export type GamePhase =
  | 'lobby'
  | 'night'
  | 'nomination'
  | 'voting'
  | 'voting_result'
  | 'legislative_president'
  | 'legislative_chancellor'
  | 'veto_requested'
  | 'executive_action'
  | 'game_over';

export type PlayerRole = 'liberal' | 'fascist' | 'hitler';

export type PartyType = 'liberal' | 'fascist';

export type TeamType = 'liberal' | 'fascist';

export type PolicyType = 'liberal' | 'fascist';

export type ExecutiveActionType =
  | 'investigate_loyalty'
  | 'special_election'
  | 'policy_peek'
  | 'execution';

// ============================================================================
// Database Entity Interfaces
// ============================================================================

export interface Game {
  id: string;
  room_code: string;
  phase: GamePhase;

  // Policy tracking
  liberal_policies: number;
  fascist_policies: number;
  policy_deck: PolicyType[];
  discard_pile: PolicyType[];

  // Election state
  election_tracker: number;
  election_round: number;
  president_index: number | null;
  chancellor_id: string | null;
  previous_president_id: string | null;
  previous_chancellor_id: string | null;

  // Legislative session state
  drawn_policies: PolicyType[] | null;
  president_choices: PolicyType[] | null;

  // Executive action state
  pending_executive_action: ExecutiveActionType | null;
  investigated_players: string[];
  special_election_president_index: number | null;

  // Veto tracking
  veto_unlocked: boolean;
  veto_requested: boolean;

  // Game metadata
  player_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  winner: TeamType | null;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  session_id: string;

  // Role (hidden from other players)
  role: PlayerRole | null;
  party: PartyType | null;

  // Status
  is_alive: boolean;
  is_spectator: boolean;
  seat_index: number | null;

  // Connection state
  is_connected: boolean;
  last_seen: string;

  created_at: string;
}

export interface Vote {
  id: string;
  game_id: string;
  player_id: string;
  election_round: number;
  vote: boolean | null; // true = Ja!, false = Nein, null = not voted
  created_at: string;
}

// ============================================================================
// Game State Interfaces
// ============================================================================

export interface GameState {
  game: Game;
  players: Player[];
  votes: Vote[];
  currentPlayer: Player | null;
}

export interface PlayerView {
  player: Player;
  visibleRole: PlayerRole | null;
  visibleParty: PartyType | null;
  knownFascists: Player[];
  knownHitler: Player | null;
  isPresident: boolean;
  isChancellor: boolean;
}

export interface PublicGameState {
  game: Omit<Game, 'policy_deck' | 'drawn_policies' | 'president_choices'>;
  players: Omit<Player, 'role'>[];
  votes: Vote[];
}

// ============================================================================
// Action Types
// ============================================================================

export interface CreateGameAction {
  type: 'create_game';
  hostName: string;
  sessionId: string;
}

export interface JoinGameAction {
  type: 'join_game';
  roomCode: string;
  playerName: string;
  sessionId: string;
  asSpectator?: boolean;
}

export interface StartGameAction {
  type: 'start_game';
  gameId: string;
  playerId: string;
}

export interface NominateChancellorAction {
  type: 'nominate_chancellor';
  gameId: string;
  presidentId: string;
  nomineeId: string;
}

export interface CastVoteAction {
  type: 'cast_vote';
  gameId: string;
  playerId: string;
  vote: boolean;
}

export interface PresidentDiscardAction {
  type: 'president_discard';
  gameId: string;
  presidentId: string;
  discardIndex: number;
}

export interface ChancellorEnactAction {
  type: 'chancellor_enact';
  gameId: string;
  chancellorId: string;
  enactIndex: number;
}

export interface RequestVetoAction {
  type: 'request_veto';
  gameId: string;
  chancellorId: string;
}

export interface RespondToVetoAction {
  type: 'respond_to_veto';
  gameId: string;
  presidentId: string;
  accept: boolean;
}

export interface InvestigateAction {
  type: 'investigate';
  gameId: string;
  presidentId: string;
  targetId: string;
}

export interface SpecialElectionAction {
  type: 'special_election';
  gameId: string;
  presidentId: string;
  targetId: string;
}

export interface PolicyPeekAction {
  type: 'policy_peek';
  gameId: string;
  presidentId: string;
}

export interface ExecutePlayerAction {
  type: 'execute_player';
  gameId: string;
  presidentId: string;
  targetId: string;
}

export type GameAction =
  | CreateGameAction
  | JoinGameAction
  | StartGameAction
  | NominateChancellorAction
  | CastVoteAction
  | PresidentDiscardAction
  | ChancellorEnactAction
  | RequestVetoAction
  | RespondToVetoAction
  | InvestigateAction
  | SpecialElectionAction
  | PolicyPeekAction
  | ExecutePlayerAction;

// ============================================================================
// Result Types
// ============================================================================

export interface VoteResult {
  passed: boolean;
  yesCount: number;
  noCount: number;
  votes: { playerId: string; playerName: string; vote: boolean }[];
}

export interface ElectionResult {
  result: 'passed' | 'failed' | 'chaos' | 'hitler_elected';
  voteResult?: VoteResult;
  chaosPolicy?: PolicyType;
}

export interface LegislativeResult {
  enactedPolicy: PolicyType;
  gameOver: boolean;
  winner?: TeamType;
  executivePower?: ExecutiveActionType;
}

export interface ExecutionResult {
  targetId: string;
  wasHitler: boolean;
  gameOver: boolean;
  winner?: TeamType;
}
