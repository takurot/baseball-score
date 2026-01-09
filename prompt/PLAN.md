# Ultra Hard UI/UX Improvement Plan

This plan aims to transform the current application into a **premium, high-performance, and visually stunning** experience. We will move beyond simple "Material UI defaults" to a custom design system with rich animations, improved usability, and a robust codebase architecture.

> **Note**: All user-facing text (labels, buttons, messages, notifications) should be in **Japanese (日本語)**. Code comments and variable names remain in English.

## 1. Visual Design Overhaul (The "Wow" Factor)

### Upgrade Theme System (`src/theme`)
- **Typography**: Replace default fonts with **[Inter](https://fonts.google.com/specimen/Inter)** (UI) and **[Outfit](https://fonts.google.com/specimen/Outfit)** (Headings/Scoreboard) for a modern, clean look.
- **Color Palette**: 
  - Define a **Semantic Palette** in `tokens.ts`. 
  - **Primary**: Deep Royal Blue (`#2563EB`) -> Electric Blue gradient. 
  - **Background**: subtle mesh gradients or deep slate for Dark Mode.
  - **Surface**: Glassmorphism (blur + transparency) for cards and modals.
- **Component Styling**:
  - **Buttons**: Rounded-pill shapes, subtle shadow glows, active press scales.
  - **Cards**: `backdrop-filter: blur(10px)`, soft borders, float animations.

### Animations & Micro-interactions
- **Library**: Integrate **`framer-motion`**.
- **Transitions**: Smooth fade-in/slide-up for page switching (Scoreboard <-> History).
- **Feedback**: 
  - "Pulse" effect when runs are scored.
  - "Shake" effect for errors.
  - Confetti explosion for "Game Over" / Win state.

## 2. Structural & Architectural Refactoring

### Deconstruct `MainApp.tsx` (The Monolith)
Currently, `MainApp.tsx` handles too much. We will slice it into:
- **`layouts/AppLayout.tsx`**: Handles logical structure (Header, Navigation, Main Content Area).
- **`features/Scoreboard`**: The Scoreboard logic and display.
- **`features/GameControl`**: Evaluation and input buttons.
- **`features/History`**: The log of plays.
- **`hooks/useGameState.ts`**: Extract complex state logic (reducer pattern recommended for strictly controlled state transitions).

### Navigation
- **Mobile**: Replace top Tabs with a **Bottom Navigation Bar** (floating, glass style).
- **Desktop**: Clean Top Navigation with active state indicators.

## 3. Usability & UX Enhancements

### Scoreboard (Hero Component)
- **Visuals**: Make it look like a real stadium scoreboard. LED-style font for numbers?
- **Responsiveness**: Auto-scale font sizes fitting the screen width perfectly.
- **Visibility**: Always pin vital stats (Run, Out, Inning) to the top/bottom on mobile.

### Input Experience
- **Mobile-First Input**: 
  - Large touch targets (min 44px).
  - Swipe gestures for History deletion?
  - **Modal Forms**: `AtBatForm` should be a bottom sheet on mobile (using `Drawer`) instead of a center dialog.

### Feedback Loop
- **Toast Notifications**: Replace simple alerts with **`notistack`** or **`sonner`**. 
- Top-center toasts for "Game Saved", "Player Added".

## 4. Accessibility (a11y)
- **Contrast**: Ensure WCAG AA compliance for all new colors.
- **Keyboard Nav**: Full focus management for modals and menus.
- **Screen Reader**: `aria-live` regions for Score updates (so blind users hear "Score changes to 3-1").

## Implementation Roadmap

1.  **Foundation**: Install deps (`framer-motion`, new fonts), setup `theme/tokens.ts`.
2.  **Refactor**: Extract `MainApp` logic into `useGameState` hook.
3.  **Layout**: Build `AppLayout` and new Navigation.
4.  **Components**: Rebuild `ScoreBoard` and `ControlPanel` with new design system.
5.  **Polish**: Add animations and verify a11y.

---

## 5. Additional UI/UX Improvements

### Streamlined Team Creation (Default 9 Players)
Currently, users must register players one by one when creating a team. Since baseball requires exactly 9 players, pre-populate the roster with 9 default players.

- **Default Player Generation**:
  ```
  #1 Batter (CF)    #6 Batter (1B)
  #2 Batter (2B)    #7 Batter (LF)
  #3 Batter (SS)    #8 Batter (C)
  #4 Batter (3B)    #9 Batter (P)
  #5 Batter (RF)
  ```
- **Inline Editing**: Tap player name to rename instantly
- **Drag & Drop**: Reorder batting lineup via swipe gestures
- **Add/Remove Players**: Easy management of pinch hitters and bench players

### Quick Input Panel (Faster UX)

| Problem | Solution |
|---------|----------|
| Manual input for every at-bat is tedious | **One-tap buttons**: Strikeout, Walk, Ground Out, Fly Out, etc. |
| Player selection is cumbersome | **Recently used players** suggested at top |
| Input mistakes are hard to fix | **Undo/Redo** buttons in toolbar |

### Enhanced Scoreboard Visuals

```
┌──────────────────────────────────────────┐
│  ⚾ Team A  vs  Team B                   │
├────┬───┬───┬───┬───┬───┬───┬───┬───┬────┤
│    │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9  │
├────┼───┼───┼───┼───┼───┼───┼───┼───┼────┤
│ A  │ 0 │ 1 │ 0 │ 2 │ █ │ - │ - │ - │ -  │
│ B  │ 0 │ 0 │ 1 │ - │ - │ - │ - │ - │ -  │
└────┴───┴───┴───┴───┴───┴───┴───┴───┴────┘
      BSO: ●○○ ●● ○○    R:3  H:5  E:0
```

- **BSO Indicator**: LED-dot style visuals for Ball, Strike, Out
- **Diamond Diagram**: SVG visualization of baserunners
- **Score Animation**: Count-up effect when runs are scored

### Offline Support (PWA Enhancement)

- **Service Worker**: Enable offline gameplay
- **IndexedDB**: Local persistence → Sync with Firestore when back online
- **Add to Home Screen**: Install prompt banner

### Statistics Dashboard

- **Individual Stats**: Batting average, OPS, OBP displayed with charts (recharts)
- **Team Stats**: Win/loss history, scoring trends
- **Achievement Badges**: Notifications for "First Home Run", "Shutout Win", etc.

### Sharing & Export Features

- **SNS Share**: Auto-generate OGP images for game results (html2canvas)
- **CSV Export**: Export score data for spreadsheet analysis
- **Spectator Mode**: Read-only page via unique game URL

### Dark/Light Mode Improvements

- **Auto Switch by Time**: Automatic dark mode at sunset
- **High Contrast Mode**: Optimized for outdoor use
- **True Black**: Pure black theme for OLED displays

---

## 6. Additional Technology Recommendations

| Category | Recommended Library |
|----------|---------------------|
| State Management | **Zustand** or **Jotai** (lightweight Redux alternative) |
| Forms | **React Hook Form + Zod** (validation) |
| E2E Testing | **Playwright** (test score input flows) |
| Type Safety | **Zod schemas** shared with Firestore types |

---

## Updated Implementation Roadmap

1. **Phase 1 - Foundation + Quick Wins**
   - Install deps (`framer-motion`, fonts, `zustand`)
   - Setup `theme/tokens.ts`
   - **Default 9 Players feature** ← Top Priority
   - Undo/Redo functionality

2. **Phase 2 - Architecture**
   - Extract `MainApp` → `useGameState` hook
   - Build `AppLayout` and new Navigation
   - Quick Input Panel

3. **Phase 3 - Visual Polish**
   - Rebuild `ScoreBoard` with LED-style design
   - BSO indicator + Diamond SVG
   - Animations (score pulse, confetti)

4. **Phase 4 - PWA & Offline**
   - Service Worker setup
   - IndexedDB local cache
   - Background sync

5. **Phase 5 - Analytics & Social**
   - Statistics dashboard (recharts)
   - SNS share with OGP
   - CSV export

---

## Prompt for Execution

To proceed, simply ask:
> "Start implementing Phase 1 (Default 9 Players + Undo/Redo) from PLAN.md."
