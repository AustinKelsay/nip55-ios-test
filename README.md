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

## NIP-155 demo flow

This starter doubles as a **minimal iOS NIP-155 signer** built with SNSTR. It demonstrates:

- `get_public_key` and `sign_event` end-to-end, including signature derivation that ignores caller-supplied `pubkey` and reuses the locally stored key (per the security note in Appendix B of the draft spec).
- `nip04_encrypt` / `nip04_decrypt` and `nip44_encrypt` / `nip44_decrypt` handling for round-trip message tests.
- Callback handling for real builds (`x-success`, `x-error`) and an Expo Go-friendly fallback that surfaces results in-app (`app/debug/success.tsx`, `app/debug/error.tsx`).
- Spec-compliant error responses: `user_cancelled`, `permission_denied`, `not_logged_in`, `unsupported_method`, etc.

### Running the demo

1. Launch the dev server: `pnpm dev` (Expo SDK 54).
2. Open Expo Go or a simulator and load the project.
3. In the Home tab:
   - Paste an `nsec1…` or tap **Generate nsec**. We use SNSTR’s `generateKeypair` + `encodePrivateKey`.
   - Tap **Save** to persist the signer (stores `nsec` in `expo-secure-store`). The screen shows the derived `npub` and raw pubkey.
4. Tap **Test NIP-155 request**:
   - The app fires a local deep link (`nip55-ios-test://sign_event?...`).
   - The `app/_layout.tsx` handler routes the request into `/sign` for approval.
   - Approving signs the event with SNSTR (`getEventHash` + `signEvent`) and dispatches the `x-success` callback.
   - Inside Expo Go, the OS can’t open `nip55-ios-test://` callbacks, so `lib/nip155.ts` emits a fallback event that routes to `/debug/success`, where we decode and render the signed payload.
   - On a custom dev/production build (where the scheme is registered with iOS), the OS opens the callback URL directly; we still parse it so the debug screen shows the result.
5. Optional: trigger the Settings tab’s **Reset signer** to clear the stored `nsec` (useful for testing `not_logged_in`).

### Deep link highlights

- Schemes: `nostrsigner://` (spec) and `nip55-ios-test://` (app-specific). Router logic accepts both and ignores the signer’s own debug callbacks.
- For `sign_event`, we always re-derive the signer’s pubkey before hashing/signing. The incoming payload’s `pubkey` field is treated as untrusted data.
- `returnType` is honored: `signature`, `event`, `ciphertext`, or `plaintext`. Unsupported combinations are rejected with `invalid_request`.
- Compression: we only accept `compressionType=none` in this demo; callbacks return an error if `gzip` is requested.

### Files of interest

- `app/_layout.tsx` – deep-link intake, callback routing (dev fallback + real schemes).
- `app/sign.tsx` – approval UI + SNSTR signing/encryption logic.
- `lib/nip155.ts` – request parser, validation, callback dispatcher.
- `lib/callbacks.ts` – simple event bus for environments that can’t open custom schemes.
- `app/debug/success.tsx` / `app/debug/error.tsx` – show decoded callback payloads to confirm flows while developing.

### Install helper deps (already in `package.json`)

If you clone this repo without `node_modules`, install the dependencies used by the signer:

```sh
pnpm exec expo install expo-secure-store expo-linking expo-clipboard
pnpm add snstr
pnpm dev
```

## Next steps (optional)

- Add ESLint: `pnpm add -D eslint eslint-config-expo` then `"lint": "eslint ."` script.
- Add tests: `pnpm add -D jest-expo @testing-library/react-native`.
- EAS builds: `pnpm add -D eas-cli` and run `eas build:configure`.

Enjoy!
