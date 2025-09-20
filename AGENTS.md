# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts Expo Router screens; `_layout.tsx` defines the root stack and `(tabs)/` contains Home and Settings routes.
- `lib/` provides shared TypeScript helpers (e.g., `lib/keys.ts` for SecureStore keys and migrations); export utilities with named exports.
- `llm/` stores long-form prompts and agent workflows under `context/` and `workflows/`.
- Put new assets in `app/assets/`; keep tests in `__tests__/` or alongside components using the screen or hook name.

## Build, Test, and Development Commands
- `pnpm dev` resets Expo caches and launches the development client for reliable hot reload.
- `pnpm start`, `pnpm ios`, and `pnpm android` run the app on web or device targets.
- `pnpm typecheck` blocks regressions with `tsc --noEmit`; keep it green before commits.
- `pnpm format` runs Prettier across the repo; pair with `pnpm run doctor` and `pnpm run fix` to align Expo dependencies.

## Coding Style & Naming Conventions
- Strict TypeScript with functional React components; follow 2-space indentation and standard Prettier defaults.
- Use camelCase for runtime variables, snake_case for SecureStore keys, and ensure file-route names mirror their screen intent.
- Keep shared helpers in `lib/` as named exports; avoid default exports to simplify tree-shaking.

## Testing Guidelines
- Add suites with `pnpm add -D jest-expo @testing-library/react-native`; name files `<feature>.test.tsx`.
- Structure `describe` blocks after screen or hook names; cover signer flows such as SecureStore round-trips and key generation.
- Run tests via `pnpm exec jest`; prefer colocated fixtures for clarity.

## Commit & Pull Request Guidelines
- Write short, present-tense commit messages (≤72 chars); optional scope prefixes like `feat:` or `fix:` are welcome.
- PRs should link relevant issues, describe user-visible changes, attach screenshots for UI tweaks, and list validation commands.
- Request review before merging to `main`; ensure typecheck and essential tests pass locally.

## Security & Configuration Tips
- Never commit secrets; load runtime configuration from `.env` via `expo-constants`.
- When changing SecureStore schema, bump the migration helpers in `lib/` so existing installs remain stable.
- Rely on EAS for platform credentials and keep them out of source control.
