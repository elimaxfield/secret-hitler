import type { Game, PolicyType, TeamType } from '@/types/game';
import {
  LIBERAL_POLICIES_TO_WIN,
  FASCIST_POLICIES_TO_WIN,
  VETO_UNLOCK_THRESHOLD,
  getExecutivePower,
} from './constants';
import { reshuffleIfNeeded, drawPolicies, discardPolicy } from './policies';

/**
 * Start a legislative session - president draws 3 policies
 */
export function startLegislativeSession(game: Game): {
  drawnPolicies: PolicyType[];
  newDeck: PolicyType[];
  newDiscardPile: PolicyType[];
} {
  // First, reshuffle if needed
  const { deck, discardPile } = reshuffleIfNeeded(
    game.policy_deck,
    game.discard_pile,
    3
  );

  // Draw 3 policies
  const { drawn, remaining } = drawPolicies(deck, 3);

  return {
    drawnPolicies: drawn,
    newDeck: remaining,
    newDiscardPile: discardPile,
  };
}

/**
 * President discards one policy from the three drawn
 */
export function presidentDiscardPolicy(
  drawnPolicies: PolicyType[],
  discardIndex: number
): {
  remainingPolicies: PolicyType[];
  discarded: PolicyType;
} {
  if (discardIndex < 0 || discardIndex > 2) {
    throw new Error('Invalid discard index');
  }

  if (drawnPolicies.length !== 3) {
    throw new Error('Must have exactly 3 policies');
  }

  const discarded = drawnPolicies[discardIndex];
  const remainingPolicies = drawnPolicies.filter((_, i) => i !== discardIndex);

  return {
    remainingPolicies,
    discarded,
  };
}

/**
 * Chancellor enacts one policy from the two received
 */
export function chancellorEnactPolicy(
  policies: PolicyType[],
  enactIndex: number
): {
  enacted: PolicyType;
  discarded: PolicyType;
} {
  if (enactIndex < 0 || enactIndex > 1) {
    throw new Error('Invalid enact index');
  }

  if (policies.length !== 2) {
    throw new Error('Must have exactly 2 policies');
  }

  const enacted = policies[enactIndex];
  const discarded = policies[enactIndex === 0 ? 1 : 0];

  return {
    enacted,
    discarded,
  };
}

/**
 * Enact a policy and check for win conditions / executive powers
 */
export function enactPolicy(
  game: Game,
  policy: PolicyType,
  playerCount: number
): {
  updates: Partial<Game>;
  gameOver: boolean;
  winner?: TeamType;
  executivePower?: ReturnType<typeof getExecutivePower>;
} {
  const updates: Partial<Game> = {
    election_tracker: 0, // Reset election tracker
    veto_requested: false, // Reset veto request
  };

  let gameOver = false;
  let winner: TeamType | undefined;
  let executivePower: ReturnType<typeof getExecutivePower> = null;

  if (policy === 'liberal') {
    const newCount = game.liberal_policies + 1;
    updates.liberal_policies = newCount;

    if (newCount >= LIBERAL_POLICIES_TO_WIN) {
      gameOver = true;
      winner = 'liberal';
      updates.phase = 'game_over';
      updates.winner = 'liberal';
      updates.ended_at = new Date().toISOString();
    }
  } else {
    const newCount = game.fascist_policies + 1;
    updates.fascist_policies = newCount;

    // Check for veto unlock
    if (newCount >= VETO_UNLOCK_THRESHOLD) {
      updates.veto_unlocked = true;
    }

    if (newCount >= FASCIST_POLICIES_TO_WIN) {
      gameOver = true;
      winner = 'fascist';
      updates.phase = 'game_over';
      updates.winner = 'fascist';
      updates.ended_at = new Date().toISOString();
    } else {
      // Check for executive power
      executivePower = getExecutivePower(playerCount, newCount);
    }
  }

  return {
    updates,
    gameOver,
    winner,
    executivePower,
  };
}

/**
 * Check if veto power is available
 */
export function canVeto(game: Game): boolean {
  return game.veto_unlocked;
}

/**
 * Handle a veto request from the chancellor
 */
export function handleVetoRequest(): Partial<Game> {
  return {
    veto_requested: true,
    phase: 'veto_requested',
  };
}

/**
 * Handle the president's response to a veto request
 */
export function handleVetoResponse(
  game: Game,
  accepted: boolean,
  policies: PolicyType[]
): {
  updates: Partial<Game>;
  newDiscardPile: PolicyType[];
  chaos: boolean;
} {
  let discardPile = [...game.discard_pile];
  let chaos = false;

  if (accepted) {
    // Discard both policies
    policies.forEach((p) => {
      discardPile = discardPolicy(discardPile, p);
    });

    // Advance election tracker
    const newTracker = game.election_tracker + 1;
    chaos = newTracker >= 3;

    return {
      updates: {
        phase: chaos ? 'nomination' : 'nomination',
        election_tracker: chaos ? 0 : newTracker,
        veto_requested: false,
        drawn_policies: null,
        president_choices: null,
      },
      newDiscardPile: discardPile,
      chaos,
    };
  } else {
    // Veto rejected, chancellor must enact
    return {
      updates: {
        phase: 'legislative_chancellor',
        veto_requested: false,
      },
      newDiscardPile: discardPile,
      chaos: false,
    };
  }
}
