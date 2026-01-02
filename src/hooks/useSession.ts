'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSession,
  createSession,
  updateSession,
  clearGameFromSession,
  clearSession,
  type PlayerSession,
} from '@/lib/utils/session';

interface UseSessionResult {
  session: PlayerSession | null;
  loading: boolean;
  createNewSession: (playerName: string) => PlayerSession;
  updatePlayerSession: (updates: Partial<PlayerSession>) => PlayerSession | null;
  clearCurrentGame: () => void;
  logout: () => void;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load session from localStorage on mount
    const existingSession = getSession();
    setSession(existingSession);
    setLoading(false);
  }, []);

  const createNewSession = useCallback((playerName: string): PlayerSession => {
    const newSession = createSession(playerName);
    setSession(newSession);
    return newSession;
  }, []);

  const updatePlayerSession = useCallback(
    (updates: Partial<PlayerSession>): PlayerSession | null => {
      try {
        const updated = updateSession(updates);
        setSession(updated);
        return updated;
      } catch {
        return null;
      }
    },
    []
  );

  const clearCurrentGame = useCallback(() => {
    clearGameFromSession();
    setSession((prev) =>
      prev
        ? { sessionId: prev.sessionId, playerName: prev.playerName }
        : null
    );
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return {
    session,
    loading,
    createNewSession,
    updatePlayerSession,
    clearCurrentGame,
    logout,
  };
}
