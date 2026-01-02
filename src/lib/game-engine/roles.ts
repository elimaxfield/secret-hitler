import type { PlayerRole, PartyType, Player } from '@/types/game';
import { ROLE_DISTRIBUTION, hitlerKnowsFascists } from './constants';

/**
 * Fisher-Yates shuffle
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Assign roles based on player count
 * Returns an array of roles in random order to assign to players by seat index
 */
export function assignRoles(playerCount: number): PlayerRole[] {
  const distribution = ROLE_DISTRIBUTION[playerCount];
  if (!distribution) {
    throw new Error(`Invalid player count: ${playerCount}. Must be between 5 and 10.`);
  }

  const roles: PlayerRole[] = [];

  // Add liberals
  for (let i = 0; i < distribution.liberals; i++) {
    roles.push('liberal');
  }

  // Add fascists
  for (let i = 0; i < distribution.fascists; i++) {
    roles.push('fascist');
  }

  // Add Hitler
  roles.push('hitler');

  // Shuffle and return
  return shuffle(roles);
}

/**
 * Get party affiliation from role
 */
export function getPartyFromRole(role: PlayerRole): PartyType {
  return role === 'liberal' ? 'liberal' : 'fascist';
}

/**
 * Get which players a given player can see during the night phase
 * - Liberals see no one
 * - Fascists see other fascists AND Hitler
 * - Hitler sees fascists in 5-6 player games, no one in 7-10 player games
 */
export function getFascistKnowledge(
  players: Player[],
  currentPlayer: Player,
  playerCount: number
): Player[] {
  if (!currentPlayer.role) return [];

  if (currentPlayer.role === 'liberal') {
    return [];
  }

  if (currentPlayer.role === 'hitler') {
    // Hitler only knows fascists in 5-6 player games
    if (hitlerKnowsFascists(playerCount)) {
      return players.filter(
        (p) => p.id !== currentPlayer.id && p.role === 'fascist'
      );
    }
    return [];
  }

  // Regular fascist: sees other fascists and Hitler
  return players.filter(
    (p) =>
      p.id !== currentPlayer.id &&
      (p.role === 'fascist' || p.role === 'hitler')
  );
}

/**
 * Get detailed teammate information for the night phase
 */
export function getTeammates(
  players: Player[],
  currentPlayer: Player,
  playerCount: number
): { player: Player; role: PlayerRole }[] {
  const visiblePlayers = getFascistKnowledge(players, currentPlayer, playerCount);

  return visiblePlayers.map((p) => ({
    player: p,
    role: p.role!,
  }));
}
