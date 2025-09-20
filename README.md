# nip55-ios-test – Expo React Native Boilerplate

A damn simple, modern, concise, robust Expo + Expo Router (TypeScript) starter targeting Expo SDK 54.

## Quickstart (pnpm)

Use pnpm with Corepack so everyone gets the same toolchain. This repo pins pnpm via `packageManager`.

1. Enable Corepack

```sh
corepack enable
# pnpm -v  # should print a 10.x version (Corepack will use the pinned version)
```

2. Install deps and generate lockfile

```sh
rm -rf node_modules package-lock.json
pnpm install
```

3. Verify compatibility (Expo Doctor)

```sh
pnpm run fix    # aligns deps to Expo’s expected versions
pnpm run doctor # uses expo-doctor
```

If expo-doctor reports missing peer dependencies, install them with versions aligned to your Expo SDK:

```sh
pnpm exec expo install @expo/metro-runtime expo-constants expo-linking react-native-safe-area-context react-native-screens
pnpm run doctor
```

4. Run the app

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
- SNSTR + SecureStore wiring for the local signer
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

## NIP-155 draft demo

Alongside the starter, this repo hosts the working draft in `llm/context/nostr/NIP155.md` and a companion signer UI that exercises it. The goal is to keep the code easy to audit while proving the end-to-end handshake works on iOS.

### Supported surface

- `get_public_key` — returns the local pubkey/npub pair.
- `sign_event` — canonicalizes + signs caller-supplied events.
- `nip04_encrypt` / `nip04_decrypt` and `nip44_encrypt` / `nip44_decrypt` for symmetric tests.
- `decrypt_zap_event` wiring is stubbed via the same parser so callers can observe error handling.

The parser accepts both `nostrsigner://` and the app-specific `nip55-ios-test://` scheme, validates x-callback parameters, and rejects unsupported compression with a clear error.

### Try the flow

1. `pnpm dev` then open the project in Expo Go or a simulator.
2. On **Home** (`app/(tabs)/index.tsx`), generate or paste an `nsec`, then **Save**. The app stores it in SecureStore and shows the derived `npub` + hex pubkey.
3. Tap **Test NIP-155 request**. This launches a local deep link that resolves to `/sign`.
4. Review the payload in `/sign` (`app/sign.tsx`). Approve to dispatch the callback URL; reject to see the spec error path.
5. In Expo Go, callbacks fall back to `/debug/success` or `/debug/error` so you can inspect the query params. In a native build, iOS would open the caller’s scheme directly.

### Code map

- `lib/nip155.ts` — small helpers: request detection, parsing, callback URL builders.
- `app/_layout.tsx` — central deep-link intake and callback subscription.
- `app/sign.tsx` — simplified approval surface using SNSTR crypto helpers.
- `app/debug/*` — renders callback payloads when iOS cannot hand control back.

## Next steps (optional)

- Add ESLint: `pnpm add -D eslint eslint-config-expo` then `"lint": "eslint ."` script.
- Add tests: `pnpm add -D jest-expo @testing-library/react-native`.
- EAS builds: `pnpm add -D eas-cli` and run `eas build:configure`.

Enjoy!
