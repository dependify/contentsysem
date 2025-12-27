## 2024-05-23 - Unauthenticated DB Initialization Endpoint
**Vulnerability:** The `/api/init` endpoint was publicly accessible and could be used to re-initialize the database schema, potentially causing data loss or denial of service.
**Learning:** Convenience endpoints for setup should never be exposed in production code. Use separate scripts (like `scripts/init-database.js`) that require shell access.
**Prevention:** Ensure all administrative or setup endpoints are behind strict authentication or removed entirely from the runtime application.

## 2024-05-23 - Insecure Fail-Open Authentication
**Vulnerability:** The authentication middleware was configured to allow requests if the `CONTENTSYS_API_KEY` environment variable was missing, intending to support development convenience.
**Learning:** Security controls should always "fail closed". Missing configuration should result in denied access, not open access.
**Prevention:** Default deny. Explicitly require authentication credentials to be present and valid.
