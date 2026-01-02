'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import { usePlayer } from '@/hooks/usePlayer';
import { useSession } from '@/hooks/useSession';
import { Spinner } from '@/components/ui/Spinner';
import { GameHeader } from '@/components/game/GameHeader';
import { PlayerList } from '@/components/game/PlayerList';
import { PolicyBoard } from '@/components/game/PolicyBoard';
import { LobbyView } from '@/components/lobby/LobbyView';
import { NightPhaseView } from '@/components/game/NightPhaseView';
import { NominationView } from '@/components/game/NominationView';
import { VotingView } from '@/components/game/VotingView';
import { VotingResultView } from '@/components/game/VotingResultView';
import { LegislativeView } from '@/components/game/LegislativeView';
import { ExecutiveActionView } from '@/components/game/ExecutiveActionView';
import { GameOverView } from '@/components/game/GameOverView';
import { JoinForm } from '@/components/lobby/JoinForm';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const { session, loading: sessionLoading, updatePlayerSession } = useSession();
  const { game, players, votes, loading: gameLoading, error, currentPresident, currentChancellor, alivePlayers } = useGame(roomCode);
  const { player, isPresident, isChancellor, isAlive, isSpectator, isHost, role, knownFascists, knownHitler } = usePlayer(game, players, session?.sessionId ?? null);

  const [needsJoin, setNeedsJoin] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !gameLoading && game && !player) {
      // User has a session but isn't in this game - need to join
      if (session && game.phase === 'lobby') {
        setNeedsJoin(true);
      } else if (session && game.phase !== 'lobby') {
        // Game already started, can only join as spectator
        setNeedsJoin(true);
      } else if (!session) {
        // No session at all
        setNeedsJoin(true);
      }
    } else {
      setNeedsJoin(false);
    }
  }, [session, sessionLoading, game, player, gameLoading]);

  // Update session with current game
  useEffect(() => {
    if (game && player && session) {
      if (session.currentGameId !== game.id) {
        updatePlayerSession({
          currentGameId: game.id,
          currentRoomCode: game.room_code,
        });
      }
    }
  }, [game, player, session, updatePlayerSession]);

  if (sessionLoading || gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-heading text-sh-danger mb-4">Error</h1>
        <p className="text-sh-text-secondary mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="text-sh-gold hover:underline"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-heading mb-4">Game Not Found</h1>
        <p className="text-sh-text-secondary mb-4">
          The room code &quot;{roomCode}&quot; doesn&apos;t exist.
        </p>
        <button
          onClick={() => router.push('/')}
          className="text-sh-gold hover:underline"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (needsJoin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <JoinForm
          roomCode={roomCode}
          gamePhase={game.phase}
          existingName={session?.playerName}
        />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const renderPhaseContent = () => {
    switch (game.phase) {
      case 'lobby':
        return (
          <LobbyView
            game={game}
            players={players}
            isHost={isHost}
          />
        );

      case 'night':
        return (
          <NightPhaseView
            game={game}
            player={player}
            players={players}
            role={role}
            knownFascists={knownFascists}
            knownHitler={knownHitler}
            isHost={isHost}
          />
        );

      case 'nomination':
        return (
          <NominationView
            game={game}
            players={players}
            currentPlayer={player}
            isPresident={isPresident}
            currentPresident={currentPresident}
          />
        );

      case 'voting':
        return (
          <VotingView
            game={game}
            players={players}
            votes={votes}
            currentPlayer={player}
            currentPresident={currentPresident}
            currentChancellor={currentChancellor}
            isAlive={isAlive}
          />
        );

      case 'voting_result':
        return (
          <VotingResultView
            game={game}
            players={players}
            votes={votes}
            currentPresident={currentPresident}
            currentChancellor={currentChancellor}
          />
        );

      case 'legislative_president':
      case 'legislative_chancellor':
      case 'veto_requested':
        return (
          <LegislativeView
            game={game}
            player={player}
            isPresident={isPresident}
            isChancellor={isChancellor}
            currentPresident={currentPresident}
            currentChancellor={currentChancellor}
          />
        );

      case 'executive_action':
        return (
          <ExecutiveActionView
            game={game}
            players={players}
            player={player}
            isPresident={isPresident}
            currentPresident={currentPresident}
          />
        );

      case 'game_over':
        return (
          <GameOverView
            game={game}
            players={players}
          />
        );

      default:
        return <div>Unknown phase: {game.phase}</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <GameHeader
        roomCode={game.room_code}
        phase={game.phase}
        isSpectator={isSpectator}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main content area */}
        <main className="flex-1 p-4">
          {/* Policy boards - visible after game starts */}
          {game.phase !== 'lobby' && (
            <div className="mb-6">
              <PolicyBoard
                liberalPolicies={game.liberal_policies}
                fascistPolicies={game.fascist_policies}
                electionTracker={game.election_tracker}
                vetoUnlocked={game.veto_unlocked}
                playerCount={players.filter((p) => !p.is_spectator).length}
              />
            </div>
          )}

          {/* Phase-specific content */}
          <div className="mb-6">
            {renderPhaseContent()}
          </div>
        </main>

        {/* Player list sidebar */}
        <aside className="lg:w-80 p-4 bg-sh-bg-secondary">
          <PlayerList
            players={players}
            game={game}
            currentPlayerId={player.id}
            currentPresident={currentPresident}
            currentChancellor={currentChancellor}
            votes={game.phase === 'voting_result' ? votes : []}
          />
        </aside>
      </div>
    </div>
  );
}
