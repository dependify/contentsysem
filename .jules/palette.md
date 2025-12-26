## 2024-05-23 - Accessibility in Shared Components
**Learning:** Consolidating UI primitives in `components/ui/index.tsx` is efficient for maintenance but risks propagating accessibility gaps (like missing ARIA labels) across the entire application if not caught early.
**Action:** When auditing a consolidated UI library, prioritize components with high reuse (like Toggle, Pagination, Button) as fixes there have the highest impact-to-effort ratio.

## 2024-05-23 - Toggle Component Semantics
**Learning:** Visual toggle switches often get implemented as `div` or generic `button` elements without proper state communication.
**Action:** Always ensure Toggle components use `role="switch"` and `aria-checked` to communicate state to screen readers, rather than just relying on visual color changes.
