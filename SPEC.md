# Kawaii Flower To-Do — Complete Feature Specification

**Stack:** React 18 + Vite + TypeScript, plain CSS (no UI library), Web Audio API for sound, `localStorage` for persistence. No backend. Designed to work on iOS Safari and desktop browsers.

---

## 0. Overview

### 0.1 What the App Is

Kawaii Flower To-Do is a single-page, client-only task manager with a decorative garden that grows as the user completes tasks. The user interface has two visual zones:

1. **The task list** — occupies the main scrollable area of the page. The user types tasks into a text input at the top, checks them off, edits them, and can drag to reorder them. Completing a task plays an animated flower bloom on the row's checkbox.

2. **The garden** — a decorative band pinned to the bottom of the page. It is always visible. Each time the user completes tasks they advance a "garden level"; at each new level they choose a flower species from a pair of options, and an SVG illustration of that flower grows in the garden. By level 7 the garden holds a full row of seven different species of illustrated flowers, with small scattered accent flowers on the ground between them. At levels 8 and 9 a picket fence grows behind the flowers, one post per completed task.

When a completion meaningfully advances the garden (new growth stage or a completed level), the app briefly scrolls to show the garden with a venetian-blind reveal animation, then auto-returns the user to the task list.

The app stores everything in `localStorage`. There is no user account, login, or server.

---

### 0.2 Key Shared Variables and What They Represent

These variables appear throughout the codebase. Understanding them first makes the rest of the spec much easier to follow.

#### `completionIndex` (per task)

A **1-based integer** assigned to a task the moment the user checks it off. The first task ever completed gets `completionIndex = 1`, the second gets `2`, and so on globally across all time — it never resets, even if completed tasks are cleared from the list.

`completionIndex` is the single number that drives:
- Which **garden level** the user is on and how far along it they are.
- The **pitch and timbre** of the grow/bloom sounds (higher index → higher notes).
- The **petal count and color palette** of the animated flower on the task row.
- Where in the garden the flower cell is positioned (its SVG x-coordinate, derived at completion time and stored permanently on the task).

If a task is deleted, remaining `completionIndex` values are renumbered to fill the gap so there are never holes in the sequence.

#### `gardenProgressCount` (global, in `useTasks`)

An integer stored in `localStorage` alongside the tasks array. It always equals the **highest `completionIndex` ever reached**, and never decreases — not even when completed tasks are cleared from the list or a task is un-checked.

This is the number passed as `completedCount` to `GardenScene` and all garden-level calculation functions. Because it is the *lifetime maximum* rather than the *current count of completed tasks*, the garden never shrinks when the user tidies up their list.

At runtime it lives in the `useTasks` hook as `gardenProgressCount` and is exposed to `App.tsx`, which passes it down to the garden and header components.

#### `gardenLevel` (derived, not stored)

Computed on every render from `gardenProgressCount` by `getGardenLevel(completedCount)`. It is never stored directly. The formula:

- Levels 1–2: completing 3 tasks finishes level 1 and starts level 2.
- Level 3 and beyond: each new level requires 5 more completions.

So level 1 spans completions 1–3, level 2 spans 4–8, level 3 spans 9–13, etc.

#### `gardenCycleProgress` (derived, not stored)

Computed from `gardenProgressCount` by `getGardenCycleProgress(completedCount)`. Returns `{ planted, max }` where `planted` is how many tasks have been completed *within the current level* (0–max) and `max` is the number needed to finish it (3 for level 1, 5 for all later levels). This is what drives the pip-progress meter in the header.

#### `seedChoices` (composite object, assembled in `App.tsx`)

Seven independent pieces of `localStorage`-backed state, one per garden level, assembled into a single `GardenSeedChoices` object and passed to garden components:

```ts
interface GardenSeedChoices {
  starting: StartingSeed | null;   // chosen on first task completion
  level2: Level2Seed | null;       // chosen when level 2 begins
  level3: Level3Seed | null;
  level4: Level4Seed | null;
  level5: Level5Seed | null;
  level6: GardenSeed | null;       // one of the two "unselected" seeds from levels 1–5
  level7: Level7Seed | null;       // always toast flower or jam flower
}
```

Each seed choice is loaded by its own hook (`useStartingSeed`, `useLevel2Seed`, …) that reads from `localStorage` on mount. A null value means the player hasn't picked that level's flower yet. Seed choices are never overwritten once made.

#### `gardenDisplayCount` (derived in `App.tsx`, not stored)

The `completedCount` value actually passed to `GardenScene` during rendering. It is normally equal to `gardenProgressCount`, but during the garden reveal animation it is temporarily frozen at the **pre-completion** value so the new plant does not appear before the venetian-blind lift has finished.

#### `hydrated` / `seedsHydrated` (flags, not stored)

Each `localStorage`-backed hook starts `hydrated = false` and flips to `true` after its first `useEffect` reads storage. `App.tsx` combines all hydration flags into `seedsHydrated`. While any flag is false the app renders a loading state instead of seed pickers, to prevent a briefly-visible picker for a seed the user already chose.

---

## 1. To-Do List Functionality

### 1.1 Task Data Model

Each task is a plain object stored as JSON in `localStorage` under the key `kawaii-todo-tasks`:

```ts
interface Task {
  id: string;                // crypto.randomUUID()
  text: string;
  completed: boolean;
  completionIndex?: number;  // lifetime 1-based index, drives garden level & audio pitch
  plantSlot?: number;        // garden slot 0-4 (kept forever, never recalculated)
  plantX?: number;           // exact SVG x-coordinate (kept forever)
  gardenRevealed?: boolean;  // false while planting animation is in flight
  sortOrder: number;         // float; new tasks get min(existing) - 1 so they appear at top
  createdAt: number;         // Date.now() at creation
  releaseToBottomAt?: number;// timestamp: completed row stays in place until then
}
```

A separate `gardenProgressCount` integer (the highest `completionIndex` ever reached) is persisted alongside the tasks so clearing completed rows does not roll back garden progress.

On load, `completionIndex` values are re-ranked 1…N in chronological order (so deleted tasks don't leave gaps).

### 1.2 Display Order

`sortTasksForDisplay` produces: **[incomplete + freshly-completed rows]** sorted by `sortOrder`, then **[released completed]** sorted by `completionIndex`. A completed task is "pinned" in its original position for `COMPLETED_MOVE_DELAY_MS = 2400 ms` then animates down to the bottom section.

### 1.3 Adding Tasks

- A text input at the top of the page. Submitting the form trims whitespace, assigns a UUID, places it at the top of the incomplete list (lowest `sortOrder`), and plays a short three-note ascending chime (via Web Audio API, skipped when muted).
- Empty submissions are silently ignored.

### 1.4 Completing a Task

Clicking the checkbox on an incomplete task runs a two-phase SVG animation inside the task row (the "stem-strike"):

1. **Grow phase** — A vertical stem SVG grows upward over the task text. Duration scales with `completionIndex` via a `GrowthTier` lookup (earlier tasks grow faster). An easing curve (`easeOutCubic`) drives linear `progress 0→1`.
2. **Bloom phase** — Petals appear one by one with a stagger of 40 ms each. Petal count and color palette are also tier-based.
3. **Completion fires** — After the petal settle time the `onComplete` callback fires, which: increments `gardenProgressCount`, marks the task completed in state, sets `releaseToBottomAt = now + 2400 ms`, and triggers the garden reveal if appropriate.

Audio during completion (all scheduled inside the same user-gesture so iOS permits them):
- **Grow sound:** four ascending sine tones across the grow duration.
- **Bloom sound:** bell strike + two harmonics at bloom moment.
- **Drop sound:** two-note bell at the moment the row falls to the bottom.

### 1.5 Uncompleting a Task

Clicking the checkbox on a completed task reverses the animation:

1. **Wilt phase** — Petals wilt (CSS class `flower-petal--wilt`) for ~320 ms.
2. **Retract phase** — Stem retracts with `easeInCubic` over the same grow duration.
3. The `gardenProgressCount` is **not** decremented (garden progress is permanent).

Audio: descending triangle tone (wilt), then descending sine tones (retract).

### 1.6 Task Row Visual — Flower SVG

Every task row hosts a `StemStrikeSVG` component that draws inline SVG:
- **Stem:** a vertical `<line>` whose `scaleY` is driven by `progress`.
- **Leaves:** two ellipses at the stem-top position.
- **Bud → bloom:** at `progress ≥ 0.95` the bud ellipse is replaced by petals arranged in a circle; petals fade in one-by-one via staggered CSS transitions.
- **Strike-through:** the task text fades to 55% opacity and gets a CSS strikethrough class.
- The `GrowthTier` object (derived from `completionIndex`) determines: stem stroke width, petal count (3–8), color palette index, and grow duration in ms.

### 1.7 Action Menu (⋯ button)

Each row has a "⋯" button that opens a popup menu (`TaskActionMenu`) with:
- **Move** — enters move mode (see §1.9).
- **Delete** — opens a `DeleteConfirmDialog` with Cancel / Confirm.

The menu is a single-task-at-a-time: opening one closes any other open menu.

### 1.8 Inline Text Editing

Clicking the task text (or pressing Enter/Space on it) replaces it with an `<input>` pre-filled with the current text. Pressing Enter or blurring saves; Escape cancels. Empty saves are ignored and the original text is restored.

### 1.9 Drag-to-Reorder

Only incomplete tasks can be reordered. Reordering is available when ≥ 2 incomplete tasks exist.

Workflow:
1. User taps "⋯" → **Move** to enter move mode for that task. The row is highlighted purple. A status banner tells the user to drag it.
2. The user presses and drags the row. A 6 px threshold before drag officially starts.
3. While dragging, the row floats (position: fixed, updated via `requestAnimationFrame` loop) and a placeholder of equal height sits in the original position.
4. Other incomplete rows shift up/down with CSS `translateY` to preview where the drag will land (`getDragShiftY` function calculates per-row offsets).
5. Auto-scroll kicks in when the pointer is near the viewport edges (`getCombinedDragScrollDelta`).
6. On pointer-up, the preview index is committed via `reorderTaskToIndex`, which adjusts `sortOrder` values.
7. Tap "Done" button or tap outside to exit move mode without dragging.

### 1.10 "Pick My Next Task" Button

Located in the header actions row. Picks a random incomplete task, scrolls it into view (smooth), and highlights it with an animated SVG ring (`task-row__picked-ring-rect`) that pulses with a dashed stroke animation.

If the user completes the picked task, a **special "picked" celebration** fires instead of the normal one (see §3.3).

### 1.11 Clear Completed

A footer button "Clear completed" appears below the task list whenever any task is completed. Removes all completed tasks from state; `gardenProgressCount` is preserved.

### 1.12 Empty State

When the task list is empty, a decorative CSS-only flower (five petal `<span>` elements) is shown with the text "No tasks yet! / Add something sweet to do ✿".

---

## 2. Rendering the Garden Below

The garden is a persistent decorative band pinned to the bottom of the `app-shell`. It is always visible but grows richer as the user completes tasks.

### 2.1 Layout

```
app-shell
  └── app (task UI, scrolls up to reveal garden)
  └── garden-scene (position: sticky/fixed at bottom)
        ├── garden-scene__sky
        ├── garden-layer--grass  (CSS, stage-based visibility)
        └── GardenFlowerStrip
              └── garden-flower-scroll__viewport  (overflow-x scroll on iOS)
                    └── garden-flower-scroll__inner
                          ├── GardenFenceLayer  (picket fences, behind flowers)
                          ├── [flower cells × N]
                          └── GroundFlowerLayer (tiny scattered ground flowers)
```

`GardenScene` receives `completedCount`, all seven seed choices, and a `muted` flag. It computes layers, completed levels, and the active grower from pure functions.

### 2.2 Garden Progress & Level System

```
Level 1: tasks 1–3  (3 tasks to complete)
Level 2: tasks 4–8  (5 tasks)
Level 3: tasks 9–13 (5 tasks)
...every level after level 1 needs 5 completions.
```

`getGardenLevel(completedCount)` → current level number.  
`getGardenCycleProgress(completedCount)` → `{ planted, max }` — completions within the current level.  
`getLevelEndCompletionCount(level)` → total completions needed to finish a level.  
`getCompletedGardenLevels(completedCount)` → array of fully-finished level numbers.

`GARDEN_MAX_LEVEL = 12` is the cap shown in the header.

### 2.3 Seed Selection Flow

At each new level boundary a seed picker full-screen overlay appears. The mascot shows a prompt and the user picks one of two flower options. Their choice is saved to `localStorage` under a per-level key and is never overwritten.

| Level | Picker | Options |
|-------|--------|---------|
| 1 (starting) | `StartingSeedPicker` | Moon flower / Sun flower |
| 2 | `Level2SeedPicker` | Star flower / Saturn flower |
| 3 | `Level3SeedPicker` | Tulip / Cat grass |
| 4 | `Level4SeedPicker` | Puppy poppy / Wiggle wisteria |
| 5 | `Level5SeedPicker` | Pinwheel flower / Fire flower |
| 6 | `Level6SeedPicker` | First two seeds the player *didn't* choose in levels 1–5 |
| 7 | `Level7SeedPicker` | Toast flower / Jam flower (always this fixed pair) |

`getPendingSeedPicker` walks level order so that a user who cleared localStorage but had progress can backfill all missing seeds. Backfill mode shows different mascot messages.

After level 7, no more seed pickers appear (levels 8–9 have picket fences instead of new plants).

### 2.4 Flower Species — SVG Plants

All plants live in the `GardenFlowerStrip` as individual cells. Each cell is an SVG with viewBox `0 0 200 320`, ground line at y = 306 (`GARDEN_CELL_GROUND_Y`). Plants are rendered at `translate(100 306) scale(2)` so they anchor at ground level and scale up ×2.

Cell height is set with the CSS custom property `--flower-h` (a `dvh` percentage, capped at `--garden-band-height`):

| Seed | Target height (dvh) |
|------|---------------------|
| moonflower, starflower, tulip | 22 |
| sunflower, saturnflower, puppypoppy | 25 |
| jamflower | 26 |
| wigglewisteria, toastflower | 28 |
| pinwheelflower, fireflower | 30 |
| catgrass | 20 |

**Generic seeds** (moonflower, sunflower, starflower, saturnflower) share `GrowingSeedPlant`, which draws stem + leaves + bud/bloom SVG elements whose geometry scales with `SeedGrowthStage` (0–5).

**Specialty plants** (each a dedicated component):
- **TulipPlant** — closed tulip cup shape, green stem + leaves.
- **CatGrassPlant** — clusters of long grass blades; plays a short meow sound at growth stage 3+ when not muted.
- **PuppyPoppyPlant** — round poppy bloom with a small dog-tongue detail.
- **WiggleWisteriaPlant** — dangling cluster of small ellipses, animated wiggle on the stem.
- **PinwheelFlowerPlant** — tall stem (×2 height scale), multiple pinwheel blooms stacked vertically. Uses a taller cell viewBox so the top blooms (up to y = −102 in local space) fit without clipping.
- **FireFlowerPlant** — animated flame elements at the bloom; leaves anchored at stem, flames rise from the bloom top.
- **ToastFlowerPlant** — cartoon bread slice shape with a toasted face; each growth stage adds more detail. Needs cell clip (overflow: hidden) because artwork is wider than the stem.
- **JamFlowerPlant** — stacked jam jar shapes, each jar appears at a growth stage. Also needs cell clip.

Growth stages (0–5):
- 0: seed (dot in soil)
- 1: sprout emerging
- 2–4: stem and leaves growing, bud swelling
- 5: fully bloomed

### 2.5 Active Level Grower

While a level is in progress (planted < max), the strip shows one extra "active grower" cell whose `growthStage` matches `getSeedGrowthStage(completedCount)`. This animates forward with each completion.

`getSeedGrowthStage` maps `planted` (0–5) → `SeedGrowthStage`.

### 2.6 Scrollable Flower Strip

When the strip has more than `FLOWERS_PER_SCROLL_PAGE = 3` flowers it becomes scrollable:
- The viewport is `display: block; overflow-x: auto; overflow-y: hidden; scrollbar-width: none`.
- The inner row is `display: flex; width: max-content; justify-content: flex-start`.
- Left/right arrow buttons appear at the strip edges. Each button scrolls by `clientWidth / 3` (one flower page width).
- On mount, on resize (`ResizeObserver`), and when the flower count changes, the viewport auto-scrolls to the rightmost position (newest flower).
- `savedScrollLeftRef` preserves the user's scroll position across resize events so the layout doesn't jump during garden reveal scroll.
- Touch pan is enabled via `touch-action: pan-x`.

### 2.7 Ground Flower Layer

Small decorative SVG flowers (radius ~10–16 px) are scattered behind the main stem flowers in the gaps between them.

- `collectGroundFlowerGaps` measures each flower cell's bounding rect and builds "safe zones" (18% of cell width around each stem center). Gaps are the horizontal spans outside those zones.
- `planGaps` distributes `completedCount` flower indices across gaps weighted by usable width, so wider areas get proportionally more flowers.
- Each flower's position is deterministic per `completionIndex` using `mulberry32` PRNG (seed = index × 9973), with up to 32 attempts to maintain minimum spacing of 20 px between centers.
- Appearance (palette, scale 0.6–1.05, petal count 5–8, rotation ±12°) is also PRNG-derived per index.
- The newest flower (`completionIndex === completedCount`) gets the `garden-ground-flower--new` class which triggers a pop-in CSS animation.

### 2.8 Garden Reveal Animation

When a task completion advances the garden (new plant or growth stage), the page performs a "venetian blind" reveal:

1. The scroll position is saved. `window.scrollTo` moves the viewport so the garden is visible.
2. Every task row and the add-task form receives a `garden-reveal-slat` class with a CSS custom property `--blind-index`. A CSS animation (`venetianBlindLift`) lifts each slat upward with a stagger of ~58 ms per slat, total ~680 ms + stagger.
3. While the blind is lifting, the garden's `completedCount` is frozen at the *pre-completion* value (`gardenRevealHeldCount`) so the plant doesn't pop in before the reveal.
4. After `getGardenRevealGrowthStartDelayMs` (lift duration + 100 ms buffer), `gardenRevealGrowthUnlocked` is set true and the plant switches to its new growth stage with a CSS transition (~600 ms).
5. `getGardenAutoReturnDelayMs` (growth start + 600 ms transition + 1000 ms) later, the page auto-scrolls back to the saved position and the reveal exits.
6. A "Return to tasks" button appears during the reveal so the user can skip back immediately.

Reduced motion: the scroll and animation durations are zeroed; the garden updates instantly.

### 2.9 Picket Fence (Levels 8 and 9)

Starting at level 8 (task completions 34+) and level 9 (task completions 39+), completing a task grows a picket fence post instead of a new flower. Each level can produce up to 5 posts.

**Layout:**
- `GardenFenceLayer` renders two absolute `garden-fence-row` divs behind the flower cells inside the scroll inner container.
- Row `--level-8` sits above row `--level-9`; both span the full inner-row width.
- Post x-positions are spaced across the full row width (with small padding) using the same 5-slot spacing regardless of how many posts exist yet, so posts consistently land at the same x for each task.

**SVG (`PicketFenceSvg`):**
- Posts are drawn as pointed-top planks (path with a triangular peak) filled with a warm wood color, with subtle grain lines.
- Two horizontal rails connect each new post to the previous one (at y = 14 and y = 24 in the SVG coordinate space).
- Each post has a small five-petal flower emblem whose palette cycles based on post index and level number.
- A new post plays a `picket-fence__post--new` CSS pop-in animation (scale from 0.35 → 1, spring easing).

---

## 3. Other Important Parts

### 3.1 Sticky Header

`StickyKawaiiHeader` → `KawaiiMascot` renders a fixed header containing:

- **Mascot image** — a kawaii cat character (`kawaii-mascot.png`), animated with a hop when `dancing = true` (see §3.3).
- **Speech bubble** — appears beside the mascot when `speechVisible = true`. Fades in/out with a CSS transition. Used for motivational phrases, level-up messages, seed prompts, and error messages. Auto-dismisses after 3200 ms.
- **Title image** — `header-title.png` ("Flower To Do").
- **Garden level display** — large text showing current level number.
- **Garden progress meter** — a row of pip dots (filled vs. unfilled), one per task needed for the current level (3 for level 1, 5 thereafter). Accessible `<div role="progressbar">` with aria labels.
- **"I'll pick your next task!" button** — visible once the task list has at least one item. Disabled when all tasks are completed.
- **Mute toggle button** — a speaker icon button that toggles audio globally. State is kept in React state (not persisted across sessions).

### 3.2 Motivational Phrases

A pool of 12 short phrases (`MOTIVATIONAL_PHRASES`). `pickMotivationalPhrase(exclude)` returns a random phrase that is not the same as the last shown. The mascot shows a phrase after every task completion via `showMascotCheer`.

### 3.3 Celebration Effects

**Normal celebration** (every task completion that isn't the "picked" task):
- Mascot speech bubble with a motivational phrase.
- `SpiralCelebration`: 20 particles (hearts + small flowers) burst outward from the mascot in a spiral, each with three trailing shadow copies. Animates for 7 seconds via CSS custom properties. Disabled with `prefers-reduced-motion`.

**Picked-task celebration** (when the user completes the task the mascot picked):
- Speech bubble: "You did the one I picked! So proud of you! ⭐"
- Mascot dances (hop animation on the mascot image, `mascot--dancing` class).
- A cheerful 7-note ascending tune plays via Web Audio API.
- After the dance completes, `StarBurst` fires: 20 star-shaped particles expand outward from the mascot using CSS clip-path polygon stars.

**Level-up message** (when `isGardenLevelComplete`):
- Speech bubble: "Garden level up! 🌸✨ Your flower has fully bloomed!"

All celebration effects measure the mascot's screen position (`mascotCelebration.ts`) to set the `originX/Y` of particle bursts.

### 3.4 Falling Sakura Background

32 SVG cherry blossom petals fall continuously behind everything. Each blossom has:
- A deterministic screen x-position (uniformly spaced with ±jitter).
- Random fall duration (22–40 s), negative start delay (so they're already mid-screen on load).
- CSS variables for drift, spin, sway, and tilt animations.
- Two color variants (light pink / deep pink), each with highlight overlay and stamens.

Rendered as `null` when `prefers-reduced-motion` is true.

### 3.5 Web Audio API Sound System

All sound is synthesized (no audio files) using the Web Audio API. A single shared `AudioContext` is reused across calls.

**iOS unlock pattern:** `unlockAudio()` must be called inside a user gesture. It resumes the context and plays a silent 1-sample buffer to allow sounds scheduled in the same tick (and future ticks) to play on iOS Safari.

| Event | Sound |
|-------|-------|
| Add task | Three-note ascending triangle+sine chime (G4, B4, D5) |
| Task grow | Four ascending sine tones spread across the grow duration |
| Task bloom | Bell strike with two harmonics |
| Task drop to bottom | Two-note bell at a lower register |
| Uncomplete — wilt | Descending triangle + sine tones |
| Uncomplete — retract | Three descending sine tones across the retract duration |
| Picked-task celebration | Seven-note melody (C5 → B5) alternating triangle/sine |
| Cat grass growth | Short meow (triangle wave descending sequence) |

Pitch of grow/bloom/wilt sounds increases slightly with `completionIndex` (earlier tasks sound lower, later tasks higher).

All completion sounds are pre-scheduled inside the gesture handler so iOS does not block them even though they play hundreds of milliseconds later.

### 3.6 Accessibility & Reduced Motion

- `prefers-reduced-motion: reduce` is detected via a `window.matchMedia` listener in `usePrefersReducedMotion()`.
- When true: all CSS animations and transitions on celebration particles, garden reveal slats, and petal blooms are set to `animation: none` / `transition: none` via a dedicated media-query block in `index.css`.
- Task completion and uncompletion animations are zeroed (instant state changes).
- Garden reveal scroll and growth are instant.
- Falling sakura and spiral/star celebrations are not rendered.
- Mascot still speaks but does not dance.
- The garden progress meter, garden level display, and speech bubble use `role="progressbar"`, `role="status"`, `aria-live="polite"`, and `aria-label` attributes.
- Checkbox `aria-label` uses task text: "Mark 'X' as complete / as not done".
- The entire garden section is `aria-hidden`.

### 3.7 Persistence (localStorage)

| Key | Content |
|-----|---------|
| `kawaii-todo-tasks` | JSON `{ tasks: Task[], gardenProgressCount: number }` |
| `kawaii-todo-starting-seed` | `StartingSeed` string |
| `kawaii-todo-level2-seed` | `Level2Seed` string |
| `kawaii-todo-level3-seed` | `Level3Seed` string |
| `kawaii-todo-level4-seed` | `Level4Seed` string |
| `kawaii-todo-level5-seed` | `Level5Seed` string |
| `kawaii-todo-level6-seed` | `GardenSeed` string |
| `kawaii-todo-level7-seed` | `Level7Seed` string |

Each seed hook (`useStartingSeed`, `useLevel2Seed`, …) independently reads from localStorage on mount and exposes `{ seed, hydrated, choose, reset }`. The app waits for all 8 hydration flags before rendering seed pickers (to avoid flashing an already-chosen picker on load).

`gardenProgressCount` is inferred as `max(storedCount, max(completionIndex across tasks))` so it survives partial state corruption.

### 3.8 Developer Panel

Rendered only when `import.meta.env.DEV` is true. A floating "DEV" button opens `DevPanel`:
- **Set garden progress** — a number input and Apply button that calls `setGardenProgressForDev(n)`. This updates `gardenProgressCount` and un-completes any tasks whose `completionIndex > n`.
- **Clear seeds from level** — a number input (1–7) that resets all seed choices at and above that level to null.
- **Reset everything** — resets progress to 0 and all seeds.

This allows quickly testing any garden level without completing dozens of tasks.

### 3.9 Project Structure

```
src/
  App.tsx                         # Root component, all state wiring
  main.tsx                        # ReactDOM.createRoot entry point
  index.css                       # All CSS (no CSS modules)
  assets/
    header-title.png
    kawaii-mascot.png
  components/
    StickyKawaiiHeader.tsx        # Header wrapper
    KawaiiMascot.tsx              # Mascot + speech + controls
    MascotImage.tsx               # <img> wrapper for mascot PNG
    MuteToggleButton.tsx          # Speaker icon toggle
    GardenProgressMeter.tsx       # Pip-based progress bar
    TaskList.tsx                  # Task list + drag orchestration
    TaskRow.tsx                   # Individual task row + flower SVG
    StemStrikeSVG.tsx             # Animated stem + petal SVG
    FlowerSVG.tsx                 # Reusable flower shape SVG
    TaskActionMenu.tsx            # ⋯ popup menu
    DeleteConfirmDialog.tsx       # Delete confirmation modal
    ReorderMoveHandle.tsx         # Drag handle visual
    GardenScene.tsx               # Garden container (layers + strip)
    GardenFlowerStrip.tsx         # Scrollable flower row + arrows
    GardenFenceLayer.tsx          # Picket fence renderer
    PicketFenceSvg.tsx            # SVG fence posts + rails + emblems
    GroundFlowerLayer.tsx         # Scattered ground flower manager
    GroundFlower.tsx              # Individual ground flower SVG
    GrowingSeedPlant.tsx          # Generic seed plant SVG (dispatches to species)
    TulipPlant.tsx
    CatGrassPlant.tsx
    PuppyPoppyPlant.tsx
    WiggleWisteriaPlant.tsx
    PinwheelFlowerPlant.tsx
    FireFlowerPlant.tsx
    ToastFlowerPlant.tsx
    JamFlowerPlant.tsx
    GardenRevealReturnButton.tsx  # "Return to tasks" button during reveal
    StartingSeedPicker.tsx        # Seed picker overlays (one per level)
    Level2SeedPicker.tsx … Level7SeedPicker.tsx
    SeedChoiceIcon.tsx            # Shared seed option button + icon
    SpiralCelebration.tsx         # Heart/flower particle burst
    StarBurst.tsx                 # Star particle burst
    FallingSakuraPetals.tsx       # Continuous background sakura animation
    GardenSakuraTree.tsx          # (Optional decorative tree element)
    DevPanel.tsx                  # Developer tools overlay
  hooks/
    useTasks.ts                   # Task state, persistence, completion logic
    useStartingSeed.ts … useLevel7Seed.ts
  lib/
    plantedGarden.ts              # Core garden math, viewBox constants, slot positions
    gardenLevels.ts               # Level helpers (end count, max stage, completed levels)
    gardenProgress.ts             # Scene milestone count, layer flags
    gardenReveal.ts               # Reveal timing constants and helpers
    gardenSeed.ts                 # GardenSeed union type + getSeedForGardenLevel
    gardenSeedCatalog.ts          # Seed pairs, display names, CSS classes, picker options
    gardenSeedPickers.ts          # getPendingSeedPicker, isBackfillSeedPicker
    gardenFlowerStrip.ts          # FLOWERS_PER_SCROLL_PAGE, gardenStripNeedsScroll
    gardenFence.ts                # Fence level constants, post counts, post x-positions
    seedGrowth.ts                 # SeedGrowthStage type, palettes, growth metrics
    growthTier.ts                 # GrowthTier (per-completion petal/duration/color data)
    groundFlowers.ts              # Gap detection, PRNG placement, appearance generation
    sortTasks.ts                  # sortTasksForDisplay, pinned-before-bottom logic
    sounds.ts                     # All Web Audio API synthesis functions
    dragAutoScroll.ts             # Auto-scroll delta when dragging near edges
    dragPreviewShift.ts           # Per-row Y shift during drag preview
    mascotCelebration.ts          # Measure mascot screen position for particle origin
    motivationalPhrases.ts        # Phrase pool + picker
    startingSeed.ts … level7Seed.ts  # Per-level seed type + localStorage helpers
```
