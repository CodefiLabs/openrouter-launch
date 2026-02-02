---
date: 2026-02-02T00:00:00-08:00
researcher: Claude
git_commit: 3be84294ee5f40b3e34cc0891175853dd5ae738b
branch: main
topic: "Out-of-Scope Features Implementation Analysis"
tags: [research, openrouter, roadmap, implementation-analysis]
status: complete
last_updated: 2026-02-02
---

# Research: Out-of-Scope Features Implementation Analysis

**Date**: 2026-02-02
**Git Commit**: 3be84294ee5f40b3e34cc0891175853dd5ae738b
**Branch**: main

## Research Question

What would it take to implement features currently marked as out-of-scope for the openrouter-launch project? This includes live model fetching, multiple integrations support, Windows compatibility, npm/Homebrew distribution, and OpenRouter configurable parameters.

## Summary

Most out-of-scope features are achievable with low-to-medium effort. Live model fetching requires adding a `jq` dependency. Multiple integrations vary widely in complexity (Aider is trivial, Claude Code needs a proxy). Windows support is best addressed through documentation first, with a Node.js rewrite planned for v1.0. Distribution via npm/Homebrew is straightforward with proper CI/CD.

## Detailed Findings

### 1. Live Model Fetching from OpenRouter API

**Current State:**
- OpenRouter provides `GET https://openrouter.ai/api/v1/models` endpoint
- Authentication is OPTIONAL for the models endpoint
- Returns comprehensive model data: id, name, pricing, context_length, architecture, supported_parameters

**Bash Implementation (Current Stack):**
- **Dependencies:** `curl` (existing) + `jq` (new)
- **Caching:** File at `~/.cache/openrouter/models.json` with 1-hour TTL
- **Code Estimate:** ~50 lines additional
- **Challenges:** Stale cache fallback, cross-platform `stat` differences (macOS vs Linux)

**Node.js Implementation (If Migrated):**
- Native `fetch()` in Node 18+
- OR official `@openrouter/sdk` package
- OR `openai` SDK with custom baseURL
- Built-in JSON handling simplifies caching

**Complexity:** Low-Medium

### 2. Multiple Integrations Support

**Tool Compatibility Matrix:**

| Tool | Status | Environment Variables | Config Location |
|------|--------|----------------------|-----------------|
| Claude Code | Needs proxy | ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN | ~/.claude/ |
| Aider | Easy | OPENROUTER_API_KEY + CLI flag | ~/.aider.conf.yml |
| OpenCode | Native support | OPENROUTER_API_KEY | ~/.config/opencode/ |
| Codex CLI | Medium | OPENAI_BASE_URL, OPENAI_API_KEY | ~/.codex/config.toml |
| Continue.dev | Medium | YAML config | ~/.continue/config.yaml |
| Cursor | Hard | Needs LiteLLM proxy | UI config |
| Droid | Unknown | TBD | ~/.factory/config.json |

**Minimal Approach (Current Bash):**
- Add detection functions: `which claude`, `which aider`, `which opencode`
- Add per-tool env var templates
- Add launch command mapping
- **Code Estimate:** ~100-150 lines additional

**Full Approach:**
- Config file format for per-tool preferences
- Tool-specific proxy setup helpers (Claude Code)
- **Code Estimate:** ~300+ lines with proxy setup

**Complexity:** Medium
- Each tool has different configuration patterns
- Claude Code specifically needs proxy or "Anthropic Skin" workaround

### 3. Windows Support

**Approach Comparison:**

| Approach | Effort | Cross-Platform | Notes |
|----------|--------|----------------|-------|
| WSL documentation | Minimal | WSL-only | Just docs update |
| Git Bash support | Low | Good | Minor path handling |
| PowerShell rewrite | High | Native Windows | ~400 lines to rewrite |
| Node.js rewrite | High | Excellent | Single codebase |
| Go rewrite | High | Excellent | Single binary |

**Key Challenges:**
- Environment variable syntax: `export VAR` vs `$env:VAR`
- Path handling: `/` vs `\`
- Config location: `~` vs `%USERPROFILE%`
- Process spawning differences

**Quick Fix (Documentation Only):**
- Document WSL installation
- Test with Git Bash, document limitations
- **Effort:** ~0 code changes, ~30 min docs

**Proper Fix (Node.js Rewrite):**
- Complete rewrite of ~400 lines
- Use `cross-spawn` for process spawning
- Use `os.homedir()` for cross-platform home
- Use `path.join()` for cross-platform paths
- **Effort:** ~1-2 days

**Industry Precedents:**
- GitHub CLI (`gh`): Go binary, cross-compiled
- Ollama: Platform-specific installers
- npm: JavaScript, single codebase

**Complexity:** Medium-High

### 4. npm/Homebrew Distribution

**npm Publishing Requirements:**
- `package.json` with: name, version, bin field, license
- Shebang `#!/usr/bin/env node` in entry file
- `npm publish` (or `npm publish --access public` for scoped)
- Maintenance: security updates, deprecation warnings

**For Bash Script via npm:**
- Wrap in Node.js shim that shells out to bash
- OR convert to Node.js entirely

**Homebrew Publishing Requirements:**
- Create tap: `brew tap-new truefrontier/homebrew-tap`
- Write formula (Ruby file) with: desc, homepage, url, sha256, install method
- Host releases on GitHub Releases
- Users install: `brew install truefrontier/tap/openrouter-launch`

**Alternative - curl | bash Pattern:**
```bash
curl -fsSL https://raw.githubusercontent.com/truefrontier/openrouter-launch/main/install.sh | bash
```
- Simpler setup
- Used by: nvm, bun, ollama
- Security concerns mitigated by HTTPS + GitHub

**Effort Estimates:**
- **npm (bash wrapper):** ~2-4 hours
- **Homebrew tap:** ~2-4 hours
- **Both with CI/CD:** ~1 day total

**Complexity:** Low-Medium

### 5. OpenRouter Configurable Parameters

**Provider Preferences:**
- `provider.sort`: `"price"` | `"throughput"` | `"latency"` - disables load balancing
- `provider.order`: `string[]` - explicit provider priority
- `provider.allow_fallbacks`: `boolean` - default true
- `provider.data_collection`: `"allow"` | `"deny"` - **User wants default "deny"**

**Other Configurable Parameters:**
- `provider.quantizations`: `["int4", "int8", "fp8", "fp16", "bf16"]`
- `provider.require_parameters`: `boolean`
- `provider.only` / `provider.ignore`: Provider whitelists/blacklists
- `transforms`: `["middle-out"]` or `[]`
- `reasoning.effort`: `"xhigh"` | `"high"` | `"medium"` | `"low"` | `"minimal"` | `"none"`

**Model Shortcuts:**
- `:nitro` - Sort by throughput
- `:floor` - Sort by price (cheapest)
- `:free` - Free tier with limits

**Headers for Attribution:**
- `HTTP-Referer` - App URL
- `X-Title` - App name

**Config File Additions:**
```bash
# ~/.openrouter-launch/config
PROVIDER_SORT="price"
DATA_COLLECTION="deny"
PROVIDER_QUANTIZATIONS="fp16,bf16"
HTTP_REFERER="https://myapp.com"
X_TITLE="My App"
```

**CLI Flags Additions:**
```
--sort price|throughput|latency
--no-data-collection
--quantization fp16
```

**Complexity:** Low-Medium

## Summary Table

| Feature | Complexity | Effort Estimate | Recommended Approach |
|---------|------------|-----------------|---------------------|
| Live model fetching | Low-Medium | 4-8 hours | Add jq dependency, implement caching |
| Multiple integrations | Medium | 1-2 days | Start with Aider + OpenCode (easy), then Claude Code |
| Windows support | Medium-High | Documentation: 30 min, Rewrite: 2-3 days | Document WSL first, plan Node.js rewrite for v1.0 |
| npm distribution | Low-Medium | 4-8 hours | Node.js wrapper + CI/CD |
| Homebrew distribution | Low-Medium | 4-8 hours | Tap + GitHub Releases |
| Provider preferences | Low | 2-4 hours | Add to config + pass through |
| Data collection deny default | Low | 30 min | Add default to config template |

## Recommended Implementation Order

1. **v0.2**: Provider preferences + data_collection default (quick wins)
2. **v0.3**: Live model fetching (jq dependency)
3. **v0.4**: Multiple integrations (Aider, OpenCode first)
4. **v0.5**: curl | bash installer + Homebrew tap
5. **v1.0**: Node.js rewrite for Windows + npm distribution

## Code References

- OpenRouter Models API: `https://openrouter.ai/api/v1/models`
- OpenRouter Provider Routing Docs: `https://openrouter.ai/docs/provider-routing`
- Model Shortcuts: `https://openrouter.ai/docs/model-shortcuts`

## Architecture Insights

- The current bash implementation is well-suited for quick iteration but will hit scaling limits with Windows support
- A Node.js rewrite would unify the codebase and enable npm distribution naturally
- The curl | bash pattern is industry-standard for developer tools and avoids package manager complexity

## Open Questions

- Should we support tool-specific model preferences (different default models for different tools)?
- Is there demand for a GUI/TUI for model selection?
- Should proxy setup for Claude Code be automated or documented as manual steps?
- What level of provider preference granularity do users actually need?
