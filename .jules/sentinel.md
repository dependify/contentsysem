## 2024-05-23 - Path Traversal in File Management
**Vulnerability:** Arbitrary file read/write vulnerability in `src/routes/adminRoutes.ts` via `../` in filename parameter.
**Learning:** `path.join` with user input is never safe without strict validation or checking the resolved path against a whitelist/base directory. Even absolute paths in user input can be dangerous if not handled, but here it was relative path traversal.
**Prevention:** Always validate filenames against a strict allowlist (e.g., alphanumeric + extension) or use `path.resolve` and check `startsWith` against the trusted base directory.

## 2024-05-23 - Insecure Default JWT Secret
**Vulnerability:** Application allowed starting in production mode without `JWT_SECRET`, falling back to a hardcoded 'dev-secret-key'.
**Learning:** "Fail open" defaults for security configuration are dangerous. Developers might forget to set secrets in new environments (e.g., staging/prod) and not realize the app is insecure.
**Prevention:** Fail fast and loud. Check critical security config at startup and crash if missing in production.
