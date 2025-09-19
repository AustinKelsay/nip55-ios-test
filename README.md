# nip55-ios-test – Expo React Native Boilerplate

A damn simple, modern, concise, robust Expo + Expo Router (TypeScript) starter targeting Expo SDK 54.

## Quickstart (pnpm)

Use pnpm with Corepack so everyone gets the same toolchain. This repo pins pnpm via `packageManager`.

1) Enable Corepack

```sh
corepack enable
# pnpm -v  # should print a 10.x version (Corepack will use the pinned version)
```

2) Install deps and generate lockfile

```sh
rm -rf node_modules package-lock.json
pnpm install
```

3) Verify compatibility (Expo Doctor)

```sh
pnpm run fix    # aligns deps to Expo’s expected versions
pnpm run doctor # uses expo-doctor
```

If expo-doctor reports missing peer dependencies, install them with versions aligned to your Expo SDK:

```sh
pnpm exec expo install @expo/metro-runtime expo-constants expo-linking react-native-safe-area-context react-native-screens
pnpm run doctor
```

4) Run the app

```sh
pnpm dev
# then press: i = iOS, a = Android, w = Web
```

The dev server opens a QR for Expo Go; or launch iOS/Android simulators with the keys above.

## What’s inside

- Expo SDK 54
- Expo Router with typed routes enabled
- TypeScript (strict)
- Minimal tabs layout: Home (Signer) + Settings
- Prettier formatting

## Structure

- `app/` – File‑based routes via Expo Router
  - `_layout.tsx` – Root stack
  - `(tabs)/_layout.tsx` – Tabs navigator
  - `(tabs)/index.tsx` – Home (Signer)
  - `(tabs)/settings.tsx` – Settings
  - `+not-found.tsx` – 404 fallback
- `app.json` – Expo config (router plugin + typedRoutes)
- `tsconfig.json` – Strict TS config (extends Expo base)
- `babel.config.js` – Babel preset for Expo

## Notes

- Prefer pnpm commands: `pnpm run <script>` or `pnpm exec expo <cmd>`.
- If versions drift later: `pnpm run fix` then `pnpm run doctor`.
- Add icons/splash later via `expo-assets` or the Expo tools; this starter keeps them minimal.

## Signer screen

The Home tab is a barebones Nostr signer:

- Paste an `nsec1...` or tap Generate to create a new key using `snstr`.
- Save stores the nsec in `expo-secure-store` and shows your `npub1...`.
- Forget signer clears secure storage.

Install native deps if not already present:

```sh
pnpm exec expo install expo-secure-store
pnpm add snstr
pnpm exec expo install expo-clipboard
pnpm dev
```

## Next steps (optional)

- Add ESLint: `pnpm add -D eslint eslint-config-expo` then `"lint": "eslint ."` script.
- Add tests: `pnpm add -D jest-expo @testing-library/react-native`.
- EAS builds: `pnpm add -D eas-cli` and run `eas build:configure`.

Enjoy!
