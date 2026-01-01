'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getSession, createSession, updateSession } from '@/lib/utils/session';
import { createGame, joinGame, reconnectPlayer } from '@/lib/supabase/actions/game-actions';

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingGame, setExistingGame] = useState<{ roomCode: string } | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      setPlayerName(session.playerName);
      if (session.currentRoomCode) {
        setExistingGame({ roomCode: session.currentRoomCode });
      }
    }
  }, []);

  const handleCreateGame = async () => {
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

      const { game } = await createGame(playerName.trim(), session.sessionId);
      updateSession({ currentGameId: game.id, currentRoomCode: game.room_code });
      router.push(`/game/${game.room_code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
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

      const normalizedCode = roomCode.trim().toUpperCase();
      const { game } = await joinGame(normalizedCode, playerName.trim(), session.sessionId);
      updateSession({ currentGameId: game.id, currentRoomCode: game.room_code });
      router.push(`/game/${game.room_code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const handleRejoin = async () => {
    if (!existingGame) return;

    setLoading(true);
    setError('');

    try {
      const session = getSession();
      if (!session) {
        setExistingGame(null);
        return;
      }

      const result = await reconnectPlayer(session.sessionId);
      if (result) {
        router.push(`/game/${existingGame.roomCode}`);
      } else {
        setExistingGame(null);
        updateSession({ currentGameId: undefined, currentRoomCode: undefined });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rejoin game');
      setExistingGame(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-heading gold-text">
            Secret Hitler
          </h1>
          <p className="text-sh-text-secondary text-sm">
            A social deduction game for 5-10 players
          </p>
        </div>

        {/* Rejoin existing game */}
        {existingGame && (
          <Card className="bg-sh-bg-secondary border border-sh-gold/30">
            <div className="text-center space-y-4">
              <p className="text-sh-text-primary">
                You have an active game
              </p>
              <p className="text-sh-gold font-mono text-2xl">
                {existingGame.roomCode}
              </p>
              <Button onClick={handleRejoin} loading={loading} className="w-full">
                Rejoin Game
              </Button>
            </div>
          </Card>
        )}

        {/* Mode selection */}
        {mode === 'select' && (
          <div className="space-y-4">
            <Input
              label="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
            />
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setMode('create')}
                disabled={!playerName.trim()}
              >
                Create Game
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMode('join')}
                disabled={!playerName.trim()}
              >
                Join Game
              </Button>
            </div>
          </div>
        )}

        {/* Create game */}
        {mode === 'create' && (
          <Card>
            <div className="space-y-4">
              <h2 className="text-xl font-heading text-center">Create New Game</h2>
              <p className="text-sh-text-secondary text-center text-sm">
                You&apos;ll get a room code to share with friends
              </p>
              <Button
                onClick={handleCreateGame}
                loading={loading}
                className="w-full"
              >
                Create Game
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMode('select')}
                className="w-full"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </Card>
        )}

        {/* Join game */}
        {mode === 'join' && (
          <Card>
            <div className="space-y-4">
              <h2 className="text-xl font-heading text-center">Join Game</h2>
              <Input
                label="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center font-mono text-2xl tracking-widest"
              />
              <Button
                onClick={handleJoinGame}
                loading={loading}
                disabled={roomCode.length !== 6}
                className="w-full"
              >
                Join Game
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMode('select')}
                className="w-full"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </Card>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-sh-danger/20 border border-sh-danger text-sh-text-primary p-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sh-text-secondary text-xs">
          Based on the board game by Mike Boxleiter, Tommy Maranges, and Mac Schubert.
          <br />
          Licensed under CC BY-NC-SA 4.0
        </p>
      </div>
    </main>
  );
}
