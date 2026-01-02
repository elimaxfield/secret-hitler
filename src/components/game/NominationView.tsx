'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Game, Player } from '@/types/game';
import { nominateChancellor } from '@/lib/supabase/actions/game-actions';
import { isEligibleForChancellor } from '@/lib/game-engine/elections';

interface NominationViewProps {
  game: Game;
  players: Player[];
  currentPlayer: Player;
  isPresident: boolean;
  currentPresident: Player | null;
}

export function NominationView({
  game,
  players,
  currentPlayer,
  isPresident,
  currentPresident,
}: NominationViewProps) {
  const [selectedNominee, setSelectedNominee] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const alivePlayers = players.filter(
    (p) => p.is_alive && !p.is_spectator && p.id !== currentPresident?.id
  );

  const handleNominate = async () => {
    if (!selectedNominee || !currentPresident) return;

    setLoading(true);
    setError('');

    try {
      await nominateChancellor(game.id, currentPresident.id, selectedNominee);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to nominate');
    } finally {
      setLoading(false);
    }
  };

  if (currentPlayer.is_spectator) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">Nomination</h2>
        <p className="text-sh-text-secondary">
          <span className="text-sh-gold">{currentPresident?.name}</span> is choosing
          a Chancellor candidate...
        </p>
      </Card>
    );
  }

  if (!isPresident) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">Nomination</h2>
        <p className="text-sh-text-secondary mb-4">
          <span className="text-sh-gold">{currentPresident?.name}</span> is the
          Presidential Candidate and must nominate a Chancellor.
        </p>
        <p className="text-sm text-sh-text-secondary">
          Discuss who should be nominated!
        </p>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <h2 className="text-2xl font-heading text-center mb-2">
          You Are The Presidential Candidate
        </h2>
        <p className="text-sh-text-secondary text-center mb-6">
          Choose someone to nominate as Chancellor
        </p>

        <div className="space-y-2 mb-6">
          {alivePlayers.map((player) => {
            const eligible = isEligibleForChancellor(game, players, player.id);
            const isSelected = selectedNominee === player.id;
            const isTermLimited =
              player.id === game.previous_president_id ||
              player.id === game.previous_chancellor_id;

            return (
              <button
                key={player.id}
                onClick={() => eligible && setSelectedNominee(player.id)}
                disabled={!eligible}
                className={`
                  w-full p-4 rounded-lg text-left transition-all
                  ${
                    isSelected
                      ? 'bg-sh-gold/20 border-2 border-sh-gold'
                      : eligible
                      ? 'bg-sh-bg-card border-2 border-transparent hover:border-sh-gold/50'
                      : 'bg-sh-bg-card/50 border-2 border-transparent opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{player.name}</span>
                  <div className="flex items-center gap-2">
                    {isTermLimited && (
                      <span className="text-xs text-sh-warning bg-sh-warning/20 px-2 py-1 rounded">
                        Term Limited
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-sh-gold">✓</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleNominate}
          loading={loading}
          disabled={!selectedNominee}
          className="w-full"
          size="lg"
        >
          Nominate Chancellor
        </Button>

        {error && (
          <p className="text-sh-danger text-sm text-center mt-4">{error}</p>
        )}
      </Card>
    </div>
  );
}
