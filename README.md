# CreditLens

Loan portfolio analysis tool with AI-driven insights. Analyse lending arrangements, track arrears, compare portfolio snapshots, and generate recovery schedules.

## Features

- **Portfolio Analysis** — Upload HTML/CSV exports from your EM system. Automatic column detection with AI assistance.
- **Filtering** — Natural language queries, product filters, DPD bands, officer assignment, anomaly detection.
- **Comparison** — Compare two portfolio snapshots to see recovery deltas (recovered, worsening, new, resolved).
- **Schedule** — Auto-generate post-disbursement visits, field recovery visits, and maturing loan schedules.
- **Export** — XLSX (multi-sheet), CSV, or plain text. Optional AI-generated executive summary.
- **AI Insights** — Portfolio analysis, comparison insights, schedule summaries, and field visit talking points.
- **Vault** — AES-256-GCM encrypted local snapshots with passphrase protection and 90-day retention.

## AI Providers

| Provider | Model | Free Tier |
|----------|-------|-----------|
| Google Gemini | 2.5 Flash Lite | Yes |
| Groq | Llama 3.3 70B | Yes |
| OpenRouter | Multiple free models | Yes |

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

Output in `dist/` — deploy as static files.

## Tech Stack

- Vite 8 + React 19 + TypeScript
- CSS Modules + CSS Variables
- React Context + useReducer
- IndexedDB + Web Crypto API (vault)
- SheetJS (XLSX), PapaParse (CSV)
