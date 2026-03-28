# Rooted Insight

## Overview

A health literacy web application that allows users to upload/enter lab test results, get AI-powered plain-language explanations, receive evidence-based natural wellness suggestions, and track their current medications. The app is non-prescriptive and always encourages consulting a healthcare provider.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/rooted-insight)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Build**: esbuild (CJS bundle)

## Features

1. **Dashboard** - Overview of lab results and medications with summary stats
2. **Lab Results** - List all historical lab results with status indicators
3. **Lab Result Detail** - View individual markers with status badges (normal/low/high/critical)
4. **AI Analysis** - Plain-language AI explanation for out-of-range markers + evidence-based natural suggestions (supplement, diet, lifestyle, etc.)
5. **Add Lab Result** - Manually enter any lab test with multiple markers
6. **Medications Tracker** - Add, edit, delete current medications with full details

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── rooted-insight/         # React + Vite frontend (preview path: /)
│   └── api-server/             # Express API server (preview path: /api)
├── lib/
│   ├── api-spec/               # OpenAPI spec + Orval codegen config
│   ├── api-client-react/       # Generated React Query hooks
│   ├── api-zod/                # Generated Zod schemas from OpenAPI
│   ├── db/                     # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # OpenAI AI integration
├── scripts/                    # Utility scripts
└── package.json                # Root package
```

## Database Schema

- `lab_results` — Lab test results with markers stored as JSONB
- `lab_analyses` — AI-generated analyses linked to lab results
- `medications` — User medication tracking

## API Routes

- `GET/POST /api/lab-results` — List/create lab results
- `GET/DELETE /api/lab-results/:id` — Get/delete a lab result
- `POST /api/lab-results/:id/analyze` — AI analyze a lab result
- `GET/POST /api/medications` — List/create medications
- `PUT/DELETE /api/medications/:id` — Update/delete a medication

## AI Integration

Uses Replit AI Integrations (OpenAI proxy) — no user API key needed.
- Model: gpt-5.2 for analysis
- Analyzes lab markers and generates plain-language explanations
- Suggests evidence-based natural options (supplements, diet, lifestyle, exercise, sleep, stress)
- Always includes medical disclaimer

## Key Conventions

- Non-prescriptive: always prompts consultation with healthcare provider
- Educational focus: plain-language explanations for all lab values
- Evidence levels: strong/moderate/emerging for all suggestions
