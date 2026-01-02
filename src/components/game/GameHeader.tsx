'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { GamePhase } from '@/types/game';
import { clearGameFromSession } from '@/lib/utils/session';

interface GameHeaderProps {
  roomCode: string;
  phase: GamePhase;
  isSpectator: boolean;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  lobby: 'Waiting for Players',
  night: 'Night Phase',
  nomination: 'Nomination',
  voting: 'Voting',
  voting_result: 'Vote Results',
  legislative_president: 'Legislative Session',
  legislative_chancellor: 'Legislative Session',
  veto_requested: 'Veto Requested',
  executive_action: 'Executive Action',
  game_over: 'Game Over',
};

export function GameHeader({ roomCode, phase, isSpectator }: GameHeaderProps) {
  const router = useRouter();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const gameUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/game/${roomCode}`
    : '';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLeave = () => {
    clearGameFromSession();
    router.push('/');
  };

  return (
    <>
      <header className="bg-sh-bg-secondary border-b border-sh-text-secondary/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Room Code */}
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 bg-sh-bg-card px-3 py-2 rounded-lg hover:bg-sh-bg-primary transition-colors"
            >
              <span className="text-sh-text-secondary text-sm">Room:</span>
              <span className="font-mono text-lg font-bold text-sh-gold tracking-wider">
                {roomCode}
              </span>
              <svg
                className="w-4 h-4 text-sh-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {copied ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                )}
              </svg>
            </button>

            {/* QR Code Button */}
            <button
              onClick={() => setShowQR(true)}
              className="p-2 bg-sh-bg-card rounded-lg hover:bg-sh-bg-primary transition-colors"
              aria-label="Show QR Code"
            >
              <svg
                className="w-6 h-6 text-sh-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Phase Badge */}
            <Badge variant={phase === 'game_over' ? 'gold' : 'default'}>
              {PHASE_LABELS[phase]}
            </Badge>

            {/* Spectator Badge */}
            {isSpectator && (
              <Badge variant="default">Spectator</Badge>
            )}

            {/* Leave Button */}
            <button
              onClick={handleLeave}
              className="p-2 text-sh-text-secondary hover:text-sh-danger transition-colors"
              aria-label="Leave Game"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* QR Code Modal */}
      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Share Game">
        <div className="text-center space-y-4">
          <p className="text-sh-text-secondary">
            Scan this QR code to join the game
          </p>
          <div className="bg-white p-4 rounded-lg inline-block">
            <QRCodeSVG
              value={gameUrl}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="font-mono text-2xl text-sh-gold tracking-widest">
            {roomCode}
          </div>
          <Button onClick={handleCopyCode} className="w-full">
            {copied ? 'Copied!' : 'Copy Room Code'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
