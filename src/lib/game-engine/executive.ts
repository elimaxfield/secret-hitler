import type { Game, Player, PartyType, TeamType, ExecutiveActionType } from '@/types/game';
import { getExecutivePower } from './constants';

/**
 * Get the required executive action for the current game state
 */
export function getRequiredExecutiveAction(
  game: Game,
  playerCount: number
): ExecutiveActionType | null {
  return getExecutivePower(playerCount, game.fascist_policies);
}

/**
 * Execute the investigate loyalty power
 */
export function executeInvestigation(
  game: Game,
  targetPlayerId: string,
  players: Player[]
): {
  targetParty: PartyType;
  updatedInvestigatedPlayers: string[];
} {
  const target = players.find((p) => p.id === targetPlayerId);
  if (!target) {
    throw new Error('Target player not found');
  }

  if (!target.party) {
    throw new Error('Target player has no party affiliation');
  }

  return {
    targetParty: target.party,
    updatedInvestigatedPlayers: [...game.investigated_players, targetPlayerId],
  };
}

/**
 * Check if a player is a valid investigation target
 */
export function isValidInvestigationTarget(
  game: Game,
  targetPlayerId: string,
  presidentId: string,
  players: Player[]
): boolean {
  const target = players.find((p) => p.id === targetPlayerId);
  if (!target) return false;

  // Cannot investigate yourself
  if (targetPlayerId === presidentId) return false;

  // Cannot investigate dead players or spectators
  if (!target.is_alive || target.is_spectator) return false;

  // Cannot investigate the same player twice
  if (game.investigated_players.includes(targetPlayerId)) return false;

  return true;
}

/**
 * Execute the special election power
 */
export function executeSpecialElection(
  game: Game,
  targetPlayerId: string,
  players: Player[]
): Partial<Game> {
  const target = players.find((p) => p.id === targetPlayerId);
  if (!target || target.seat_index === null) {
    throw new Error('Target player not found or has no seat');
  }

  return {
    // Store the current president index to return to after special election
    special_election_president_index: game.president_index,
    // Set the new president
    president_index: target.seat_index,
    phase: 'nomination',
    pending_executive_action: null,
  };
}

/**
 * Execute the policy peek power
 */
export function executePolicyPeek(game: Game): PolicyType[] {
  // Return top 3 policies (or fewer if deck is small)
  return game.policy_deck.slice(0, 3) as PolicyType[];
}

type PolicyType = 'liberal' | 'fascist';

/**
 * Execute a player
 */
export function executePlayer(
  targetPlayerId: string,
  players: Player[]
): {
  wasHitler: boolean;
  gameOver: boolean;
  winner?: TeamType;
} {
  const target = players.find((p) => p.id === targetPlayerId);
  if (!target) {
    throw new Error('Target player not found');
  }

  const wasHitler = target.role === 'hitler';

  return {
    wasHitler,
    gameOver: wasHitler,
    winner: wasHitler ? 'liberal' : undefined,
  };
}

/**
 * Check if a player is a valid execution target
 */
export function isValidExecutionTarget(
  presidentId: string,
  targetPlayerId: string,
  players: Player[]
): boolean {
  const target = players.find((p) => p.id === targetPlayerId);
  if (!target) return false;

  // Cannot execute yourself
  if (targetPlayerId === presidentId) return false;

  // Cannot execute dead players or spectators
  if (!target.is_alive || target.is_spectator) return false;

  return true;
}

/**
 * Get valid targets for the current executive action
 */
export function getValidExecutiveTargets(
  game: Game,
  players: Player[],
  presidentId: string,
  action: ExecutiveActionType
): Player[] {
  const alivePlayers = players.filter(
    (p) => p.is_alive && !p.is_spectator && p.id !== presidentId
  );

  switch (action) {
    case 'investigate_loyalty':
      return alivePlayers.filter(
        (p) => !game.investigated_players.includes(p.id)
      );
    case 'special_election':
    case 'execution':
      return alivePlayers;
    case 'policy_peek':
      return []; // No targets needed
    default:
      return [];
  }
}
