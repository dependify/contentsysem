# Implementation Plan: Polish & UX Features (f92-f94)

**Date:** 2025-12-20

## f92: Responsive Mobile Layout

### Changes to App.tsx
- Add mobile menu state with `useState`
- Add hamburger menu button (visible on mobile only with `md:hidden`)
- Make sidebar collapsible on mobile with slide-in animation
- Add backdrop overlay when mobile menu is open
- Auto-close menu on route navigation

### Changes to index.css
- Add responsive utility classes for mobile sidebar
- Mobile-first padding adjustments

---

## f93: Accessibility Improvements

### New Component: SkipLink.tsx
- Skip-to-content link for keyboard navigation

### Changes to App.tsx
- Add ARIA landmarks (`role="navigation"`, `main`, `banner`)
- Add `aria-current="page"` to active nav items
- Add `aria-label` to icon buttons

### Changes to components/ui/index.tsx
- Modal: Focus trap, `aria-modal`, `role="dialog"`
- Input: `aria-invalid` when error
- Toast: `role="alert"`, `aria-live="polite"`

---

## f94: Performance Optimizations

### New Component: PageLoader.tsx
- Loading fallback for Suspense

### Changes to App.tsx
- Convert page imports to `React.lazy()`
- Wrap Routes in `Suspense` boundary

### New Component: VirtualList.tsx
- Virtualized list for large data sets using Intersection Observer

---

## Verification

1. Test responsive layout at 375px, 768px, 1280px
2. Verify hamburger menu works on mobile
3. Tab through app with keyboard
4. Run Lighthouse accessibility audit (target: 90+)
5. Check lazy chunks load on navigation (Network tab)
