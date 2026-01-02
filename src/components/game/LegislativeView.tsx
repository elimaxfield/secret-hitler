'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Game, Player, PolicyType } from '@/types/game';
import {
  getPresidentPolicies,
  presidentDiscard,
  getChancellorPolicies,
  chancellorEnact,
  requestVeto,
  respondToVeto,
} from '@/lib/supabase/actions/game-actions';

interface LegislativeViewProps {
  game: Game;
  player: Player;
  isPresident: boolean;
  isChancellor: boolean;
  currentPresident: Player | null;
  currentChancellor: Player | null;
}

export function LegislativeView({
  game,
  player,
  isPresident,
  isChancellor,
  currentPresident,
  currentChancellor,
}: LegislativeViewProps) {
  const [policies, setPolicies] = useState<PolicyType[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch policies when component mounts or phase changes
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        if (game.phase === 'legislative_president' && isPresident) {
          const policies = await getPresidentPolicies(game.id, player.id);
          setPolicies(policies);
        } else if (
          (game.phase === 'legislative_chancellor' || game.phase === 'veto_requested') &&
          isChancellor
        ) {
          const policies = await getChancellorPolicies(game.id, player.id);
          setPolicies(policies);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch policies');
      }
    };

    fetchPolicies();
  }, [game.id, game.phase, isPresident, isChancellor, player.id]);

  const handlePresidentDiscard = async () => {
    if (selectedIndex === null) return;

    setLoading(true);
    setError('');

    try {
      await presidentDiscard(game.id, player.id, selectedIndex);
      setSelectedIndex(null);
      setPolicies([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard');
    } finally {
      setLoading(false);
    }
  };

  const handleChancellorEnact = async () => {
    if (selectedIndex === null) return;

    setLoading(true);
    setError('');

    try {
      await chancellorEnact(game.id, player.id, selectedIndex);
      setSelectedIndex(null);
      setPolicies([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enact');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVeto = async () => {
    setLoading(true);
    setError('');

    try {
      await requestVeto(game.id, player.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request veto');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToVeto = async (accept: boolean) => {
    setLoading(true);
    setError('');

    try {
      await respondToVeto(game.id, player.id, accept);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond to veto');
    } finally {
      setLoading(false);
    }
  };

  const renderPolicyCard = (policy: PolicyType, index: number, canSelect: boolean) => {
    const isSelected = selectedIndex === index;
    const isLiberal = policy === 'liberal';

    return (
      <button
        key={index}
        onClick={() => canSelect && setSelectedIndex(index)}
        disabled={!canSelect}
        className={`
          aspect-[3/4] rounded-lg border-4 flex items-center justify-center text-4xl
          transition-all transform
          ${isLiberal
            ? 'bg-sh-liberal border-sh-liberal-light'
            : 'bg-sh-fascist border-sh-fascist-light'
          }
          ${isSelected ? 'ring-4 ring-sh-gold scale-105' : ''}
          ${canSelect ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}
        `}
      >
        {isLiberal ? '🕊️' : '☠️'}
      </button>
    );
  };

  if (player.is_spectator) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">Legislative Session</h2>
        <p className="text-sh-text-secondary">
          The President and Chancellor are secretly selecting policies...
        </p>
      </Card>
    );
  }

  // Veto requested - waiting for president
  if (game.phase === 'veto_requested') {
    if (isPresident) {
      return (
        <div className="max-w-lg mx-auto space-y-6">
          <Card className="text-center">
            <h2 className="text-2xl font-heading mb-4">Veto Requested</h2>
            <p className="text-sh-text-secondary mb-6">
              {currentChancellor?.name} wishes to veto this agenda.
              If you agree, both policies are discarded and the election tracker advances.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleRespondToVeto(true)}
                loading={loading}
                variant="secondary"
              >
                Accept Veto
              </Button>
              <Button
                onClick={() => handleRespondToVeto(false)}
                loading={loading}
              >
                Reject Veto
              </Button>
            </div>
            {error && <p className="text-sh-danger text-sm mt-4">{error}</p>}
          </Card>
        </div>
      );
    } else if (isChancellor) {
      return (
        <Card className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-heading mb-4">Veto Requested</h2>
          <p className="text-sh-text-secondary">
            Waiting for {currentPresident?.name} to respond to your veto request...
          </p>
        </Card>
      );
    }
  }

  // President's turn
  if (game.phase === 'legislative_president') {
    if (isPresident) {
      return (
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <h2 className="text-2xl font-heading text-center mb-4">
              Presidential Duty
            </h2>
            <p className="text-sh-text-secondary text-center mb-6">
              You drew 3 policies. Discard one and pass the rest to the Chancellor.
              <br />
              <span className="text-sh-warning text-sm">
                No communication allowed!
              </span>
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {policies.map((policy, index) =>
                renderPolicyCard(policy, index, true)
              )}
            </div>

            <Button
              onClick={handlePresidentDiscard}
              loading={loading}
              disabled={selectedIndex === null}
              className="w-full"
              size="lg"
            >
              {selectedIndex === null
                ? 'Select a policy to discard'
                : 'Discard Selected Policy'}
            </Button>

            {error && <p className="text-sh-danger text-sm text-center mt-4">{error}</p>}
          </Card>
        </div>
      );
    } else {
      return (
        <Card className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-heading mb-4">Legislative Session</h2>
          <p className="text-sh-text-secondary">
            {currentPresident?.name} is examining policies...
          </p>
        </Card>
      );
    }
  }

  // Chancellor's turn
  if (game.phase === 'legislative_chancellor') {
    if (isChancellor) {
      return (
        <div className="max-w-lg mx-auto space-y-6">
          <Card>
            <h2 className="text-2xl font-heading text-center mb-4">
              Chancellor&apos;s Choice
            </h2>
            <p className="text-sh-text-secondary text-center mb-6">
              The President passed you 2 policies. Choose one to enact.
              <br />
              <span className="text-sh-warning text-sm">
                No communication allowed!
              </span>
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-6">
              {policies.map((policy, index) =>
                renderPolicyCard(policy, index, true)
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleChancellorEnact}
                loading={loading}
                disabled={selectedIndex === null}
                className="w-full"
                size="lg"
              >
                {selectedIndex === null
                  ? 'Select a policy to enact'
                  : 'Enact Selected Policy'}
              </Button>

              {game.veto_unlocked && (
                <Button
                  onClick={handleRequestVeto}
                  loading={loading}
                  variant="secondary"
                  className="w-full"
                >
                  Request Veto
                </Button>
              )}
            </div>

            {error && <p className="text-sh-danger text-sm text-center mt-4">{error}</p>}
          </Card>
        </div>
      );
    } else {
      return (
        <Card className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-heading mb-4">Legislative Session</h2>
          <p className="text-sh-text-secondary">
            {currentChancellor?.name} is choosing a policy to enact...
          </p>
        </Card>
      );
    }
  }

  return null;
}
