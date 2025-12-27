## 2024-05-22 - Base Component Accessibility
**Learning:** Base UI components like Toggle and Pagination often miss semantic ARIA roles in custom implementations.
**Action:** Audit core `ui/` directory first. Custom interactive elements must have explicit `role` and state attributes (e.g., `role="switch"`, `aria-checked`).

## 2024-05-22 - Pagination Navigation
**Learning:** Icon-only navigation buttons in pagination (ChevronLeft/Right) are invisible to screen readers without labels.
**Action:** Always add `aria-label="Previous page"` and `aria-label="Next page"` to pagination controls, and `aria-current="page"` to the active page number.
