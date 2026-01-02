'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Game, Player, Vote } from '@/types/game';
import { castVote } from '@/lib/supabase/actions/game-actions';

interface VotingViewProps {
  game: Game;
  players: Player[];
  votes: Vote[];
  currentPlayer: Player;
  currentPresident: Player | null;
  currentChancellor: Player | null;
  isAlive: boolean;
}

export function VotingView({
  game,
  players,
  votes,
  currentPlayer,
  currentPresident,
  currentChancellor,
  isAlive,
}: VotingViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const alivePlayers = players.filter((p) => p.is_alive && !p.is_spectator);
  const votedPlayers = votes.filter((v) => v.vote !== null);
  const hasVoted = votes.some(
    (v) => v.player_id === currentPlayer.id && v.vote !== null
  );

  const handleVote = async (vote: boolean) => {
    setLoading(true);
    setError('');

    try {
      await castVote(game.id, currentPlayer.id, vote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card className="text-center">
        <h2 className="text-2xl font-heading mb-6">Vote on the Government</h2>

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-sh-gold/20 flex items-center justify-center mb-2 mx-auto">
              <span className="text-3xl">🎖️</span>
            </div>
            <div className="font-medium text-sh-gold">President</div>
            <div className="text-sh-text-primary">{currentPresident?.name}</div>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-sh-gold/20 flex items-center justify-center mb-2 mx-auto">
              <span className="text-3xl">📜</span>
            </div>
            <div className="font-medium text-sh-gold">Chancellor</div>
            <div className="text-sh-text-primary">{currentChancellor?.name}</div>
          </div>
        </div>

        {/* Voting progress */}
        <div className="mb-6">
          <div className="text-sm text-sh-text-secondary mb-2">
            {votedPlayers.length} of {alivePlayers.length} players have voted
          </div>
          <div className="w-full bg-sh-bg-card rounded-full h-2">
            <div
              className="bg-sh-gold rounded-full h-2 transition-all"
              style={{
                width: `${(votedPlayers.length / alivePlayers.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Vote buttons or status */}
        {!isAlive || currentPlayer.is_spectator ? (
          <p className="text-sh-text-secondary">
            {currentPlayer.is_spectator
              ? 'Spectators cannot vote'
              : 'Dead players cannot vote'}
          </p>
        ) : hasVoted ? (
          <div className="text-sh-gold">
            <span className="text-2xl">✓</span>
            <p className="mt-2">You have voted. Waiting for others...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sh-text-secondary mb-4">
              Do you approve this government?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleVote(true)}
                loading={loading}
                size="lg"
                className="bg-sh-success hover:bg-sh-success/80"
              >
                JA!
              </Button>
              <Button
                onClick={() => handleVote(false)}
                loading={loading}
                size="lg"
                variant="danger"
              >
                NEIN
              </Button>
            </div>
            {error && (
              <p className="text-sh-danger text-sm mt-4">{error}</p>
            )}
          </div>
        )}
      </Card>

      {/* Who has voted (but not how) */}
      <Card>
        <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
          Voting Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {alivePlayers.map((player) => {
            const voted = votes.some(
              (v) => v.player_id === player.id && v.vote !== null
            );
            return (
              <span
                key={player.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  voted
                    ? 'bg-sh-gold/20 text-sh-gold'
                    : 'bg-sh-bg-card text-sh-text-secondary'
                }`}
              >
                {player.name}
                {voted && ' ✓'}
              </span>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
