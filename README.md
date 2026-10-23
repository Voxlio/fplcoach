# FPL Coach

A Fantasy Premier League analysis tool that helps you make better decisions for your FPL team. Enter your team ID to get comprehensive gameweek analysis including problem players, best transfers, captain picks, best XI, bench order, and chip advice.

## Features

- **Squad Analysis**: View your best XI formation, bench order, and problem players with injury/bad fixture/price fall flags
- **Transfer Recommendations**: Single and double transfer suggestions with net gain calculations, hit costs, and horizon projections
- **Captain Advice**: Top captain candidates ranked by projected points, with vice-captain fallback
- **Chip Strategy**: Rule-based recommendations for Wildcard, Free Hit, Bench Boost, and Triple Captain
- **Player Search**: Browse all FPL players with filtering by position, price, and sorting by projected points
- **Privacy-First**: Team ID stored locally in your browser, never sent to external servers

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS (dark mode, mobile-first)
- **Validation**: Zod for API response validation
- **Testing**: Jest with ts-jest
- **Deployment**: Vercel Hobby tier compatible

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fpl-coach

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Type checking
pnpm tsc --noEmit

# Run tests
pnpm test

# Lint
pnpm lint

# Build (uses Webpack on Windows)
pnpm build
```

## Usage

1. Enter your FPL Team ID (found in your FPL profile URL: `https://fantasy.premierleague.com/entry/{TEAM_ID}`)
2. Optionally configure:
   - Free transfers available (1-5)
   - Bank balance (in tenths of millions, e.g., 5 = £0.5m)
   - Planning horizon (1-10 gameweeks)
   - Used chips this season
3. View analysis across 5 tabs:
   - **Squad**: Best XI, bench order, problem players
   - **Transfers**: Single/double transfer suggestions, roll advice
   - **Captain**: Captain & vice-captain recommendations
   - **Chips**: Chip usage advice with strategy tips
   - **Players**: Searchable player database with projections

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── team/route.ts      # Main team analysis endpoint
│   │   └── players/route.ts   # Player search endpoint
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Main dashboard (client component)
│   └── globals.css            # Global styles
├── lib/
│   ├── config.ts              # All tunable constants
│   ├── schemas.ts             # Zod validation schemas
│   ├── fpl-client.ts          # FPL API client with caching
│   ├── rules.ts               # Squad/formation/budget validation
│   ├── pricing.ts             # Purchase/selling price calculation
│   ├── projections.ts         # Per-fixture projected points
│   ├── best-xi.ts             # Best XI formation & bench order
│   ├── transfers.ts           # Transfer search algorithms
│   ├── chips.ts               # Chip recommendation logic
│   ├── analysis.ts            # Orchestration layer
│   └── __tests__/             # Unit tests (99 tests)
└── ...
```

## API Endpoints

### `GET /api/team`

Returns full team analysis for a given team ID.

**Query Parameters:**
- `id` (required): FPL Team ID
- `fts` (optional, default: 1): Free transfers available (1-5)
- `bank` (optional): Bank balance in tenths of millions
- `horizon` (optional, default: 4): Planning horizon in gameweeks (1-10)
- `refresh` (optional, default: false): Bypass cache

**Response:**
```json
{
  "entry": { "id": 123, "name": "Team Name", ... },
  "upcomingGameweek": 5,
  "horizonGameweeks": 4,
  "bank": 5,
  "freeTransfers": 1,
  "squad": [...],
  "bestXI": {
    "formation": { "gk": 1, "def": 4, "mid": 4, "fwd": 2 },
    "starters": [...],
    "bench": [...],
    "captainId": 123,
    "viceCaptainId": 456,
    "totalProjectedPoints": 67.5,
    "flags": [...]
  },
  "transfers": {
    "singleTransfers": [...],
    "doubleTransfers": [...],
    "rollTransfer": { "shouldRoll": false, "reason": "...", "bestGain": 4.2 }
  },
  "captainOptions": [...],
  "chips": {
    "wildcard": { "recommended": false, "reason": "...", "confidence": "medium" },
    "freeHit": { "recommended": true, "reason": "...", "confidence": "high" },
    "benchBoost": { "recommended": false, "reason": "...", "confidence": "low" },
    "tripleCaptain": { "recommended": false, "reason": "...", "confidence": "low" },
    "summary": "..."
  },
  "flags": { "123": [...] },
  "totalValue": 1035
}
```

### `GET /api/players`

Searchable player list for manual comparison.

**Query Parameters:**
- `pos` (optional): Position filter (1=GK, 2=DEF, 3=MID, 4=FWD)
- `maxPrice` (optional): Maximum price in millions
- `minPrice` (optional): Minimum price in millions
- `team` (optional): Team filter (1-20)
- `sort` (optional): Sort by `xp` | `horizon` | `price` | `form` | `total`
- `gw` (optional): Gameweek for projections
- `horizon` (optional): Horizon gameweeks

## Configuration

All tunable constants are in `src/lib/config.ts`:

- **Projection weights**: Model blend ratios, factor clamps
- **Points system**: FPL scoring rules (goals, assists, clean sheets, etc.)
- **Formation rules**: Valid formations, squad composition, club limits
- **Transfer logic**: Hit cost, margin, roll threshold, horizon
- **Availability thresholds**: Injury, doubtful, bench-only, minutes security
- **Cache TTLs**: Bootstrap static, fixtures, team picks
- **Chip thresholds**: Problem starters, blank players, bench XP, TC projection

## Data Sources

All data is fetched from the official [FPL API](https://fantasy.premierleague.com/api/):
- Bootstrap static (players, teams, events)
- Fixtures
- Team entry & picks
- Transfer history

## Caching Strategy

- **Bootstrap static**: 5 minutes
- **Fixtures**: 5 minutes
- **Team picks**: 60 seconds
- In-memory caching with TTL, suitable for Vercel serverless functions

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy - no environment variables needed

The app works entirely with public FPL data, no authentication required.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - feel free to use this for your own FPL analysis!

## Disclaimer

This tool is for informational purposes only. FPL decisions should be based on your own research and judgment. The projections are algorithmic estimates and not guarantees of future performance.