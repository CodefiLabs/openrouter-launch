---
plan: thoughts/shared/plans/2026-02-02-out-of-scope-features-roadmap.md
started: 2026-02-02T00:00:00Z
status: in_progress
---

# Implementation Progress: Out-of-Scope Features Roadmap

**Plan**: thoughts/shared/plans/2026-02-02-out-of-scope-features-roadmap.md
**Started**: 2026-02-02

---

## Phase 1: Provider Preferences (v0.2)

**Completed**: 2026-02-02
**Status**: COMPLETE
**Commits**: 15ceb9a
**Tests**: PASS

### Summary
Implemented OpenRouter provider preferences for the openrouter-launch CLI. Added two new flags: `--allow-data-collection` which overrides the default "deny" behavior for provider data collection, and `--sort` which accepts `price`, `throughput`, or `latency` to control provider prioritization. These preferences are persisted in the config file (`DATA_COLLECTION` and `PROVIDER_SORT` variables) and displayed during launch. The implementation acknowledges that full enforcement currently requires OpenRouter account settings since Claude Code's Anthropic SDK doesn't support custom request body fields for provider preferences.

### Sub-Agents Used
- 1x general-purpose (implementation)

### Manual Test Results
Pending - manual testing instructions provided

---
