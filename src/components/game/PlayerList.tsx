'use client';

import type { Game, Player, Vote } from '@/types/game';
import { Badge } from '@/components/ui/Badge';

interface PlayerListProps {
  players: Player[];
  game: Game;
  currentPlayerId: string;
  currentPresident: Player | null;
  currentChancellor: Player | null;
  votes: Vote[];
}

export function PlayerList({
  players,
  game,
  currentPlayerId,
  currentPresident,
  currentChancellor,
  votes,
}: PlayerListProps) {
  const gamePlayers = players
    .filter((p) => !p.is_spectator)
    .sort((a, b) => (a.seat_index ?? 0) - (b.seat_index ?? 0));

  const spectators = players.filter((p) => p.is_spectator);

  const getVote = (playerId: string): boolean | null => {
    const vote = votes.find((v) => v.player_id === playerId);
    return vote?.vote ?? null;
  };

  const isTermLimited = (player: Player): boolean => {
    return (
      player.id === game.previous_president_id ||
      player.id === game.previous_chancellor_id
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg uppercase tracking-wide text-sh-text-secondary">
        Players ({gamePlayers.length})
      </h2>

      <div className="space-y-2">
        {gamePlayers.map((player) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isPresident = player.id === currentPresident?.id;
          const isChancellor = player.id === currentChancellor?.id;
          const vote = getVote(player.id);

          return (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${isCurrentPlayer ? 'bg-sh-gold/10 border border-sh-gold/30' : 'bg-sh-bg-card'}
                ${!player.is_alive ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Seat number */}
                <span className="w-6 h-6 flex items-center justify-center bg-sh-bg-primary rounded-full text-xs text-sh-text-secondary">
                  {(player.seat_index ?? 0) + 1}
                </span>

                {/* Name */}
                <span
                  className={`font-medium ${
                    !player.is_alive ? 'line-through text-sh-text-secondary' : ''
                  }`}
                >
                  {player.name}
                  {isCurrentPlayer && (
                    <span className="text-sh-gold ml-1">(You)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Connection status */}
                {!player.is_connected && player.is_alive && (
                  <span className="w-2 h-2 bg-sh-warning rounded-full" title="Disconnected" />
                )}

                {/* Term limited indicator */}
                {isTermLimited(player) && game.phase === 'nomination' && (
                  <Badge variant="default" size="sm">TL</Badge>
                )}

                {/* Vote indicator */}
                {vote !== null && (
                  <Badge variant={vote ? 'success' : 'danger'} size="sm">
                    {vote ? 'Ja!' : 'Nein'}
                  </Badge>
                )}

                {/* Role badges */}
                {isPresident && (
                  <Badge variant="gold" size="sm">P</Badge>
                )}
                {isChancellor && (
                  <Badge variant="gold" size="sm">C</Badge>
                )}

                {/* Dead indicator */}
                {!player.is_alive && (
                  <Badge variant="danger" size="sm">Dead</Badge>
                )}

                {/* Host indicator */}
                {player.seat_index === 0 && game.phase === 'lobby' && (
                  <span title="Host" className="text-sh-gold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spectators */}
      {spectators.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading text-sm uppercase tracking-wide text-sh-text-secondary mb-2">
            Spectators ({spectators.length})
          </h3>
          <div className="space-y-1">
            {spectators.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 px-3 py-2 text-sm text-sh-text-secondary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {player.name}
                {player.id === currentPlayerId && (
                  <span className="text-sh-gold">(You)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
