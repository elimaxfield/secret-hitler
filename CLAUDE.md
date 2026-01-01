# Secret Hitler Online - Project Guidelines

## Project Overview

An online multiplayer implementation of the Secret Hitler board game. Players connect via web browser, join games using room codes, and play in real-time with reactive UI updates.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (React, App Router) |
| Backend | Supabase Edge Functions (Node.js/Deno) |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (built-in) |
| Hosting | Netlify |
| Styling | Tailwind CSS |

## Project Structure

```
secret-hitler/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Home - create/join game
│   │   ├── game/
│   │   │   └── [roomCode]/
│   │   │       └── page.tsx    # Game room
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── game/               # Game-specific components
│   │   │   ├── PlayerList.tsx
│   │   │   ├── PolicyBoard.tsx
│   │   │   ├── VotingPanel.tsx
│   │   │   ├── LegislativeSession.tsx
│   │   │   ├── RoleCard.tsx
│   │   │   ├── ElectionTracker.tsx
│   │   │   └── ExecutiveAction.tsx
│   │   └── lobby/              # Lobby components
│   │       ├── JoinForm.tsx
│   │       ├── PlayerLobby.tsx
│   │       └── QRCode.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Supabase browser client
│   │   │   ├── server.ts       # Supabase server client
│   │   │   └── types.ts        # Generated DB types
│   │   ├── game-engine/
│   │   │   ├── constants.ts    # Game constants (policies, roles, boards)
│   │   │   ├── state.ts        # Game state types and transitions
│   │   │   ├── roles.ts        # Role assignment logic
│   │   │   ├── policies.ts     # Policy deck management
│   │   │   ├── elections.ts    # Election logic
│   │   │   ├── legislative.ts  # Legislative session logic
│   │   │   ├── executive.ts    # Presidential powers
│   │   │   └── validation.ts   # Move validation
│   │   └── utils/
│   │       ├── room-codes.ts   # Room code generation
│   │       └── session.ts      # Player session persistence
│   ├── hooks/
│   │   ├── useGame.ts          # Game state subscription
│   │   ├── usePlayer.ts        # Current player context
│   │   └── useSession.ts       # Session persistence
│   └── types/
│       └── game.ts             # TypeScript interfaces
├── supabase/
│   ├── migrations/             # Database migrations
│   ├── functions/              # Edge functions (if needed)
│   └── seed.sql                # Test data
├── public/
│   └── assets/                 # Game art assets
├── rules.txt                   # Original game rules
├── PROMPTS.txt                 # Implementation prompts
├── CLAUDE.md                   # This file
└── package.json
```

## Database Schema

### Tables

```sql
-- Games table: stores all game state
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  phase game_phase NOT NULL DEFAULT 'lobby',

  -- Policy tracking
  liberal_policies INT DEFAULT 0,
  fascist_policies INT DEFAULT 0,
  policy_deck JSONB NOT NULL DEFAULT '[]',
  discard_pile JSONB NOT NULL DEFAULT '[]',

  -- Election state
  election_tracker INT DEFAULT 0,
  president_index INT,
  chancellor_id UUID,
  previous_president_id UUID,
  previous_chancellor_id UUID,

  -- Legislative session state
  drawn_policies JSONB,  -- Policies drawn by president (hidden)
  president_choices JSONB,  -- Policies passed to chancellor (hidden)

  -- Executive action state
  pending_executive_action executive_action_type,
  investigated_players UUID[] DEFAULT '{}',
  special_election_president_index INT,

  -- Veto tracking
  veto_unlocked BOOLEAN DEFAULT FALSE,
  veto_requested BOOLEAN DEFAULT FALSE,

  -- Game metadata
  player_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner team_type
);

-- Players table: players in each game
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  session_id VARCHAR(100) NOT NULL,  -- For reconnection

  -- Role (hidden from other players)
  role player_role,  -- 'liberal', 'fascist', 'hitler'
  party party_type,  -- 'liberal', 'fascist' (for investigation)

  -- Status
  is_alive BOOLEAN DEFAULT TRUE,
  is_spectator BOOLEAN DEFAULT FALSE,
  seat_index INT,  -- Position in the circle (0-9)

  -- Connection state
  is_connected BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, seat_index),
  UNIQUE(game_id, session_id)
);

-- Votes table: track all votes for elections
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  election_round INT NOT NULL,
  vote BOOLEAN,  -- true = Ja!, false = Nein, null = not yet voted
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, player_id, election_round)
);

-- Enums
CREATE TYPE game_phase AS ENUM (
  'lobby',
  'night',
  'nomination',
  'voting',
  'voting_result',
  'legislative_president',
  'legislative_chancellor',
  'veto_requested',
  'executive_action',
  'game_over'
);

CREATE TYPE player_role AS ENUM ('liberal', 'fascist', 'hitler');
CREATE TYPE party_type AS ENUM ('liberal', 'fascist');
CREATE TYPE team_type AS ENUM ('liberal', 'fascist');
CREATE TYPE executive_action_type AS ENUM (
  'investigate_loyalty',
  'special_election',
  'policy_peek',
  'execution'
);
```

## Game Phase Flow

```
lobby
  ↓ (host starts game, 5-10 players)
night
  ↓ (roles revealed, fascists see each other)
nomination
  ↓ (president nominates chancellor)
voting
  ↓ (all players vote)
voting_result
  ↓
  ├─ (passed) → legislative_president
  │               ↓
  │             legislative_chancellor
  │               ↓
  │               ├─ (veto unlocked & requested) → veto_requested
  │               │                                   ↓
  │               │                                   ├─ (accepted) → nomination (next round)
  │               │                                   └─ (rejected) → legislative_chancellor
  │               ↓
  │               ├─ (fascist policy + power) → executive_action → nomination
  │               └─ (no power) → nomination (next round)
  │
  └─ (failed, 3 in a row) → chaos (auto-enact top policy) → nomination

game_over (liberal or fascist victory)
```

## Key Game Constants

```typescript
// Role distribution by player count
const ROLE_DISTRIBUTION: Record<number, { liberals: number; fascists: number }> = {
  5:  { liberals: 3, fascists: 1 },  // + Hitler
  6:  { liberals: 4, fascists: 1 },  // + Hitler
  7:  { liberals: 4, fascists: 2 },  // + Hitler
  8:  { liberals: 5, fascists: 2 },  // + Hitler
  9:  { liberals: 5, fascists: 3 },  // + Hitler
  10: { liberals: 6, fascists: 3 },  // + Hitler
};

// Fascist board powers by player count
// null = no power, otherwise the power type
const FASCIST_BOARD_POWERS: Record<number, (ExecutiveActionType | null)[]> = {
  // 5-6 players
  small: [null, null, 'policy_peek', 'execution', 'execution', null],
  // 7-8 players
  medium: [null, 'investigate_loyalty', 'special_election', 'execution', 'execution', null],
  // 9-10 players
  large: ['investigate_loyalty', 'investigate_loyalty', 'special_election', 'execution', 'execution', null],
};

// Policy deck
const INITIAL_POLICY_DECK = {
  liberal: 6,
  fascist: 11,
};
```

## Coding Conventions

### TypeScript
- Strict mode enabled
- Use interfaces for game state, types for unions
- All game logic functions should be pure when possible
- Server-side validation for all game actions

### React Components
- Functional components with hooks only
- Use `use client` directive for interactive components
- Keep components small and focused
- Extract game logic into `lib/game-engine/`

### State Management
- Game state lives in Supabase, subscribed via Realtime
- Local UI state with useState/useReducer
- Player session in localStorage + Supabase

### Styling
- Tailwind CSS only (no CSS modules or styled-components)
- Mobile-first responsive design
- Dark mode with 1930s propaganda aesthetic
- Color palette: deep reds, blacks, golds, parchment tones

### Mobile-First Principles
- Touch targets minimum 44x44px
- Action buttons in thumb zone (bottom of screen)
- Swipe gestures for card interactions
- Avoid hover-dependent interactions
- Test on actual mobile devices

## Visual Design System

### Color Palette
```css
:root {
  --bg-primary: #1a1a1a;        /* Near black */
  --bg-secondary: #2d2d2d;      /* Dark gray */
  --bg-card: #3d3d3d;           /* Card backgrounds */

  --text-primary: #f5e6d3;      /* Parchment/cream */
  --text-secondary: #a89f91;    /* Muted parchment */

  --liberal-primary: #1e4d6b;   /* Deep blue */
  --liberal-secondary: #2d6a8f; /* Lighter blue */

  --fascist-primary: #8b1e1e;   /* Deep red */
  --fascist-secondary: #a62c2c; /* Lighter red */

  --accent-gold: #c4a84b;       /* Gold accents */
  --accent-bronze: #8b6914;     /* Bronze/brown */

  --success: #2d5a3d;           /* Dark green */
  --warning: #8b6914;           /* Bronze */
  --danger: #8b1e1e;            /* Red */
}
```

### Typography
- Headers: Bold, uppercase, tracking-wide (propaganda poster style)
- Body: Clean sans-serif for readability
- Accent text: Slightly condensed for dramatic effect

### Component Style
- Subtle shadows for depth
- Rounded corners (but not too rounded - period appropriate)
- Minimal borders, rely on background colors
- Eagle/wing motifs and geometric patterns for decoration

## Session Persistence

Players are identified by a session ID stored in localStorage:

```typescript
interface PlayerSession {
  sessionId: string;      // UUID, persists across refreshes
  playerName: string;     // Display name
  currentGameId?: string; // Active game (if any)
}
```

On page load:
1. Check localStorage for existing session
2. If session exists and has `currentGameId`, check if game is still active
3. If game active, reconnect player automatically
4. If no session, show join/create form

## Real-time Subscriptions

Subscribe to game state changes:

```typescript
// Subscribe to game changes
supabase
  .channel(`game:${roomCode}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
    (payload) => updateGameState(payload.new)
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
    (payload) => updatePlayers(payload)
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'votes', filter: `game_id=eq.${gameId}` },
    (payload) => updateVotes(payload)
  )
  .subscribe();
```

## Security Considerations

### Row Level Security (RLS)
- Players can only see their own role
- Policy deck contents hidden until drawn
- Votes hidden until all submitted, then revealed
- Game state visible to all players in game

### Validation
- All game actions validated server-side
- Check player turn, phase, and action validity
- Prevent race conditions with database transactions

## Testing Strategy

- Unit tests for game engine logic (roles, policies, state transitions)
- Integration tests for Supabase functions
- E2E tests with Playwright for critical flows (join game, vote, enact policy)

## Deployment

### Netlify Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key (server-side only)
```

## References

- Game rules: `rules.txt`
- Implementation prompts: `PROMPTS.txt`
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
