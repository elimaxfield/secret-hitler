import { v4 as uuidv4 } from 'uuid';

const SESSION_STORAGE_KEY = 'secret-hitler-session';

export interface PlayerSession {
  sessionId: string;
  playerName: string;
  currentGameId?: string;
  currentRoomCode?: string;
}

/**
 * Get the current player session from localStorage
 */
export function getSession(): PlayerSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PlayerSession;
  } catch {
    return null;
  }
}

/**
 * Create a new player session
 */
export function createSession(playerName: string): PlayerSession {
  const session: PlayerSession = {
    sessionId: uuidv4(),
    playerName,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

/**
 * Update an existing session
 */
export function updateSession(updates: Partial<PlayerSession>): PlayerSession {
  const current = getSession();
  if (!current) {
    throw new Error('No session exists');
  }

  const updated: PlayerSession = { ...current, ...updates };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
  }

  return updated;
}

/**
 * Clear game data from session (but keep player identity)
 */
export function clearGameFromSession(): void {
  const current = getSession();
  if (!current) return;

  const updated: PlayerSession = {
    sessionId: current.sessionId,
    playerName: current.playerName,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
  }
}

/**
 * Clear the entire session
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
