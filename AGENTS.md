# AGENTS.md

Guidelines for AI agents working on SVG Morph.

## Project

SVG Morph is a client-side web app that morphs between SVG files and exports the result (SMIL, CSS, JS, React component, 3D, video). There is no backend.

## Stack

- Vite 5, React 18, TypeScript (strict), Tailwind CSS 3
- Zustand (state), React Router 6
- svg-path-commander, d3-interpolate, @svgdotjs/svg.js, three.js, framer-motion
- Package manager: **pnpm**

## Commands

```bash
pnpm dev       # dev server
pnpm build     # production build
pnpm lint      # ESLint
pnpm preview   # preview production build
```

```bash
pnpm test        # Vitest, single run
pnpm test:watch  # Vitest, watch mode
```

Tests live next to the code as `*.test.ts` (Vitest, `node` environment, configured in `vite.config.ts`). Start with pure logic in `src/utils/`; add a DOM environment only when a component test needs it.

## Structure

```
src/
├── components/   # UI components
├── contexts/     # React contexts (e.g. toasts)
├── hooks/        # Feature hooks
├── pages/        # Route-level components
├── store/        # Zustand store (morphStore.ts)
├── types/        # Shared types
├── utils/        # Core algorithms and export logic
└── workers/      # Web Worker (pathProcessor.ts); managed via utils/workerManager.ts
```

- Heavy path processing runs in the worker and keeps a synchronous fallback. Preserve both paths when touching it.
- Keep algorithms in `utils/` free of React so they stay unit-testable.

## Code conventions

- TypeScript `strict`, `noUnusedLocals` and `noUnusedParameters` are on. No `any` unless justified.
- Match the style of the surrounding code. Do not reformat unrelated lines.
- Brand palette: `#ffde3a`, `#cdb22d`, `#595959` (see "Visual redesign"). Define colors as Tailwind theme tokens, never as scattered hex literals.
- Small, reviewable changes. Do not mix refactors with functional changes.
- Do not delete code, tests or validations without stating why.

## SVG and animation rules

- Path morphing only interpolates between paths with the same number and order of commands. Normalize both paths before interpolating; never interpolate raw `d` strings.
- Exports are a public contract: users embed the output elsewhere. Do not change the shape of exported SVG, SMIL, CSS, JS or React output without saying so explicitly.
- Choose the animation layer by context: SMIL for self-contained SVG (keeps running inside `<img>` or CSS backgrounds), CSS keyframes when the SVG is inlined and should sync with the page.
- Verify exported animations in at least two browsers before calling export work done. If you cannot, say so.
  `pnpm check:smil <export.svg>` does it for an exported SMIL SVG: it loads the file in Chrome and Firefox, freezes the animation at a few instants and compares where every path is and how opaque it is (see `scripts/check-smil.mjs`). It does not cover Safari.
- Respect `prefers-reduced-motion` in any new UI animation and in generated output where feasible.
- Prefer the libraries already installed (`svg-path-commander`, `d3-interpolate`) over new dependencies or hand-rolled path math.

## Visual redesign

The app is being redesigned visually. Use the local skill `design-taste-frontend` (installed under `.claude/skills/`, not tracked).

- **Responsive is mandatory.** Every page and component must work at 390, 768 and 1440 px wide, with no horizontal overflow. Verify at those three widths before calling UI work done.
- Scope of the skill: public-facing pages (`Home`, `About`). It is not meant for app screens, so for the Playground, Multi-stage, 3D and Reverse Engineering pages apply its principles with judgment, and do not restructure the tool UX unless asked.
- Palette for the redesign: `#ffde3a`, `#cdb22d`, `#595959`. Roles (background, text, accent) are not defined yet; ask before assigning them. Check text contrast (WCAG AA, 4.5:1) for every pairing: `#cdb22d` on `#595959` is below that for body text.
- `ThreeDMorphing` (page, panel and engine) is included in the redesign and its old palette values must be migrated. Its `any`-typed three.js usage is known debt to fix in due course, separately from visual changes.
- Redesign work is visual: do not change morphing, export, or worker logic as part of it. Keep style changes in separate commits from functional ones.
- The skill's inspector saves screenshots to `.taste-skill/` (git-excluded). Never commit them.

## Language

- Chat with the user: Spanish.
- Everything written to the repo (code, comments, identifiers, UI copy, docs, commits, PRs): **English**.

## Git

- Conventional Commits only (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- Never add `Co-Authored-By` or any AI attribution to commits or PR descriptions.
- Never commit, push, or open PRs unless the user asks.
- Local tooling is never tracked: `.atl/`, `.codegraph-win/` (global gitignore) and everything under `.claude/skills/` (`.git/info/exclude`). Any skill installed locally must be added to that exclusion before use; check with `git status` that it does not appear.

## Verification

Before saying a task is done:

1. `pnpm lint` passes.
2. `pnpm build` passes. Vite does not type-check, so also run `pnpm exec tsc -p tsconfig.app.json --noEmit`.
3. `pnpm test` passes. Behavior changes need new or updated tests; run the focused test first, then the full suite.
4. If you could not run something, say so explicitly. Never claim a check passed without having run it.

## Security and privacy

- Never hardcode or log secrets, tokens, credentials, or personal data.
- Use no real sensitive data in fixtures, examples or tests.
- Do not add dependencies without explaining why. Prefer what is already installed.
- Flag any potential vulnerability explicitly and propose a mitigation.

## Memory (Engram)

Engram is the persistent memory. Follow this protocol:

- Call `mem_current_project` before the first `mem_context`, `mem_search` or `mem_review`, and use the exact project it returns.
- Call `mem_save` proactively after any decision, bugfix, discovery, convention or config change. Do not wait to be asked.
- For any reference to past work: `mem_context` → `mem_search` → `mem_get_observation`.
- Call `mem_session_summary` before declaring work done.
- Memory is bookkeeping, never the answer: always end the turn with the full user-facing reply.
- If a memory call fails, deliver the answer anyway.

## Working agreements

- Understand the existing flow before modifying it. Verify APIs, types and store fields in the code; do not invent them.
- State assumptions explicitly when the request is ambiguous.
- Ask one question at a time, then wait.
- Mention performance impact when a change touches the animation loop, worker, or export pipeline.
- Close each code change with a short note on risk and what was verified.
