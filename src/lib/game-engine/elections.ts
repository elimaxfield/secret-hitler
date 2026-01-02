import type { Game, Player, Vote, PolicyType, VoteResult } from '@/types/game';
import { ELECTION_TRACKER_CHAOS_THRESHOLD } from './constants';
import { reshuffleIfNeeded, drawPolicies } from './policies';

/**
 * Get the next president index (clockwise from current)
 */
export function getNextPresidentIndex(
  currentIndex: number,
  players: Player[]
): number {
  const alivePlayers = players.filter((p) => p.is_alive && !p.is_spectator);
  const aliveIndices = alivePlayers
    .map((p) => p.seat_index!)
    .sort((a, b) => a - b);

  if (aliveIndices.length === 0) {
    throw new Error('No alive players');
  }

  // Find the next alive player clockwise
  const currentPosition = aliveIndices.indexOf(currentIndex);

  if (currentPosition === -1) {
    // Current index is dead, find next alive after it
    const nextIndex = aliveIndices.find((i) => i > currentIndex);
    return nextIndex !== undefined ? nextIndex : aliveIndices[0];
  }

  // Return next alive player, wrapping around if needed
  const nextPosition = (currentPosition + 1) % aliveIndices.length;
  return aliveIndices[nextPosition];
}

/**
 * Check if a player is eligible to be nominated as Chancellor
 */
export function isEligibleForChancellor(
  game: Game,
  players: Player[],
  candidateId: string
): boolean {
  const candidate = players.find((p) => p.id === candidateId);
  if (!candidate) return false;

  // Must be alive and not a spectator
  if (!candidate.is_alive || candidate.is_spectator) return false;

  // Cannot be the current presidential candidate
  const president = players.find((p) => p.seat_index === game.president_index);
  if (president && president.id === candidateId) return false;

  // Check term limits
  const alivePlayers = players.filter((p) => p.is_alive && !p.is_spectator);

  // With 5 or fewer alive players, only Chancellor is term-limited
  if (alivePlayers.length <= 5) {
    return candidateId !== game.previous_chancellor_id;
  }

  // With more than 5 players, both previous President and Chancellor are term-limited
  return (
    candidateId !== game.previous_president_id &&
    candidateId !== game.previous_chancellor_id
  );
}

/**
 * Get all eligible chancellor candidates
 */
export function getEligibleChancellorCandidates(
  game: Game,
  players: Player[]
): Player[] {
  return players.filter((p) => isEligibleForChancellor(game, players, p.id));
}

/**
 * Calculate the vote result
 */
export function calculateVoteResult(votes: Vote[]): VoteResult {
  const validVotes = votes.filter((v) => v.vote !== null);
  const yesVotes = validVotes.filter((v) => v.vote === true);
  const noVotes = validVotes.filter((v) => v.vote === false);

  return {
    passed: yesVotes.length > noVotes.length, // Majority required, ties fail
    yesCount: yesVotes.length,
    noCount: noVotes.length,
    votes: validVotes.map((v) => ({
      playerId: v.player_id,
      playerName: '', // To be filled in by caller if needed
      vote: v.vote!,
    })),
  };
}

/**
 * Handle a failed election
 */
export function handleFailedElection(game: Game): {
  electionTracker: number;
  chaos: boolean;
} {
  const newTracker = game.election_tracker + 1;
  return {
    electionTracker: newTracker,
    chaos: newTracker >= ELECTION_TRACKER_CHAOS_THRESHOLD,
  };
}

/**
 * Handle chaos - draw and enact top policy
 */
export function handleChaos(game: Game): {
  topPolicy: PolicyType;
  newDeck: PolicyType[];
  newDiscardPile: PolicyType[];
} {
  // First, reshuffle if needed
  let { deck, discardPile } = reshuffleIfNeeded(
    game.policy_deck,
    game.discard_pile,
    1
  );

  // Draw the top policy
  const { drawn, remaining } = drawPolicies(deck, 1);
  const topPolicy = drawn[0];

  // Reshuffle again if deck is low
  const reshuffled = reshuffleIfNeeded(remaining, discardPile, 3);

  return {
    topPolicy,
    newDeck: reshuffled.deck,
    newDiscardPile: reshuffled.discardPile,
  };
}

/**
 * Reset term limits (called after chaos)
 */
export function resetTermLimits(): Partial<Game> {
  return {
    previous_president_id: null,
    previous_chancellor_id: null,
  };
}

/**
 * Check if Hitler being elected as Chancellor wins the game for fascists
 */
export function checkHitlerElection(
  game: Game,
  chancellorId: string,
  players: Player[]
): boolean {
  // Need 3+ fascist policies for Hitler election to win
  if (game.fascist_policies < 3) return false;

  const chancellor = players.find((p) => p.id === chancellorId);
  return chancellor?.role === 'hitler';
}
