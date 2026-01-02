'use client';

import { useMemo } from 'react';
import type { Game, Player, PlayerRole } from '@/types/game';
import { getFascistKnowledge } from '@/lib/game-engine/roles';

interface UsePlayerResult {
  player: Player | null;
  isPresident: boolean;
  isChancellor: boolean;
  isAlive: boolean;
  isSpectator: boolean;
  isHost: boolean;
  role: PlayerRole | null;
  knownFascists: Player[];
  knownHitler: Player | null;
}

export function usePlayer(
  game: Game | null,
  players: Player[],
  sessionId: string | null
): UsePlayerResult {
  const player = useMemo(() => {
    if (!sessionId) return null;
    return players.find((p) => p.session_id === sessionId) || null;
  }, [players, sessionId]);

  const isPresident = useMemo(() => {
    if (!game || !player) return false;
    return player.seat_index === game.president_index;
  }, [game, player]);

  const isChancellor = useMemo(() => {
    if (!game || !player) return false;
    return player.id === game.chancellor_id;
  }, [game, player]);

  const knownPlayers = useMemo(() => {
    if (!player || !player.role) return { fascists: [] as Player[], hitler: null as Player | null };

    const alivePlayers = players.filter((p) => !p.is_spectator);
    const visible = getFascistKnowledge(alivePlayers, player, players.length);

    const fascists = visible.filter((p) => p.role === 'fascist');
    const hitler = visible.find((p) => p.role === 'hitler') || null;

    return { fascists, hitler };
  }, [player, players]);

  return {
    player,
    isPresident,
    isChancellor,
    isAlive: player?.is_alive ?? false,
    isSpectator: player?.is_spectator ?? false,
    isHost: player?.seat_index === 0,
    role: player?.role ?? null,
    knownFascists: knownPlayers.fascists,
    knownHitler: knownPlayers.hitler,
  };
}
