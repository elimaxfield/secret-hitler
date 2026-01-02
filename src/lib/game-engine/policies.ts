import type { PolicyType } from '@/types/game';
import { INITIAL_POLICY_DECK } from './constants';

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
 * Create a new shuffled policy deck
 */
export function createPolicyDeck(): PolicyType[] {
  const deck: PolicyType[] = [];

  // Add liberal policies
  for (let i = 0; i < INITIAL_POLICY_DECK.liberal; i++) {
    deck.push('liberal');
  }

  // Add fascist policies
  for (let i = 0; i < INITIAL_POLICY_DECK.fascist; i++) {
    deck.push('fascist');
  }

  return shuffle(deck);
}

/**
 * Shuffle a deck of policies
 */
export function shuffleDeck(deck: PolicyType[]): PolicyType[] {
  return shuffle(deck);
}

/**
 * Draw policies from the top of the deck
 */
export function drawPolicies(
  deck: PolicyType[],
  count: number
): { drawn: PolicyType[]; remaining: PolicyType[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}

/**
 * Reshuffle the discard pile into the deck if needed
 */
export function reshuffleIfNeeded(
  deck: PolicyType[],
  discardPile: PolicyType[],
  minimumCards: number
): { deck: PolicyType[]; discardPile: PolicyType[] } {
  if (deck.length >= minimumCards) {
    return { deck, discardPile };
  }

  // Combine remaining deck with discard pile and shuffle
  const newDeck = shuffle([...deck, ...discardPile]);

  return {
    deck: newDeck,
    discardPile: [],
  };
}

/**
 * Add a policy to the discard pile
 */
export function discardPolicy(
  discardPile: PolicyType[],
  policy: PolicyType
): PolicyType[] {
  return [...discardPile, policy];
}
