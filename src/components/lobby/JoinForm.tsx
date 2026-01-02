'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getSession, createSession, updateSession } from '@/lib/utils/session';
import { joinGame } from '@/lib/supabase/actions/game-actions';
import type { GamePhase } from '@/types/game';

interface JoinFormProps {
  roomCode: string;
  gamePhase: GamePhase;
  existingName?: string;
}

export function JoinForm({ roomCode, gamePhase, existingName }: JoinFormProps) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState(existingName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gameStarted = gamePhase !== 'lobby';

  const handleJoin = async (asSpectator: boolean = false) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let session = getSession();
      if (!session) {
        session = createSession(playerName.trim());
      } else {
        session = updateSession({ playerName: playerName.trim() });
      }

      const { game } = await joinGame(
        roomCode,
        playerName.trim(),
        session.sessionId,
        asSpectator
      );

      updateSession({ currentGameId: game.id, currentRoomCode: game.room_code });

      // Refresh the page to reload with player data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-heading">Join Game</h2>

        <div className="font-mono text-3xl text-sh-gold tracking-widest">
          {roomCode}
        </div>

        <Input
          label="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
        />

        {gameStarted ? (
          <div className="space-y-3">
            <p className="text-sh-text-secondary text-sm">
              This game has already started. You can join as a spectator.
            </p>
            <Button
              onClick={() => handleJoin(true)}
              loading={loading}
              disabled={!playerName.trim()}
              className="w-full"
            >
              Join as Spectator
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={() => handleJoin(false)}
              loading={loading}
              disabled={!playerName.trim()}
              className="w-full"
            >
              Join Game
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleJoin(true)}
              loading={loading}
              disabled={!playerName.trim()}
              className="w-full"
            >
              Join as Spectator
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sh-danger text-sm">{error}</p>
        )}

        <button
          onClick={() => router.push('/')}
          className="text-sh-text-secondary hover:text-sh-text-primary text-sm"
        >
          ← Back to Home
        </button>
      </div>
    </Card>
  );
}
