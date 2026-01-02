'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Game, Player, Vote } from '@/types/game';
import { resolveElection } from '@/lib/supabase/actions/game-actions';
import { calculateVoteResult } from '@/lib/game-engine/elections';

interface VotingResultViewProps {
  game: Game;
  players: Player[];
  votes: Vote[];
  currentPresident: Player | null;
  currentChancellor: Player | null;
}

export function VotingResultView({
  game,
  players,
  votes,
  currentPresident,
  currentChancellor,
}: VotingResultViewProps) {
  const [resolved, setResolved] = useState(false);

  const result = calculateVoteResult(votes);

  useEffect(() => {
    // Auto-resolve after showing results for 3 seconds
    if (!resolved) {
      const timer = setTimeout(async () => {
        try {
          await resolveElection(game.id);
          setResolved(true);
        } catch (err) {
          console.error('Failed to resolve election:', err);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [game.id, resolved]);

  const getPlayerName = (playerId: string): string => {
    const player = players.find((p) => p.id === playerId);
    return player?.name || 'Unknown';
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card className="text-center">
        <h2
          className={`text-3xl font-heading mb-6 ${
            result.passed ? 'text-sh-success' : 'text-sh-danger'
          }`}
        >
          {result.passed ? 'Election Passed!' : 'Election Failed!'}
        </h2>

        {/* Vote tally */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-4xl font-heading text-sh-success mb-1">
              {result.yesCount}
            </div>
            <div className="text-sh-text-secondary">JA!</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-heading text-sh-danger mb-1">
              {result.noCount}
            </div>
            <div className="text-sh-text-secondary">NEIN</div>
          </div>
        </div>

        {/* Proposed government */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="font-medium text-sh-gold">President</div>
            <div className="text-sh-text-primary">{currentPresident?.name}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-sh-gold">Chancellor</div>
            <div className="text-sh-text-primary">{currentChancellor?.name}</div>
          </div>
        </div>

        {result.passed ? (
          <p className="text-sh-text-secondary">
            The government has been elected! Proceeding to Legislative Session...
          </p>
        ) : (
          <p className="text-sh-text-secondary">
            The government was rejected. Election tracker advances.
          </p>
        )}
      </Card>

      {/* Individual votes */}
      <Card>
        <h3 className="font-heading text-sm uppercase tracking-wide mb-3">
          All Votes
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {votes.map((vote) => (
            <div
              key={vote.id}
              className="flex items-center justify-between p-2 bg-sh-bg-primary rounded"
            >
              <span className="text-sm">{getPlayerName(vote.player_id)}</span>
              <Badge
                variant={vote.vote ? 'success' : 'danger'}
                size="sm"
              >
                {vote.vote ? 'JA!' : 'NEIN'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
