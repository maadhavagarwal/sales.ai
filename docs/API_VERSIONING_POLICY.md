# NeuralBI API Versioning & Deprecation Policy

## Versioning Rules
- All supported endpoints must be versioned under `/api/v{major}`.
- Current active version: `v1`.
- Legacy proxy routes may exist for compatibility but are not considered long-term contracts.

## Deprecation Policy
- Minimum customer notice before removal: **90 days**.
- Deprecation notices are published through:
  - In-app admin banner
  - Release notes
  - Enterprise admin activity stream
- Breaking changes are scheduled in a quarterly window.

## Sunset Process
1. Announce deprecation with effective and sunset dates.
2. Provide migration path and replacement endpoints.
3. Monitor usage of deprecated endpoints.
4. Remove endpoints after sunset date and final notice period.

## Backward Compatibility
- Non-breaking additions are allowed in current major version.
- Breaking response shape changes require new major version.
- Authentication and tenant context requirements must stay explicit across all versions.
