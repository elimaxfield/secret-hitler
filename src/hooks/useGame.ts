'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Game, Player, Vote } from '@/types/game';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseGameResult {
  game: Game | null;
  players: Player[];
  votes: Vote[];
  loading: boolean;
  error: string | null;
  currentPresident: Player | null;
  currentChancellor: Player | null;
  alivePlayers: Player[];
  refetch: () => Promise<void>;
}

export function useGame(roomCode: string): UseGameResult {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select()
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (gameError || !gameData) {
        setError('Game not found');
        return;
      }

      const typedGame = gameData as Game;
      setGame(typedGame);

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select()
        .eq('game_id', typedGame.id)
        .order('seat_index');

      if (playersError) {
        setError('Failed to load players');
        return;
      }

      setPlayers((playersData || []) as Player[]);

      // Fetch votes for current round
      const { data: votesData } = await supabase
        .from('votes')
        .select()
        .eq('game_id', typedGame.id)
        .eq('election_round', typedGame.election_round);

      setVotes((votesData || []) as Vote[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [roomCode, supabase]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!game?.id) return;

    // Set up realtime subscriptions
    const channel = supabase
      .channel(`game:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `room_code=eq.${roomCode.toUpperCase()}`,
        },
        (payload: RealtimePostgresChangesPayload<Game>) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setGame(payload.new as Game);
            // Refetch votes when election round changes
            if ((payload.new as Game).election_round !== game.election_round) {
              supabase
                .from('votes')
                .select()
                .eq('game_id', game.id)
                .eq('election_round', (payload.new as Game).election_round)
                .then(({ data }: { data: unknown }) => setVotes((data || []) as Vote[]));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${game.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Player>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setPlayers((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Player).id ? (payload.new as Player) : p
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setPlayers((prev) => prev.filter((p) => p.id !== (payload.old as Player).id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `game_id=eq.${game.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Vote>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // Only add if it's for current round
            if ((payload.new as Vote).election_round === game.election_round) {
              setVotes((prev) => {
                const exists = prev.some((v) => v.id === (payload.new as Vote).id);
                if (exists) return prev;
                return [...prev, payload.new as Vote];
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setVotes((prev) =>
              prev.map((v) =>
                v.id === (payload.new as Vote).id ? (payload.new as Vote) : v
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, game?.election_round, roomCode, supabase]);

  // Computed values
  const currentPresident = players.find((p) => p.seat_index === game?.president_index) || null;
  const currentChancellor = players.find((p) => p.id === game?.chancellor_id) || null;
  const alivePlayers = players.filter((p) => p.is_alive && !p.is_spectator);

  return {
    game,
    players,
    votes,
    loading,
    error,
    currentPresident,
    currentChancellor,
    alivePlayers,
    refetch: fetchInitialData,
  };
}
