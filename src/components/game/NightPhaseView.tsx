'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Game, Player, PlayerRole } from '@/types/game';
import { proceedFromNight } from '@/lib/supabase/actions/game-actions';

interface NightPhaseViewProps {
  game: Game;
  player: Player;
  players: Player[];
  role: PlayerRole | null;
  knownFascists: Player[];
  knownHitler: Player | null;
  isHost: boolean;
}

export function NightPhaseView({
  game,
  player,
  players,
  role,
  knownFascists,
  knownHitler,
  isHost,
}: NightPhaseViewProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  const playerCount = players.filter((p) => !p.is_spectator).length;
  const hitlerKnowsFascists = playerCount <= 6;

  const handleAcknowledge = () => {
    setAcknowledged(true);
  };

  const handleProceed = async () => {
    setLoading(true);
    try {
      await proceedFromNight(game.id);
    } catch (err) {
      console.error('Failed to proceed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (player.is_spectator) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">Night Phase</h2>
        <p className="text-sh-text-secondary">
          Players are viewing their secret roles...
        </p>
      </Card>
    );
  }

  const getRoleCard = () => {
    switch (role) {
      case 'liberal':
        return (
          <div className="bg-sh-liberal/20 border-2 border-sh-liberal rounded-lg p-6 text-center liberal-glow">
            <div className="text-6xl mb-4">🕊️</div>
            <h3 className="text-2xl font-heading text-sh-liberal-light mb-2">
              LIBERAL
            </h3>
            <p className="text-sh-text-secondary">
              You are a member of the Liberal party. Work to enact 5 Liberal policies
              or assassinate Hitler to win!
            </p>
          </div>
        );

      case 'fascist':
        return (
          <div className="bg-sh-fascist/20 border-2 border-sh-fascist rounded-lg p-6 text-center fascist-glow">
            <div className="text-6xl mb-4">☠️</div>
            <h3 className="text-2xl font-heading text-sh-fascist-light mb-2">
              FASCIST
            </h3>
            <p className="text-sh-text-secondary mb-4">
              You are a Fascist! Work in secret to enact 6 Fascist policies
              or get Hitler elected Chancellor after 3 Fascist policies.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-sh-text-secondary">Your team:</p>
              {knownFascists.map((f) => (
                <div key={f.id} className="text-sh-fascist-light">
                  {f.name} - Fascist
                </div>
              ))}
              {knownHitler && (
                <div className="text-sh-danger font-bold">
                  {knownHitler.name} - HITLER
                </div>
              )}
            </div>
          </div>
        );

      case 'hitler':
        return (
          <div className="bg-sh-fascist/30 border-2 border-sh-danger rounded-lg p-6 text-center fascist-glow">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-2xl font-heading text-sh-danger mb-2">
              HITLER
            </h3>
            <p className="text-sh-text-secondary mb-4">
              You are Hitler! Act like a Liberal to gain trust.
              If you&apos;re elected Chancellor after 3 Fascist policies, you win!
            </p>
            {hitlerKnowsFascists ? (
              <div className="space-y-2">
                <p className="text-sm text-sh-text-secondary">Your fellow Fascists:</p>
                {knownFascists.map((f) => (
                  <div key={f.id} className="text-sh-fascist-light">
                    {f.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sh-warning">
                In games with 7+ players, you don&apos;t know who the Fascists are.
                They know who you are!
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!acknowledged) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="text-center">
          <h2 className="text-2xl font-heading mb-4">Your Secret Role</h2>
          <p className="text-sh-text-secondary mb-6">
            Tap to reveal your secret role. Keep it hidden from others!
          </p>
          <Button onClick={handleAcknowledge} size="lg" className="w-full">
            Reveal My Role
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {getRoleCard()}

      <Card className="text-center">
        {isHost ? (
          <div className="space-y-4">
            <p className="text-sh-text-secondary">
              Once everyone has seen their role, start the game!
            </p>
            <Button onClick={handleProceed} loading={loading} size="lg" className="w-full">
              Begin Game
            </Button>
          </div>
        ) : (
          <p className="text-sh-text-secondary">
            Waiting for the host to begin the game...
          </p>
        )}
      </Card>
    </div>
  );
}
