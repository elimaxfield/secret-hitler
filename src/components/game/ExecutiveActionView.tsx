'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Game, Player, PolicyType, PartyType } from '@/types/game';
import {
  investigatePlayer,
  callSpecialElection,
  peekPolicies,
  executePlayerAction,
} from '@/lib/supabase/actions/game-actions';

interface ExecutiveActionViewProps {
  game: Game;
  players: Player[];
  player: Player;
  isPresident: boolean;
  currentPresident: Player | null;
}

export function ExecutiveActionView({
  game,
  players,
  player,
  isPresident,
  currentPresident,
}: ExecutiveActionViewProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // For investigation results
  const [investigationResult, setInvestigationResult] = useState<PartyType | null>(null);
  const [investigatedPlayer, setInvestigatedPlayer] = useState<Player | null>(null);

  // For policy peek
  const [peekedPolicies, setPeekedPolicies] = useState<PolicyType[]>([]);

  const alivePlayers = players.filter(
    (p) =>
      p.is_alive &&
      !p.is_spectator &&
      p.id !== currentPresident?.id
  );

  const validTargets = alivePlayers.filter((p) => {
    if (game.pending_executive_action === 'investigate_loyalty') {
      return !game.investigated_players.includes(p.id);
    }
    return true;
  });

  const handleInvestigate = async () => {
    if (!selectedTarget) return;

    setLoading(true);
    setError('');

    try {
      const { party } = await investigatePlayer(game.id, player.id, selectedTarget);
      setInvestigationResult(party);
      setInvestigatedPlayer(players.find((p) => p.id === selectedTarget) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to investigate');
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialElection = async () => {
    if (!selectedTarget) return;

    setLoading(true);
    setError('');

    try {
      await callSpecialElection(game.id, player.id, selectedTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to call special election');
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyPeek = async () => {
    setLoading(true);
    setError('');

    try {
      const { policies } = await peekPolicies(game.id, player.id);
      setPeekedPolicies(policies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to peek policies');
    } finally {
      setLoading(false);
    }
  };

  const handleExecution = async () => {
    if (!selectedTarget) return;

    setLoading(true);
    setError('');

    try {
      await executePlayerAction(game.id, player.id, selectedTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute');
    } finally {
      setLoading(false);
    }
  };

  const getActionTitle = () => {
    switch (game.pending_executive_action) {
      case 'investigate_loyalty':
        return 'Investigate Loyalty';
      case 'special_election':
        return 'Special Election';
      case 'policy_peek':
        return 'Policy Peek';
      case 'execution':
        return 'Execution';
      default:
        return 'Executive Action';
    }
  };

  const getActionDescription = () => {
    switch (game.pending_executive_action) {
      case 'investigate_loyalty':
        return 'Choose a player to investigate. You will learn their party membership (Liberal or Fascist).';
      case 'special_election':
        return 'Choose the next Presidential Candidate. The normal rotation will resume after their term.';
      case 'policy_peek':
        return 'You may peek at the top 3 policies in the deck.';
      case 'execution':
        return 'You must execute a player. If you kill Hitler, Liberals win!';
      default:
        return '';
    }
  };

  if (player.is_spectator || !game.pending_executive_action) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">Executive Action</h2>
        <p className="text-sh-text-secondary">
          {currentPresident?.name} is using their presidential power...
        </p>
      </Card>
    );
  }

  // Show investigation result
  if (investigationResult && investigatedPlayer) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">Investigation Complete</h2>
        <div className="mb-6">
          <p className="text-sh-text-secondary mb-4">
            {investigatedPlayer.name} is a member of the...
          </p>
          <div
            className={`
              inline-block px-6 py-3 rounded-lg text-2xl font-heading uppercase
              ${investigationResult === 'liberal'
                ? 'bg-sh-liberal text-sh-text-primary'
                : 'bg-sh-fascist text-sh-text-primary'
              }
            `}
          >
            {investigationResult === 'liberal' ? '🕊️ Liberal' : '☠️ Fascist'} Party
          </div>
        </div>
        <p className="text-sm text-sh-text-secondary">
          You may share this information with others (or lie about it!).
          The game will continue momentarily...
        </p>
      </Card>
    );
  }

  // Show peeked policies
  if (peekedPolicies.length > 0) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">Policy Peek</h2>
        <p className="text-sh-text-secondary mb-6">
          The next 3 policies in the deck are:
        </p>
        <div className="flex justify-center gap-4 mb-6">
          {peekedPolicies.map((policy, index) => (
            <div
              key={index}
              className={`
                w-16 h-24 rounded-lg flex items-center justify-center text-2xl
                ${policy === 'liberal'
                  ? 'bg-sh-liberal border-2 border-sh-liberal-light'
                  : 'bg-sh-fascist border-2 border-sh-fascist-light'
                }
              `}
            >
              {policy === 'liberal' ? '🕊️' : '☠️'}
            </div>
          ))}
        </div>
        <p className="text-sm text-sh-text-secondary">
          This is secret information. The game will continue momentarily...
        </p>
      </Card>
    );
  }

  if (!isPresident) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">{getActionTitle()}</h2>
        <p className="text-sh-text-secondary">
          {currentPresident?.name} is using their presidential power...
        </p>
      </Card>
    );
  }

  // Policy Peek - just a button
  if (game.pending_executive_action === 'policy_peek') {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-heading mb-4">{getActionTitle()}</h2>
        <p className="text-sh-text-secondary mb-6">{getActionDescription()}</p>
        <Button
          onClick={handlePolicyPeek}
          loading={loading}
          size="lg"
          className="w-full"
        >
          Peek at Policies
        </Button>
        {error && <p className="text-sh-danger text-sm mt-4">{error}</p>}
      </Card>
    );
  }

  // Target selection (for investigate, special election, execution)
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <h2 className="text-2xl font-heading text-center mb-2">
          {getActionTitle()}
        </h2>
        <p className="text-sh-text-secondary text-center mb-6">
          {getActionDescription()}
        </p>

        <div className="space-y-2 mb-6">
          {validTargets.map((target) => (
            <button
              key={target.id}
              onClick={() => setSelectedTarget(target.id)}
              className={`
                w-full p-4 rounded-lg text-left transition-all
                ${
                  selectedTarget === target.id
                    ? game.pending_executive_action === 'execution'
                      ? 'bg-sh-danger/20 border-2 border-sh-danger'
                      : 'bg-sh-gold/20 border-2 border-sh-gold'
                    : 'bg-sh-bg-card border-2 border-transparent hover:border-sh-gold/50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{target.name}</span>
                {selectedTarget === target.id && (
                  <span className={
                    game.pending_executive_action === 'execution'
                      ? 'text-sh-danger'
                      : 'text-sh-gold'
                  }>
                    ✓
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <Button
          onClick={
            game.pending_executive_action === 'investigate_loyalty'
              ? handleInvestigate
              : game.pending_executive_action === 'special_election'
              ? handleSpecialElection
              : handleExecution
          }
          loading={loading}
          disabled={!selectedTarget}
          variant={game.pending_executive_action === 'execution' ? 'danger' : 'primary'}
          className="w-full"
          size="lg"
        >
          {game.pending_executive_action === 'investigate_loyalty' && 'Investigate'}
          {game.pending_executive_action === 'special_election' && 'Select as Next President'}
          {game.pending_executive_action === 'execution' && (
            selectedTarget
              ? `Execute ${players.find((p) => p.id === selectedTarget)?.name}`
              : 'Select a player'
          )}
        </Button>

        {error && <p className="text-sh-danger text-sm text-center mt-4">{error}</p>}
      </Card>
    </div>
  );
}
