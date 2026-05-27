# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

SnapBots is a Tufts senior capstone built on top of the Patch IDE (a fork of `pyatch-react-ide`). Users draw state-diagram robot programs on paper, photograph them, and the app sends the image to a Modal-hosted backend that returns Python code which runs in a Scratch-like in-browser VM. The same UI also supports a "soccer" scene and a "hybrid" mode that targets physical ESP32 robots.

This repo is the **frontend only**. The VM lives in a separate package (`pyatch-vm` → `github:DuncanAJohnson/snapbots-vm`) and the code generation lives on Modal (see endpoints below).

Use Node v18.20.9.

## Commands

- `npm run dev` — webpack dev server on port 8080 (entry `src/index.tsx`)
- `npm run build` — production bundle into `build/` (copies `websiteIcon.png` to `favicon.ico`)
- `npm run emu` — runs `dev` and the Firebase emulators (auth 9099, firestore 8082, storage 9199) together, importing/exporting from `firebase_emulator/`

There is no test script and no lint script wired up. The `.eslintrc.json` is configured but only run manually. TypeScript is loaded by `ts-loader` with `transpileOnly: true`, so `tsc --noEmit` is the way to actually type-check.

## Architecture

### Two-Firebase setup
The app talks to **two separate Firebase projects** simultaneously:
- The original Patch project (`patch-271d1` / dev `patch-dev-e6061`) — used for auth, Firestore projects, and the original asset storage. Initialized in `src/lib/firebase.ts` from `FIREBASE_*` env vars.
- The SnapBots project (`eucalyptus-88beb`) — only used for image storage to send to the Modal backend. Initialized in `src/lib/snapbotFirebase.ts` from `SNAPBOT_FIREBASE_*` env vars and exports only `snapbotStorage`.

Don't conflate them. Auth and Firestore reads/writes go through the Patch app; user-uploaded paper photos go to the SnapBot app.

### Modal backend routing
Three Modal endpoints exist, selected by `localStorage.snapbotMode` (`simulation` | `hybrid` | `soccer`). The resolution lives in `src/lib/snapbotModalService.ts::getEndpointUrl`. In production, Vercel serverless functions in `api/modal/{simulation,hybrid,soccer}.js` proxy the browser → Modal (so secrets stay server-side); in dev, `webpack.config.js` proxies `/api/modal/*` directly to the Modal URLs.

When adding a new mode, update **all three**: webpack proxy, `api/modal/*.js`, and `getEndpointUrl` / `getSnapbotMode`.

### App modes (UI)
The root route `/` is `HomePage`; `/app` is `PatchApp` (`src/components/App/component.tsx`). `PatchApp` branches on `localStorage.appMode`:
- `"patch"` — the full Patch IDE: `TopBar` + tab buttons (Code/Costumes/Sounds/Variables/API) → `EditorPane` on the left, `GamePane` + `SpritePane` on the right.
- anything else — `SnapBotMode`, a stripped-down view with the simulation stage, `SimplifiedSpritePane`, and a `StateImageDisplay` showing per-sprite state images.

The Home page's "Launch Soccer Game" button sets `snapbotMode=soccer` and `patchProjectId="soccer"` in localStorage and navigates to `/app`, which causes `useProjectActions.loadCloudProject` to load `src/assets/soccer-project.json` instead of fetching from Firestore.

### VM + render stack
`useInitializedVm` (`src/components/App/useInitializedVm.ts`) wires everything together once on mount:
```
new VirtualMachine (pyatch-vm)
  ├─ attachStorage(patchStorage)         // src/lib/storage.ts + firebase storage
  ├─ attachRenderer(new Renderer(canvas)) // scratch-render
  ├─ attachAudioEngine                    // scratch-audio
  └─ attachV2BitmapAdapter                // scratch-svg-renderer
```
The canvas is stored in zustand as `patchStage`. The VM emits `VM READY`, `RUNTIME ERROR`, and `QUESTION`; runtime errors are pushed into the LSP diagnostics store. The VM is held in zustand as `patchVM` — any code that needs to drive the simulation reaches in via `usePatchStore`.

### State (zustand)
A single store, `usePatchStore` in `src/store/index.ts`, composes seven slices: code editor, costume editor, sound editor, sprite area, variable editor, the global Patch editor (tabs, modal selector, VM, projectName, projectReference…), and the language-server state. Treat slices as logical groupings but they share one state tree — selectors should reach across slices freely.

The "current sprite state" pattern (used by SnapBot mode): for each target, a global variable named `curr_state_<alphanumericTargetId>` holds the active state name. `SnapBotMode/component.tsx` reads/writes it via `patchVM.updateGlobalVariable` + `setGlobalVariable`.

### Generated-code shape
`parseCodeFromResponse` (`src/lib/snapbotModalService.ts`) expects three sections from Modal: `primitives` (array or object), `context` (state functions, object or string), and `game_loop`. It concatenates them with `### Primitives ###` / `### Generated Code ###` / `### Game Loop ###` headers and appends `game_loop()` at the end. Keep that contract in mind when changing either side.

## Conventions

- The codebase mixes `.js`/`.jsx` (older CodeMirror integration) and `.ts`/`.tsx` (everything new). Babel handles JS, ts-loader handles TS — see `webpack.config.js` for the split.
- `@ts-ignore` is used liberally to import untyped Scratch packages (`pyatch-vm`, `scratch-render`, `scratch-audio`, `scratch-svg-renderer`). Follow the existing pattern rather than fighting it.
- Routes: `/` (Home), `/app` and `/app/*` (PatchApp). Everything else redirects to `/app`.
- LocalStorage keys that drive behavior: `appMode`, `snapbotMode`, `patchProjectId`, `theme`. `patchProjectId` is set via `usehooks-ts` `useLocalStorage`, so it's JSON-encoded (`JSON.stringify('soccer')`, not `'soccer'`).
