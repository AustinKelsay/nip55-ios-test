# Repository Guidelines

## Project Structure & Module Organization

- `app/` — Expo Router entry; `_layout.tsx` defines the root stack; `(tabs)/` supplies Home and Settings. Screens follow file‑route intent, e.g., `settings.tsx`, `profile/[id].tsx`.
- `lib/` — shared TypeScript utilities (named exports). Includes SecureStore helpers and migrations; see `lib/keys.ts`.
- `llm/` — long‑form prompts/automations under `context/` and `workflows/`.
- Root configs: `app.json`, `babel.config.js`, `tsconfig.json`. New assets go in `app/assets/`.
- Tests (when added) live in `__tests__/` or beside components.

## Build, Test, and Development Commands

- Use Corepack with pnpm.
- `pnpm dev` — launch Expo with cache reset for reliable hot reload.
- `pnpm start` / `pnpm ios` / `pnpm android` — run the app per platform.
- `pnpm typecheck` — run `tsc --noEmit` to block type regressions.
- `pnpm format` — apply Prettier to the entire tree.
- `pnpm run doctor` + `pnpm run fix` — validate and realign Expo dependency versions.

## Coding Style & Naming Conventions

- Strict TypeScript; functional React components.
- Prettier defaults (2‑space indent; `jsxSingleQuote: false`).
- Runtime variables use camelCase; SecureStore keys use snake_case.
- Export shared helpers as named exports from `lib/`.
- File‑route names mirror screen intent and URL segments.

## Testing Guidelines

- Add tooling with: `pnpm add -D jest-expo @testing-library/react-native`.
- Name tests as `<name>.test.tsx`; place in `__tests__/` or alongside components.
- Describe blocks match the screen/hook name; cover signer flows (key generation, SecureStore round‑trip).
- Run suites with `pnpm exec jest`; keep `pnpm typecheck` green before pushing.

## Commit & Pull Request Guidelines

- Commits: short, present‑tense, ≤72 chars; optional scope prefix (`feat:`, `fix:`).
- PRs: link issues, describe user‑visible changes, include screenshots for UI tweaks, and note validation (commands run, device targets). Request review before merging to `main`.

## Security & Configuration Tips

- Never commit secrets; manage platform credentials via EAS.
- Use `.env` (gitignored) and access via `expo-constants`.
- When SecureStore schema changes, bump a migration helper in `lib/` to keep existing installs stable.
