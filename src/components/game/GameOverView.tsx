'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Game, Player } from '@/types/game';
import { clearGameFromSession } from '@/lib/utils/session';

interface GameOverViewProps {
  game: Game;
  players: Player[];
}

export function GameOverView({ game, players }: GameOverViewProps) {
  const router = useRouter();

  const isLiberalWin = game.winner === 'liberal';
  const winByPolicies =
    (isLiberalWin && game.liberal_policies >= 5) ||
    (!isLiberalWin && game.fascist_policies >= 6);

  const hitler = players.find((p) => p.role === 'hitler');

  const getWinReason = () => {
    if (isLiberalWin) {
      if (game.liberal_policies >= 5) {
        return 'Five Liberal Policies have been enacted!';
      } else {
        return `Hitler (${hitler?.name}) has been assassinated!`;
      }
    } else {
      if (game.fascist_policies >= 6) {
        return 'Six Fascist Policies have been enacted!';
      } else {
        return `Hitler (${hitler?.name}) has been elected Chancellor!`;
      }
    }
  };

  const handlePlayAgain = () => {
    clearGameFromSession();
    router.push('/');
  };

  const gamePlayers = players
    .filter((p) => !p.is_spectator)
    .sort((a, b) => (a.seat_index ?? 0) - (b.seat_index ?? 0));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card
        className={`text-center ${
          isLiberalWin
            ? 'border-2 border-sh-liberal bg-sh-liberal/10'
            : 'border-2 border-sh-fascist bg-sh-fascist/10'
        }`}
      >
        <div className="text-6xl mb-4">
          {isLiberalWin ? '🕊️' : '☠️'}
        </div>
        <h2
          className={`text-3xl font-heading mb-4 ${
            isLiberalWin ? 'text-sh-liberal-light' : 'text-sh-fascist-light'
          }`}
        >
          {isLiberalWin ? 'Liberals Win!' : 'Fascists Win!'}
        </h2>
        <p className="text-sh-text-secondary text-lg mb-6">
          {getWinReason()}
        </p>

        {/* Final scores */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div
              className={`text-3xl font-heading ${
                game.liberal_policies >= 5 ? 'text-sh-liberal-light' : 'text-sh-text-secondary'
              }`}
            >
              {game.liberal_policies}
            </div>
            <div className="text-sm text-sh-text-secondary">Liberal Policies</div>
          </div>
          <div className="text-center">
            <div
              className={`text-3xl font-heading ${
                game.fascist_policies >= 6 ? 'text-sh-fascist-light' : 'text-sh-text-secondary'
              }`}
            >
              {game.fascist_policies}
            </div>
            <div className="text-sm text-sh-text-secondary">Fascist Policies</div>
          </div>
        </div>
      </Card>

      {/* Player roles reveal */}
      <Card>
        <h3 className="font-heading text-lg uppercase tracking-wide mb-4 text-center">
          Role Reveal
        </h3>
        <div className="space-y-2">
          {gamePlayers.map((player) => (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${player.role === 'liberal' ? 'bg-sh-liberal/10' : 'bg-sh-fascist/10'}
                ${!player.is_alive ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`font-medium ${
                    !player.is_alive ? 'line-through' : ''
                  }`}
                >
                  {player.name}
                </span>
                {!player.is_alive && (
                  <Badge variant="danger" size="sm">Dead</Badge>
                )}
              </div>
              <Badge
                variant={player.role === 'liberal' ? 'liberal' : 'fascist'}
              >
                {player.role === 'hitler' ? 'HITLER' : player.role?.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Play again */}
      <Button
        onClick={handlePlayAgain}
        size="lg"
        className="w-full"
      >
        Play Again
      </Button>
    </div>
  );
}
