# ContentSys Polish & UX Task Checklist

## f92: Responsive Mobile Layout
- [ ] Add mobile menu state to App.tsx
- [ ] Add hamburger menu button (mobile only)
- [ ] Make sidebar collapsible on mobile
- [ ] Add backdrop overlay
- [ ] Close menu on route navigation
- [ ] Add responsive CSS utilities

## f93: Accessibility Improvements
- [ ] Create SkipLink component
- [ ] Add ARIA landmarks to layout
- [ ] Add aria-current="page" to NavItem
- [ ] Add aria-label to icon buttons
- [ ] Enhance Modal with focus trap
- [ ] Add aria-invalid to inputs with errors
- [ ] Add role="alert" to Toast

## f94: Performance Optimizations
- [ ] Create PageLoader component
- [ ] Convert page imports to React.lazy()
- [ ] Wrap Routes in Suspense
- [ ] Create VirtualList component

## Verification
- [ ] Test at 375px, 768px, 1280px
- [ ] Verify hamburger menu
- [ ] Keyboard navigation test
- [ ] Lighthouse audit (90+)
- [ ] Check lazy chunk loading
