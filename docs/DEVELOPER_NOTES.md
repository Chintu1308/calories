# Developer Notes — Calories

Update this file after every stage. Never document unverified behavior as complete.

---

### Stage 0 — Audit Existing Workspace
**Status:** Verified  
**Commit:** Pending baseline commit  
**Date:** 2026-10-23

#### What we built / audited
Inspected the workspace at `C:\Project Files\Typeface\Calories` and the handoff package at `C:\Users\bhhc1\Downloads\calories-antigravity-handoff`. Specifically verified:
1. Git repository state: Branch `master`, initial state before commits, no secrets or untracked sensitive files.
2. Runtime environment: Node.js `v22.16.0`, npm `10.9.2`.
3. Client directory structure: A React 19 + TypeScript + Vite project under `client/`.
4. Linting and TypeScript build status: oxlint runs cleanly (0 errors, 0 warnings); `tsc -b && vite build` completes successfully.
5. Brand tokens and styling: An initial `calories.tokens.json` and `calories.css` exist with brand palette (#152238 ink navy, #285B46 forest green, #BFD8C2 sage green, #FAF9F6 warm ivory, #FFFFFF white, #EDE5D8 soft sand, #6B7280 muted slate, #C88932 amber, #B84444 error red).

#### Why it exists
Before developing features in an existing codebase or inheriting a handoff, a disciplined software engineer must inspect and verify the existing workspace. This ensures:
- Pre-existing files and user progress are preserved rather than overwritten.
- System prerequisites (Node, npm, TypeScript, bundlers) are verified and documented.
- The build and lint pipeline is proven healthy before introducing changes, preventing false attribution of bugs.

#### Files audited
| File | Responsibility |
|---|---|
| `client/package.json` | Client dependencies (React 19.3.1, Vite 8.3.4, oxlint 1.88.0, TypeScript 6.0.3). |
| `client/vite.config.ts` | Vite configuration with `@vitejs/plugin-react`. |
| `client/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Project reference TypeScript config targeting ES2023 with bundler resolution. |
| `client/.oxlintrc.json` | Oxlint linter configuration. |
| `client/src/App.tsx`, `client/src/main.tsx` | Standard Vite + React starter template with counter demo. |
| `client/src/styles/calories.tokens.json` | Master design tokens for Calories palette, radii, spacing, typography. |
| `client/src/styles/calories.css` | CSS custom property mappings for design tokens. |
| `client/public/favicon.svg`, `client/public/icons.svg` | SVG icons and favicon assets. |

#### Code walkthrough
- `client/src/styles/calories.tokens.json`: Defines the design constants.
- `client/src/styles/calories.css`: Declares `:root` CSS variables (e.g. `--color-ink-navy: #152238; --color-forest-green: #285B46; --color-warm-ivory: #FAF9F6;`) and basic resets (`box-sizing: border-box`, standard system font stacks).
- `client/src/App.tsx`: Currently hosts the starter counter button and Vite documentation links. This will be replaced by the branded Calories app shell in subsequent stages.

#### Data flow
No live data flow exists yet. The client operates purely in-memory as a static single-page application.

#### Validation and security
- Verified that no `.env` files or hardcoded credentials exist in client code.
- Confirmed that build artifacts (`client/dist/`) and dependencies (`client/node_modules/`) are properly ignored by Git.

#### Tests and evidence
- Node version: `node -v` -> `v22.16.0`
- npm version: `npm -v` -> `10.9.2`
- Client lint: `cd client; npm run lint` -> `Found 0 warnings and 0 errors.`
- Client build: `cd client; npm run build` -> `✓ 21 modules transformed. built in 375ms`
- Git status: `git status` -> Branch `master`, untracked files identified and clean.

#### Known limitations
- Root workspace lacks orchestration scripts to build/test both client and server from the root directory.
- No backend server (`server/`) exists yet.
- No automated test suite exists yet.
- `client/tsconfig.app.json` does not explicitly enable `"strict": true`.

#### Interview explanation
> "When starting on the Calories project, the first step was a Stage 0 workspace audit. Rather than blindly running commands or overwriting files, I audited the Git tree, validated Node v22 and npm 10, inspected the existing React 19/Vite setup in `client/`, verified the initial design tokens in `calories.tokens.json`, and ran both Oxlint and the TypeScript build to establish a green baseline. This prevented accidental regressions and established clean boundary lines for Stage 1 scaffolding."

#### Likely interview questions
1. **Why is it important to audit an existing workspace before writing new features?**  
   *Answer:* Auditing prevents regressions, avoids overwriting prior work, verifies runtime versions (Node/npm), ensures build tools are already green, and identifies missing security configurations (such as missing `.gitignore` rules) before sensitive files are committed.
2. **What role do `package-lock.json` and strict engine versions play across different machines?**  
   *Answer:* `package-lock.json` locks the exact dependency tree resolved during install, ensuring reproducible builds across developer machines and CI/CD pipelines. Documenting Node/npm versions prevents subtle runtime incompatibilities (e.g. ESM loader differences or API deprecations).
3. **Why are design tokens stored in JSON and CSS variables rather than hardcoded in components?**  
   *Answer:* Centralizing tokens provides a single source of truth for colors, spacing, and typography. If brand guidelines evolve or dark mode is introduced, values are updated in one place without touching hundreds of individual component files.

#### Practice modification
Open `client/src/styles/calories.tokens.json`, inspect the color hex codes against the master plan specification in `docs/CALORIES_ANTIGRAVITY_BUILD_PLAN.md`, and verify that the color tokens match the specified palette.
