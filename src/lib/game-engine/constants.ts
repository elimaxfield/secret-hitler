import type { ExecutiveActionType } from '@/types/game';

// ============================================================================
// Role Distribution by Player Count
// ============================================================================

export const ROLE_DISTRIBUTION: Record<number, { liberals: number; fascists: number }> = {
  5: { liberals: 3, fascists: 1 },  // + 1 Hitler = 2 fascist team
  6: { liberals: 4, fascists: 1 },  // + 1 Hitler = 2 fascist team
  7: { liberals: 4, fascists: 2 },  // + 1 Hitler = 3 fascist team
  8: { liberals: 5, fascists: 2 },  // + 1 Hitler = 3 fascist team
  9: { liberals: 5, fascists: 3 },  // + 1 Hitler = 4 fascist team
  10: { liberals: 6, fascists: 3 }, // + 1 Hitler = 4 fascist team
};

// ============================================================================
// Fascist Board Powers
// ============================================================================

type BoardPowers = (ExecutiveActionType | null)[];

// Powers by board size (indexed by number of fascist policies enacted - 1)
// Index 0 = first fascist policy, Index 5 = sixth fascist policy (game ends before this)
const BOARD_POWERS_SMALL: BoardPowers = [
  null,                    // 1st fascist policy
  null,                    // 2nd
  'policy_peek',           // 3rd
  'execution',             // 4th
  'execution',             // 5th
  null,                    // 6th (game over)
];

const BOARD_POWERS_MEDIUM: BoardPowers = [
  null,                    // 1st fascist policy
  'investigate_loyalty',   // 2nd
  'special_election',      // 3rd
  'execution',             // 4th
  'execution',             // 5th
  null,                    // 6th (game over)
];

const BOARD_POWERS_LARGE: BoardPowers = [
  'investigate_loyalty',   // 1st fascist policy
  'investigate_loyalty',   // 2nd
  'special_election',      // 3rd
  'execution',             // 4th
  'execution',             // 5th
  null,                    // 6th (game over)
];

export const FASCIST_BOARD_POWERS: Record<'small' | 'medium' | 'large', BoardPowers> = {
  small: BOARD_POWERS_SMALL,
  medium: BOARD_POWERS_MEDIUM,
  large: BOARD_POWERS_LARGE,
};

// ============================================================================
// Policy Deck
// ============================================================================

export const INITIAL_POLICY_DECK = {
  liberal: 6,
  fascist: 11,
};

// ============================================================================
// Win Conditions
// ============================================================================

export const LIBERAL_POLICIES_TO_WIN = 5;
export const FASCIST_POLICIES_TO_WIN = 6;
export const FASCIST_POLICIES_FOR_HITLER_ELECTION_WIN = 3;

// ============================================================================
// Election Tracker
// ============================================================================

export const ELECTION_TRACKER_CHAOS_THRESHOLD = 3;

// ============================================================================
// Veto Power
// ============================================================================

export const VETO_UNLOCK_THRESHOLD = 5; // Fascist policies needed to unlock veto

// ============================================================================
// Player Count Limits
// ============================================================================

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

// ============================================================================
// Helper Functions
// ============================================================================

export type BoardSize = 'small' | 'medium' | 'large';

/**
 * Get the board size based on player count
 */
export function getBoardSize(playerCount: number): BoardSize {
  if (playerCount <= 6) return 'small';
  if (playerCount <= 8) return 'medium';
  return 'large';
}

/**
 * Get the executive power for a given fascist policy count
 * @param playerCount Number of players in the game
 * @param fascistPolicies Number of fascist policies enacted (after this enactment)
 * @returns The executive power to use, or null if none
 */
export function getExecutivePower(
  playerCount: number,
  fascistPolicies: number
): ExecutiveActionType | null {
  if (fascistPolicies < 1 || fascistPolicies > 6) return null;
  const boardSize = getBoardSize(playerCount);
  return FASCIST_BOARD_POWERS[boardSize][fascistPolicies - 1];
}

/**
 * Check if Hitler knows the fascists (only in 5-6 player games)
 */
export function hitlerKnowsFascists(playerCount: number): boolean {
  return playerCount <= 6;
}
