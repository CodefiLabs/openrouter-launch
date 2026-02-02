---
plan: thoughts/shared/plans/2026-02-02-out-of-scope-features-roadmap.md
started: 2026-02-02T00:00:00Z
status: complete
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

## Phase 2: Live Model Fetching (v0.3)

**Completed**: 2026-02-02
**Status**: COMPLETE
**Commits**: 83bd261
**Tests**: PASS

### Summary
Implemented live model fetching from OpenRouter API with intelligent caching. The script now fetches the full model catalog (300+ models) when jq is available, caches it for 1 hour at `~/.cache/openrouter/models.json`, and prioritizes coding models (Claude, GPT-4, Gemini, DeepSeek, Llama, Qwen, Mistral, Grok) in the selection menu. The system gracefully falls back through multiple levels: valid cache -> API fetch -> stale cache -> built-in model list. Added cross-platform support for cache age detection (macOS stat -f vs Linux stat -c) and a `--refresh-models` flag for forcing cache refresh.

### Sub-Agents Used
- 1x general-purpose (implementation)

### Manual Test Results
Pending - manual testing instructions provided

---

## Phase 3: Multiple Integrations (v0.4)

**Completed**: 2026-02-02
**Status**: COMPLETE
**Commits**: 7d94fd8
**Tests**: PASS

### Summary
Added support for two additional AI coding tools: Aider and OpenCode. Both tools have native OpenRouter support, making integration straightforward. Aider uses `OPENROUTER_API_KEY` environment variable and accepts models in `openrouter/<model>` format via the `--model` CLI flag. OpenCode also uses `OPENROUTER_API_KEY` and auto-detects OpenRouter when the key is present. The implementation includes detection functions for each tool, dedicated launch functions that set up the proper environment, and a short alias `oc` for OpenCode. The README was updated with comprehensive usage examples for both tools.

### Sub-Agents Used
- 1x general-purpose (implementation)

### Manual Test Results
Pending - manual testing instructions provided

---

## Phase 4: Distribution (v0.5)

**Completed**: 2026-02-02
**Status**: COMPLETE
**Commits**: fdbb6eb, 19f4cdd, f811291
**Tests**: PASS

### Summary
Implemented the complete distribution tooling for openrouter-launch v0.5.0. Created a curl|bash installer (`install.sh`) that downloads the latest release from GitHub, installs to `~/.local/bin` (user) or `/usr/local/bin` (with sudo), creates the `or-launch` symlink, and verifies the installation. Added a GitHub Actions release workflow (`.github/workflows/release.yml`) that triggers on version tags (v*), runs tests via shellcheck before release, and creates releases with auto-generated changelogs. Created a Homebrew formula template (`homebrew/openrouter-launch.rb`) for the external truefrontier/tap repository.

### Sub-Agents Used
- 1x general-purpose (implementation)

### Manual Test Results
Pending - manual testing instructions provided

---

## Phase 5: Node.js Rewrite (v1.0)

**Completed**: 2026-02-02
**Status**: COMPLETE
**Commits**: c9e8bfe, 66ee9d6, 91803cf, 8b73a63, 36f3765, 28023a8, eb5cb77
**Tests**: PASS

### Summary
Successfully ported the openrouter-launch CLI from bash to Node.js/TypeScript, creating a cross-platform solution that works on macOS, Linux, and Windows. The implementation preserves all functionality from the bash script including interactive model selection with pricing info, API key validation, model caching, and support for all three integrations (Claude Code, Aider, and OpenCode). The package uses modern Node.js patterns with ES modules, TypeScript for type safety, and popular npm packages (chalk, ora, prompts, commander) for improved UX with colored output, spinners, and interactive prompts.

### Sub-Agents Used
- 1x general-purpose (implementation)

### Manual Test Results
Pending - manual testing instructions provided

---

# Implementation Complete

**All 5 phases successfully implemented.**

| Phase | Version | Status |
|-------|---------|--------|
| Phase 1: Provider Preferences | v0.2 | COMPLETE |
| Phase 2: Live Model Fetching | v0.3 | COMPLETE |
| Phase 3: Multiple Integrations | v0.4 | COMPLETE |
| Phase 4: Distribution | v0.5 | COMPLETE |
| Phase 5: Node.js Rewrite | v1.0 | COMPLETE |

**Total Commits**: 13 commits across all phases
