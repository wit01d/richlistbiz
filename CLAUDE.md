# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RichList.biz is a gamified referral platform with a 4-position listline structure. Users pay €10 to join (via referral only), and payments flow to Position 1 of their listline. The system includes automatic successor promotion when users recruit 13+ depositing members.

## Commands

All commands run from `/frontend`:

```bash
npm run dev        # Start Vite dev server on localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run typecheck  # TypeScript type checking
```

## Architecture

### Frontend (React + Three.js)
- **Entry**: `frontend/index.tsx` → `App.tsx`
- **3D Scene**: Uses React Three Fiber with Canvas for immersive neon cyberpunk aesthetic
- **Component hierarchy**: `App` → `Canvas` → `NeonScene` (3D) + `HtmlOverlay` (React UI)
- **Auth**: Keycloak integration in `frontend/services/Keycloak.ts`
- **Dashboard**: `frontend/pages/UserDashboard.tsx` - receives data as props

### Database (PostgreSQL)
- **Production schema**: `backend/production_referral_system.sql` (1196 lines)
- Core tables: `users`, `listlines`, `deposits`, `earnings`, `successor_nominations`, `withdrawals`
- Includes fraud detection (`fraud_flags`), audit logging (`audit_log`), rate limiting (`rate_limits`)
- `system_account` table holds a singleton SYSTEM account for empty position payouts

### Missing Components
No backend API server exists yet. The frontend has Keycloak auth but no API client for business data.

## Core Business Logic

### Listline Formation
When user U joins via referrer R₁:
- Position 1 = R₃ (3 levels up, or SYSTEM if depth < 3)
- Position 2 = R₂ (2 levels up, or SYSTEM if depth < 2)
- Position 3 = R₁ (direct referrer)
- Position 4 = U (the new user)

**Payment always goes to Position 1.**

### Successor System
Trigger: Position 4 recruits 13+ depositing users
- System randomly selects 1 of last 3 recruits as successor
- Successor takes Position 4 on NEW listline with original Positions 1-3
- Successor belongs to Position 1's network, not the nominator's

### Financial Rules
- Fixed deposit: €10 (enforced by DB constraint)
- 10% maintenance fee → €9 net payout
- Minimum withdrawal: €10
- Chargeback window: 14-30 days before clearing
- Earnings lifecycle: pending → verified → cleared

## Key Files

- `README.md` - Detailed business logic specification with examples
- `backend/production_referral_system.sql` - Complete data model
- `frontend/services/Keycloak.ts` - Auth flow (initKeycloak, login, register, logout, getToken)
- `frontend/vite.config.ts` - Build config with manual chunk splitting

## Tech Stack

- React 19, TypeScript 5.9, Vite 7
- Three.js + React Three Fiber/Drei for 3D
- Keycloak for OAuth2/OIDC
- PostgreSQL with PL/pgSQL stored procedures
- Tailwind CSS (CDN-loaded)

## Environment

Sensitive keys go in `.env.local` (gitignored). The `.env` file defines:
- `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT`
- `STRIPE_*` keys for payments
- `GEMINI_API_KEY`
