'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Game, Player } from '@/types/game';
import { startGame } from '@/lib/supabase/actions/game-actions';

interface LobbyViewProps {
  game: Game;
  players: Player[];
  isHost: boolean;
}

export function LobbyView({ game, players, isHost }: LobbyViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gamePlayers = players.filter((p) => !p.is_spectator);
  const canStart = gamePlayers.length >= 5 && gamePlayers.length <= 10;

  const gameUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/game/${game.room_code}`
    : '';

  const handleStartGame = async () => {
    const host = gamePlayers.find((p) => p.seat_index === 0);
    if (!host) return;

    setLoading(true);
    setError('');

    try {
      await startGame(game.id, host.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card className="text-center">
        <h2 className="text-2xl font-heading mb-4">Waiting for Players</h2>

        <p className="text-sh-text-secondary mb-6">
          Share the room code or QR code with your friends to join!
        </p>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg inline-block mb-4">
          <QRCodeSVG
            value={gameUrl}
            size={160}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Room Code */}
        <div className="font-mono text-4xl text-sh-gold tracking-widest mb-6">
          {game.room_code}
        </div>

        {/* Player count */}
        <div className="mb-6">
          <span className="text-3xl font-heading">{gamePlayers.length}</span>
          <span className="text-sh-text-secondary"> / 10 players</span>
        </div>

        {/* Start button or status */}
        {isHost ? (
          <div className="space-y-4">
            <Button
              onClick={handleStartGame}
              loading={loading}
              disabled={!canStart}
              className="w-full"
              size="lg"
            >
              {canStart ? 'Start Game' : `Need ${5 - gamePlayers.length} more players`}
            </Button>

            {gamePlayers.length > 10 && (
              <p className="text-sh-danger text-sm">
                Too many players! Maximum is 10.
              </p>
            )}

            {error && (
              <p className="text-sh-danger text-sm">{error}</p>
            )}
          </div>
        ) : (
          <p className="text-sh-text-secondary">
            Waiting for host to start the game...
          </p>
        )}
      </Card>

      {/* Role distribution info */}
      <Card>
        <h3 className="font-heading text-lg mb-3">Role Distribution</h3>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-sh-liberal-light text-xl font-bold">
              {getRoleCount(gamePlayers.length).liberals}
            </div>
            <div className="text-sh-text-secondary">Liberals</div>
          </div>
          <div>
            <div className="text-sh-fascist-light text-xl font-bold">
              {getRoleCount(gamePlayers.length).fascists}
            </div>
            <div className="text-sh-text-secondary">Fascists</div>
          </div>
          <div>
            <div className="text-sh-fascist text-xl font-bold">1</div>
            <div className="text-sh-text-secondary">Hitler</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function getRoleCount(playerCount: number): { liberals: number; fascists: number } {
  const distribution: Record<number, { liberals: number; fascists: number }> = {
    5: { liberals: 3, fascists: 1 },
    6: { liberals: 4, fascists: 1 },
    7: { liberals: 4, fascists: 2 },
    8: { liberals: 5, fascists: 2 },
    9: { liberals: 5, fascists: 3 },
    10: { liberals: 6, fascists: 3 },
  };
  return distribution[Math.min(10, Math.max(5, playerCount))] || { liberals: 0, fascists: 0 };
}
