## 2024-05-24 - Collapsed Sidebar Navigation
**Learning:** Collapsed sidebars often fail accessibility checks because links become icon-only without text labels. Screen readers read nothing or just "link".
**Action:** Always add `aria-label` and `title` to collapsed sidebar items. The `title` provides a tooltip for mouse users, and `aria-label` provides context for screen readers.

## 2024-05-24 - Toggle Switch Accessibility
**Learning:** Custom toggle switches built with `<button>` elements often lack semantic meaning.
**Action:** Use `role="switch"` and `aria-checked` attributes on the button element to ensure screen readers correctly identify the component as a toggle switch.
