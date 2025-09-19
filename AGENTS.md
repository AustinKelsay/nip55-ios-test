# Repository Guidelines

## Project Structure & Module Organization
The Expo Router entry lives in `app/`, with `_layout.tsx` defining the root stack and `(tabs)/` supplying Home and Settings tabs. Shared TypeScript utilities belong in `lib/` (currently `keys.ts`), while long-form prompts or automations reside under `llm/` (`context/`, `workflows/`). Configuration files such as `app.json`, `babel.config.js`, and `tsconfig.json` sit at the repo root; keep new assets in `app/assets/` when introduced to preserve Expo conventions.

## Build, Test, and Development Commands
Use pnpm via Corepack. Typical loops:
- `pnpm dev` – launch Expo with cache reset for reliable hot reload.
- `pnpm start` / `pnpm ios` / `pnpm android` – target specific platforms.
- `pnpm typecheck` – run `tsc --noEmit` to block type regressions.
- `pnpm format` – apply Prettier to the entire tree (supports staged files when paired with lint-staged).
- `pnpm run doctor` + `pnpm run fix` – validate and realign Expo dependency versions.

## Coding Style & Naming Conventions
Follow strict TypeScript with functional React components. Use Prettier defaults (2-space indentation, single quotes disabled in JSX). Export shared helpers as named exports from `lib/`. File-route names in `app/` should mirror screen intent (`settings.tsx`, `profile/[id].tsx`). Prefer snake_case for filesystem keys stored via SecureStore and camelCase for runtime variables.

## Testing Guidelines
No automated tests ship yet. When adding them, install Jest Expo (`pnpm add -D jest-expo @testing-library/react-native`) and place specs in `__tests__/` or alongside components with `.test.tsx` suffix. Keep describe blocks matching the screen or hook name and assert signer flows (key generation, secure store round-trip). Run suites with `pnpm exec jest` once configured; target meaningful coverage on signer logic before expanding to UI snapshots.

## Commit & Pull Request Guidelines
Existing history uses a short, lowercase summary (`first commit`). Continue with present-tense, 72-character subject lines, optionally prefixed by scope (`fix:`, `feat:`) for clarity. Keep commits focused on one concern. Pull requests should link issues when available, describe user-visible behavior (screenshots for UI tweaks), and note how you validated changes (commands, device targets). Request review before merging to main.

## Expo Environment Tips
Set platform credentials via Expo Application Services outside the repo; never commit secrets. Use `.env` (excluded via `.gitignore`) for API keys and reference them with `expo-constants`. When secure storage schema changes, bump a migration helper in `lib/` to keep existing installs stable.
