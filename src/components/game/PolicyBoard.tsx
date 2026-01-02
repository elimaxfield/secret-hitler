'use client';

import { getBoardSize, FASCIST_BOARD_POWERS } from '@/lib/game-engine/constants';
import type { ExecutiveActionType } from '@/types/game';

interface PolicyBoardProps {
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  vetoUnlocked: boolean;
  playerCount: number;
}

const POWER_ICONS: Record<ExecutiveActionType, string> = {
  investigate_loyalty: '🔍',
  special_election: '🗳️',
  policy_peek: '👁️',
  execution: '💀',
};

const POWER_LABELS: Record<ExecutiveActionType, string> = {
  investigate_loyalty: 'Investigate',
  special_election: 'Special Election',
  policy_peek: 'Policy Peek',
  execution: 'Execution',
};

export function PolicyBoard({
  liberalPolicies,
  fascistPolicies,
  electionTracker,
  vetoUnlocked,
  playerCount,
}: PolicyBoardProps) {
  const boardSize = getBoardSize(playerCount);
  const powers = FASCIST_BOARD_POWERS[boardSize];

  return (
    <div className="space-y-4">
      {/* Liberal Board */}
      <div className="bg-sh-liberal/20 border border-sh-liberal rounded-lg p-4">
        <h3 className="font-heading text-sm uppercase tracking-wide text-sh-liberal-light mb-3">
          Liberal Policies
        </h3>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`
                flex-1 aspect-[3/4] rounded-lg border-2 flex items-center justify-center
                ${
                  index < liberalPolicies
                    ? 'bg-sh-liberal border-sh-liberal-light'
                    : 'bg-sh-bg-card/50 border-sh-liberal/30'
                }
              `}
            >
              {index < liberalPolicies && (
                <span className="text-2xl">🕊️</span>
              )}
              {index === 4 && index >= liberalPolicies && (
                <span className="text-xs text-sh-liberal-light uppercase">Win</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fascist Board */}
      <div className="bg-sh-fascist/20 border border-sh-fascist rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-sm uppercase tracking-wide text-sh-fascist-light">
            Fascist Policies
          </h3>
          {vetoUnlocked && (
            <span className="text-xs bg-sh-fascist px-2 py-1 rounded">
              Veto Power Unlocked
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const power = powers[index];
            const isEnacted = index < fascistPolicies;

            return (
              <div key={index} className="flex-1 flex flex-col gap-1">
                <div
                  className={`
                    aspect-[3/4] rounded-lg border-2 flex items-center justify-center
                    ${
                      isEnacted
                        ? 'bg-sh-fascist border-sh-fascist-light'
                        : 'bg-sh-bg-card/50 border-sh-fascist/30'
                    }
                  `}
                >
                  {isEnacted && (
                    <span className="text-2xl">☠️</span>
                  )}
                  {!isEnacted && power && (
                    <span className="text-lg" title={POWER_LABELS[power]}>
                      {POWER_ICONS[power]}
                    </span>
                  )}
                  {index === 5 && !isEnacted && (
                    <span className="text-xs text-sh-fascist-light uppercase">Win</span>
                  )}
                </div>
                {power && (
                  <span className="text-[10px] text-center text-sh-text-secondary truncate">
                    {POWER_LABELS[power]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Election Tracker */}
      <div className="bg-sh-bg-card rounded-lg p-4">
        <h3 className="font-heading text-sm uppercase tracking-wide text-sh-text-secondary mb-3">
          Election Tracker
        </h3>
        <div className="flex gap-2 items-center">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`
                w-10 h-10 rounded-full border-2 flex items-center justify-center
                ${
                  index < electionTracker
                    ? 'bg-sh-warning border-sh-warning'
                    : 'bg-sh-bg-primary border-sh-text-secondary/30'
                }
              `}
            >
              {index < electionTracker && (
                <span className="text-sh-bg-primary font-bold">✓</span>
              )}
            </div>
          ))}
          <span className="ml-2 text-sm text-sh-text-secondary">
            {electionTracker === 0
              ? 'No failed elections'
              : electionTracker === 1
              ? '1 failed election'
              : electionTracker === 2
              ? '2 failed elections - Chaos imminent!'
              : 'Chaos!'}
          </span>
        </div>
      </div>
    </div>
  );
}
