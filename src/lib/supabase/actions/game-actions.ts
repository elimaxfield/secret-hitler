/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClient } from '../client';
import type { Game, Player, Vote, PolicyType, PartyType, TeamType, ExecutiveActionType } from '@/types/game';
import { generateRoomCode } from '@/lib/utils/room-codes';
import {
  assignRoles,
  getPartyFromRole,
  createPolicyDeck,
  startLegislativeSession,
  presidentDiscardPolicy,
  chancellorEnactPolicy,
  enactPolicy,
  canVeto,
  handleVetoRequest,
  handleVetoResponse,
  calculateVoteResult,
  handleFailedElection,
  handleChaos,
  resetTermLimits,
  checkHitlerElection,
  getNextPresidentIndex,
  isEligibleForChancellor,
  executeInvestigation,
  isValidInvestigationTarget,
  executeSpecialElection,
  executePolicyPeek,
  executePlayer,
  isValidExecutionTarget,
  getExecutivePower,
  discardPolicy,
} from '@/lib/game-engine';

const supabase = getSupabaseClient();

// ============================================================================
// Game Creation & Joining
// ============================================================================

export async function createGame(
  hostName: string,
  sessionId: string
): Promise<{ game: Game; player: Player }> {
  // Generate a unique room code
  let roomCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    roomCode = generateRoomCode();
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (!existing) break;
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique room code');
  }

  // Create the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      room_code: roomCode!,
      phase: 'lobby',
      player_count: 1,
    })
    .select()
    .single();

  if (gameError || !game) {
    throw new Error(gameError?.message || 'Failed to create game');
  }

  // Create the host player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      name: hostName,
      session_id: sessionId,
      seat_index: 0,
      is_spectator: false,
    })
    .select()
    .single();

  if (playerError || !player) {
    // Cleanup game if player creation fails
    await supabase.from('games').delete().eq('id', game.id);
    throw new Error(playerError?.message || 'Failed to create player');
  }

  return { game: game as Game, player: player as Player };
}

export async function joinGame(
  roomCode: string,
  playerName: string,
  sessionId: string,
  asSpectator: boolean = false
): Promise<{ game: Game; player: Player }> {
  // Find the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (gameError || !game) {
    throw new Error('Game not found');
  }

  // Check if game is joinable
  if (!asSpectator && game.phase !== 'lobby') {
    throw new Error('Game has already started');
  }

  // Check if this session is already in the game
  const { data: existingPlayer } = await supabase
    .from('players')
    .select()
    .eq('game_id', game.id)
    .eq('session_id', sessionId)
    .single();

  if (existingPlayer) {
    // Reconnecting - update connection status
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({
        is_connected: true,
        last_seen: new Date().toISOString(),
        name: playerName, // Allow name update on reconnect
      })
      .eq('id', existingPlayer.id)
      .select()
      .single();

    if (updateError || !updatedPlayer) {
      throw new Error('Failed to reconnect');
    }

    return { game: game as Game, player: updatedPlayer as Player };
  }

  // Check player limit
  if (!asSpectator && game.player_count >= 10) {
    throw new Error('Game is full');
  }

  // Get the next seat index
  const { data: players } = await supabase
    .from('players')
    .select('seat_index')
    .eq('game_id', game.id)
    .eq('is_spectator', false)
    .order('seat_index', { ascending: false })
    .limit(1);

  const nextSeatIndex = asSpectator ? null : ((players?.[0]?.seat_index ?? -1) + 1);

  // Create the player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      name: playerName,
      session_id: sessionId,
      seat_index: nextSeatIndex,
      is_spectator: asSpectator,
    })
    .select()
    .single();

  if (playerError || !player) {
    throw new Error(playerError?.message || 'Failed to join game');
  }

  // Update player count if not spectator
  if (!asSpectator) {
    await supabase
      .from('games')
      .update({ player_count: game.player_count + 1 })
      .eq('id', game.id);
  }

  return { game: game as Game, player: player as Player };
}

export async function reconnectPlayer(
  sessionId: string
): Promise<{ game: Game; player: Player } | null> {
  // Find player with this session in an active game
  const { data: player } = await supabase
    .from('players')
    .select('*, games(*)')
    .eq('session_id', sessionId)
    .eq('is_connected', false)
    .not('games.phase', 'eq', 'game_over')
    .single();

  if (!player || !player.games) {
    return null;
  }

  // Mark as connected
  const { data: updatedPlayer, error } = await supabase
    .from('players')
    .update({
      is_connected: true,
      last_seen: new Date().toISOString(),
    })
    .eq('id', player.id)
    .select()
    .single();

  if (error || !updatedPlayer) {
    return null;
  }

  return {
    game: player.games as unknown as Game,
    player: updatedPlayer as Player,
  };
}

export async function leaveGame(gameId: string, playerId: string): Promise<void> {
  // Mark as disconnected
  await supabase
    .from('players')
    .update({ is_connected: false })
    .eq('id', playerId);
}

// ============================================================================
// Game Start
// ============================================================================

export async function startGame(
  gameId: string,
  hostPlayerId: string
): Promise<Game> {
  // Get game and players
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    throw new Error('Game not found');
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .eq('is_spectator', false)
    .order('seat_index');

  if (playersError || !players) {
    throw new Error('Failed to get players');
  }

  const typedPlayers = players as Player[];

  // Validate
  if (game.phase !== 'lobby') {
    throw new Error('Game has already started');
  }

  const host = typedPlayers.find((p) => p.id === hostPlayerId);
  if (!host || host.seat_index !== 0) {
    throw new Error('Only the host can start the game');
  }

  if (typedPlayers.length < 5) {
    throw new Error('Need at least 5 players to start');
  }

  if (typedPlayers.length > 10) {
    throw new Error('Maximum 10 players allowed');
  }

  // Assign roles
  const roles = assignRoles(typedPlayers.length);

  // Update each player with their role
  for (let i = 0; i < typedPlayers.length; i++) {
    const role = roles[i];
    await supabase
      .from('players')
      .update({
        role,
        party: getPartyFromRole(role),
      })
      .eq('id', typedPlayers[i].id);
  }

  // Create and shuffle policy deck
  const policyDeck = createPolicyDeck();

  // Pick random starting president
  const presidentIndex = Math.floor(Math.random() * typedPlayers.length);

  // Update game state
  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update({
      phase: 'night',
      policy_deck: policyDeck,
      president_index: presidentIndex,
      started_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select()
    .single();

  if (updateError || !updatedGame) {
    throw new Error('Failed to start game');
  }

  return updatedGame as Game;
}

// ============================================================================
// Night Phase
// ============================================================================

export async function proceedFromNight(gameId: string): Promise<Game> {
  const { data: game, error } = await supabase
    .from('games')
    .update({
      phase: 'nomination',
      election_round: 1,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !game) {
    throw new Error('Failed to proceed from night phase');
  }

  return game as Game;
}

// ============================================================================
// Election Flow
// ============================================================================

export async function nominateChancellor(
  gameId: string,
  presidentId: string,
  nomineeId: string
): Promise<Game> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .eq('is_spectator', false);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const typedPlayers = players as Player[];

  // Validate president
  const president = typedPlayers.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  // Validate nominee eligibility
  if (!isEligibleForChancellor(game as Game, typedPlayers, nomineeId)) {
    throw new Error('This player cannot be nominated');
  }

  // Update game
  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      chancellor_id: nomineeId,
      phase: 'voting',
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to nominate chancellor');
  }

  return updatedGame as Game;
}

export async function castVote(
  gameId: string,
  playerId: string,
  vote: boolean
): Promise<{ vote: Vote; allVoted: boolean }> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  if (!game || game.phase !== 'voting') {
    throw new Error('Not in voting phase');
  }

  // Create or update vote
  const { data: voteData, error: voteError } = await supabase
    .from('votes')
    .upsert({
      game_id: gameId,
      player_id: playerId,
      election_round: game.election_round,
      vote,
    })
    .select()
    .single();

  if (voteError || !voteData) {
    throw new Error('Failed to cast vote');
  }

  // Check if all players have voted
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', gameId)
    .eq('is_alive', true)
    .eq('is_spectator', false);

  const { data: votes } = await supabase
    .from('votes')
    .select()
    .eq('game_id', gameId)
    .eq('election_round', game.election_round)
    .not('vote', 'is', null);

  const allVoted = votes?.length === alivePlayers?.length;

  // If all voted, transition to voting_result
  if (allVoted) {
    await supabase
      .from('games')
      .update({ phase: 'voting_result' })
      .eq('id', gameId);
  }

  return { vote: voteData as Vote, allVoted };
}

export async function resolveElection(
  gameId: string
): Promise<{ game: Game; result: 'passed' | 'failed' | 'chaos' | 'hitler_elected' }> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .eq('is_spectator', false);

  const { data: votes } = await supabase
    .from('votes')
    .select()
    .eq('game_id', gameId)
    .eq('election_round', game!.election_round);

  if (!game || !players || !votes) {
    throw new Error('Failed to get election data');
  }

  const typedPlayers = players as Player[];
  const voteResult = calculateVoteResult(votes as Vote[]);

  if (voteResult.passed) {
    // Check for Hitler election win
    if (checkHitlerElection(game as Game, game.chancellor_id!, typedPlayers)) {
      const { data: updatedGame } = await supabase
        .from('games')
        .update({
          phase: 'game_over',
          winner: 'fascist',
          ended_at: new Date().toISOString(),
        })
        .eq('id', gameId)
        .select()
        .single();

      return { game: updatedGame as Game, result: 'hitler_elected' };
    }

    // Start legislative session
    const legislative = startLegislativeSession(game as Game);

    const { data: updatedGame } = await supabase
      .from('games')
      .update({
        phase: 'legislative_president',
        previous_president_id: typedPlayers.find((p) => p.seat_index === game.president_index)?.id,
        previous_chancellor_id: game.chancellor_id,
        drawn_policies: legislative.drawnPolicies,
        policy_deck: legislative.newDeck,
        discard_pile: legislative.newDiscardPile,
      })
      .eq('id', gameId)
      .select()
      .single();

    return { game: updatedGame as Game, result: 'passed' };
  } else {
    // Election failed
    const failResult = handleFailedElection(game as Game);

    if (failResult.chaos) {
      // Handle chaos
      const chaosResult = handleChaos(game as Game);
      const termLimitReset = resetTermLimits();

      // Enact the chaos policy
      const enactResult = enactPolicy(
        { ...game, ...termLimitReset } as Game,
        chaosResult.topPolicy,
        typedPlayers.length
      );

      const nextPresidentIndex = getNextPresidentIndex(
        game.president_index!,
        typedPlayers
      );

      const { data: updatedGame } = await supabase
        .from('games')
        .update({
          ...enactResult.updates,
          ...termLimitReset,
          policy_deck: chaosResult.newDeck,
          discard_pile: chaosResult.newDiscardPile,
          election_tracker: 0,
          president_index: nextPresidentIndex,
          chancellor_id: null,
          election_round: game.election_round + 1,
          phase: enactResult.gameOver ? 'game_over' : 'nomination',
        })
        .eq('id', gameId)
        .select()
        .single();

      return { game: updatedGame as Game, result: 'chaos' };
    } else {
      // Just failed, move to next president
      const nextPresidentIndex = getNextPresidentIndex(
        game.president_index!,
        typedPlayers
      );

      const { data: updatedGame } = await supabase
        .from('games')
        .update({
          phase: 'nomination',
          election_tracker: failResult.electionTracker,
          president_index: nextPresidentIndex,
          chancellor_id: null,
          election_round: game.election_round + 1,
        })
        .eq('id', gameId)
        .select()
        .single();

      return { game: updatedGame as Game, result: 'failed' };
    }
  }
}

// ============================================================================
// Legislative Session
// ============================================================================

export async function getPresidentPolicies(
  gameId: string,
  presidentId: string
): Promise<PolicyType[]> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const typedPlayers = players as Player[];
  const president = typedPlayers.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  if (game.phase !== 'legislative_president') {
    throw new Error('Not in legislative session');
  }

  return game.drawn_policies as PolicyType[];
}

export async function presidentDiscard(
  gameId: string,
  presidentId: string,
  discardIndex: number
): Promise<Game> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const typedPlayers2 = players as Player[];

  const president = players.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  const result = presidentDiscardPolicy(
    game.drawn_policies as PolicyType[],
    discardIndex
  );

  const newDiscardPile = discardPolicy(
    game.discard_pile as PolicyType[],
    result.discarded
  );

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      phase: 'legislative_chancellor',
      president_choices: result.remainingPolicies,
      drawn_policies: null,
      discard_pile: newDiscardPile,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to discard policy');
  }

  return updatedGame as Game;
}

export async function getChancellorPolicies(
  gameId: string,
  chancellorId: string
): Promise<PolicyType[]> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  if (!game || game.chancellor_id !== chancellorId) {
    throw new Error('You are not the chancellor');
  }

  if (game.phase !== 'legislative_chancellor') {
    throw new Error('Not in legislative session');
  }

  return game.president_choices as PolicyType[];
}

export async function chancellorEnact(
  gameId: string,
  chancellorId: string,
  enactIndex: number
): Promise<{ game: Game; gameOver: boolean; winner?: TeamType }> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .eq('is_spectator', false);

  if (!game || !players || game.chancellor_id !== chancellorId) {
    throw new Error('You are not the chancellor');
  }

  const result = chancellorEnactPolicy(
    game.president_choices as PolicyType[],
    enactIndex
  );

  const newDiscardPile = discardPolicy(
    game.discard_pile as PolicyType[],
    result.discarded
  );

  const enactResult = enactPolicy(game as Game, result.enacted, players.length);

  let nextPhase = enactResult.updates.phase;
  let pendingAction: ExecutiveActionType | null = null;

  if (!enactResult.gameOver && enactResult.executivePower) {
    nextPhase = 'executive_action';
    pendingAction = enactResult.executivePower;
  } else if (!enactResult.gameOver) {
    const nextPresidentIndex = game.special_election_president_index !== null
      ? getNextPresidentIndex(game.special_election_president_index, players as Player[])
      : getNextPresidentIndex(game.president_index!, players as Player[]);

    enactResult.updates.president_index = nextPresidentIndex;
    enactResult.updates.special_election_president_index = null;
    enactResult.updates.chancellor_id = null;
    enactResult.updates.election_round = game.election_round + 1;
    nextPhase = 'nomination';
  }

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      ...enactResult.updates,
      phase: nextPhase,
      pending_executive_action: pendingAction,
      president_choices: null,
      discard_pile: newDiscardPile,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to enact policy');
  }

  return {
    game: updatedGame as Game,
    gameOver: enactResult.gameOver,
    winner: enactResult.winner,
  };
}

export async function requestVeto(
  gameId: string,
  chancellorId: string
): Promise<Game> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  if (!game || game.chancellor_id !== chancellorId) {
    throw new Error('You are not the chancellor');
  }

  if (!canVeto(game as Game)) {
    throw new Error('Veto power is not unlocked');
  }

  const vetoUpdate = handleVetoRequest();

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update(vetoUpdate)
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to request veto');
  }

  return updatedGame as Game;
}

export async function respondToVeto(
  gameId: string,
  presidentId: string,
  accept: boolean
): Promise<Game> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .eq('is_spectator', false);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const president = players.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  const result = handleVetoResponse(
    game as Game,
    accept,
    game.president_choices as PolicyType[]
  );

  if (accept) {
    const nextPresidentIndex = getNextPresidentIndex(
      game.president_index!,
      players as Player[]
    );

    result.updates.president_index = nextPresidentIndex;
    result.updates.chancellor_id = null;
    result.updates.election_round = game.election_round + 1;
  }

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      ...result.updates,
      discard_pile: result.newDiscardPile,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to respond to veto');
  }

  return updatedGame as Game;
}

// ============================================================================
// Executive Actions
// ============================================================================

export async function investigatePlayer(
  gameId: string,
  presidentId: string,
  targetId: string
): Promise<{ party: PartyType; game: Game }> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const president = players.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  if (!isValidInvestigationTarget(game as Game, targetId, presidentId, players as Player[])) {
    throw new Error('Invalid investigation target');
  }

  const result = executeInvestigation(game as Game, targetId, players as Player[]);

  const nextPresidentIndex = game.special_election_president_index !== null
    ? getNextPresidentIndex(game.special_election_president_index, players as Player[])
    : getNextPresidentIndex(game.president_index!, players as Player[]);

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      phase: 'nomination',
      pending_executive_action: null,
      investigated_players: result.updatedInvestigatedPlayers,
      president_index: nextPresidentIndex,
      special_election_president_index: null,
      chancellor_id: null,
      election_round: game.election_round + 1,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to investigate');
  }

  return { party: result.targetParty, game: updatedGame as Game };
}

export async function callSpecialElection(
  gameId: string,
  presidentId: string,
  targetId: string
): Promise<Game> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const president = players.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  const target = players.find((p) => p.id === targetId);
  if (!target || !target.is_alive || target.is_spectator || targetId === presidentId) {
    throw new Error('Invalid target for special election');
  }

  const updates = executeSpecialElection(game as Game, targetId, players as Player[]);

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      ...updates,
      chancellor_id: null,
      election_round: game.election_round + 1,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to call special election');
  }

  return updatedGame as Game;
}

export async function peekPolicies(
  gameId: string,
  presidentId: string
): Promise<{ policies: PolicyType[]; game: Game }> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .eq('is_spectator', false);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const president = players.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  const policies = executePolicyPeek(game as Game);

  const nextPresidentIndex = game.special_election_president_index !== null
    ? getNextPresidentIndex(game.special_election_president_index, players as Player[])
    : getNextPresidentIndex(game.president_index!, players as Player[]);

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      phase: 'nomination',
      pending_executive_action: null,
      president_index: nextPresidentIndex,
      special_election_president_index: null,
      chancellor_id: null,
      election_round: game.election_round + 1,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to peek policies');
  }

  return { policies, game: updatedGame as Game };
}

export async function executePlayerAction(
  gameId: string,
  presidentId: string,
  targetId: string
): Promise<{ game: Game; gameOver: boolean; winner?: TeamType; wasHitler: boolean }> {
  const { data: game } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId);

  if (!game || !players) {
    throw new Error('Game not found');
  }

  const president = players.find((p) => p.seat_index === game.president_index);
  if (!president || president.id !== presidentId) {
    throw new Error('You are not the president');
  }

  if (!isValidExecutionTarget(presidentId, targetId, players as Player[])) {
    throw new Error('Invalid execution target');
  }

  const result = executePlayer(targetId, players as Player[]);

  // Mark player as dead
  await supabase
    .from('players')
    .update({ is_alive: false })
    .eq('id', targetId);

  const alivePlayers = players.filter(
    (p) => p.is_alive && !p.is_spectator && p.id !== targetId
  );

  if (result.gameOver) {
    const { data: updatedGame, error } = await supabase
      .from('games')
      .update({
        phase: 'game_over',
        winner: 'liberal',
        ended_at: new Date().toISOString(),
        pending_executive_action: null,
      })
      .eq('id', gameId)
      .select()
      .single();

    if (error || !updatedGame) {
      throw new Error('Failed to end game');
    }

    return {
      game: updatedGame as Game,
      gameOver: true,
      winner: 'liberal',
      wasHitler: true,
    };
  }

  const nextPresidentIndex = game.special_election_president_index !== null
    ? getNextPresidentIndex(game.special_election_president_index, alivePlayers as Player[])
    : getNextPresidentIndex(game.president_index!, alivePlayers as Player[]);

  const { data: updatedGame, error } = await supabase
    .from('games')
    .update({
      phase: 'nomination',
      pending_executive_action: null,
      president_index: nextPresidentIndex,
      special_election_president_index: null,
      chancellor_id: null,
      election_round: game.election_round + 1,
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !updatedGame) {
    throw new Error('Failed to execute player');
  }

  return {
    game: updatedGame as Game,
    gameOver: false,
    wasHitler: false,
  };
}
