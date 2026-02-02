# Product Requirements Document: openrouter-launch

**Version:** 1.0  
**Date:** February 2, 2025  
**Author:** Kevin Kirchner / True Frontier

---

## Problem Statement

Developers want to use AI coding tools (Claude Code, OpenCode, Codex) with OpenRouter's 400+ model catalog, but the current setup requires manually configuring 3+ environment variables and understanding the API compatibility layer. Ollama solved this for local models with their `ollama launch` command—we need the same simplicity for OpenRouter.

---

## Solution

A lightweight CLI tool called `openrouter-launch` (or `or-launch`) that:
1. Guides users through integration and model selection
2. Sets required environment variables automatically
3. Launches the chosen coding tool in one command

---

## User Stories

**As a developer**, I want to run `or-launch` and immediately start using Claude Code with any OpenRouter model, without reading docs or setting environment variables.

**As a team lead**, I want my team to easily switch between models for different tasks (cheap models for simple queries, premium for complex reasoning).

**As an educator**, I want a simple demo that shows students how to use AI coding tools without API key management complexity.

---

## Functional Requirements

### Core Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Interactive setup | Menu-driven selection of integration + model | P0 |
| API key management | Prompt for key if not set, validate it works | P0 |
| Launch integrations | Support Claude Code, OpenCode, Codex, Droid | P0 |
| Model selection | Show popular/recommended models with search | P1 |
| Config persistence | Save preferences to `~/.openrouter-launch` | P1 |
| Quick launch | `or-launch claude` skips menus, uses defaults | P1 |
| Cost display | Show model pricing before selection | P2 |

### Supported Integrations

| Tool | Command | Environment Variables |
|------|---------|----------------------|
| Claude Code | `claude` | ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN |
| OpenCode | `opencode` | Same pattern via config |
| Codex | `codex` | OPENAI_BASE_URL pattern |
| Droid | `droid` | TBD |

### Environment Variables Set

```bash
# For Claude Code (and Anthropic-compatible tools)
ANTHROPIC_BASE_URL="https://openrouter.ai/api"
ANTHROPIC_API_KEY=""
ANTHROPIC_AUTH_TOKEN="sk-or-xxx"
ANTHROPIC_MODEL="anthropic/claude-sonnet-4"  # optional override
ANTHROPIC_SMALL_FAST_MODEL="anthropic/claude-haiku"  # optional
```

---

## Technical Approach

### Option A: Bash Script (Recommended for MVP)
- ~100 lines
- Zero dependencies
- Works on macOS/Linux immediately
- Easy to understand and modify

### Option B: Node.js CLI
- Better UX (colors, spinners, fuzzy search)
- Cross-platform including Windows
- Can fetch live model list from OpenRouter API
- More maintainable long-term

### Option C: Go Binary
- Single binary distribution
- Fast startup
- Overkill for this scope

**Recommendation:** Start with Bash for MVP, port to Node if adoption warrants.

---

## User Flow

```
$ or-launch

🔌 OpenRouter Launch
━━━━━━━━━━━━━━━━━━━━

? Select integration:
  ❯ claude    - Claude Code (Anthropic's coding agent)
    opencode  - OpenCode (open source)
    codex     - Codex CLI (OpenAI)
    droid     - Droid (Factory)

? Select model:
  ❯ anthropic/claude-sonnet-4     ($3/$15 per 1M tokens)
    anthropic/claude-opus-4       ($15/$75 per 1M tokens)
    google/gemini-2.0-flash       ($0.10/$0.40 per 1M tokens)
    openai/gpt-4o                 ($2.50/$10 per 1M tokens)
    ↓ Show all 400+ models...

? OpenRouter API Key: sk-or-••••••••

✓ Launching Claude Code with anthropic/claude-sonnet-4...

╭──────────────────────────────────────────╮
│ ✻ Welcome to Claude Code!               │
│                                         │
│ Overrides (via env):                    │
│ • API Base URL: https://openrouter.ai/api│
╰──────────────────────────────────────────╯
```

---

## MVP Scope (v0.1)

**In Scope:**
- Interactive integration selection (Claude Code only for MVP)
- Hardcoded list of 10 popular models
- API key prompt with basic validation
- Config file for saving API key
- Launch Claude Code with correct env vars

**Out of Scope (v0.2+):**
- Live model fetching from OpenRouter API
- Model search/filtering
- Multiple integrations
- Cost tracking
- Windows support

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first launch | < 60 seconds |
| Setup steps eliminated | 3 → 1 |
| User errors from bad config | 0 |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OpenRouter API changes | Version lock base URL, monitor changelog |
| Tool detection fails | Provide manual override flag |
| API key security | Store in ~/.openrouter-launch with 600 permissions |

---

## Timeline

| Phase | Scope | Duration |
|-------|-------|----------|
| MVP | Bash script, Claude Code only | 2-4 hours |
| v0.2 | All integrations, config persistence | 1 day |
| v1.0 | Node CLI with full UX | 1 weekend |

---

## Open Questions

1. Should we support model aliases (e.g., "sonnet" → "anthropic/claude-sonnet-4")?
2. Include in Vibeathon toolkit or keep as standalone?
3. Publish to npm/homebrew or keep as GitHub-only?

---

## Appendix: Research Sources

- Ollama Launch: https://ollama.com/blog/launch
- OpenRouter Claude Code Integration: https://openrouter.ai/docs/guides/guides/claude-code-integration
- Existing proxies: y-router, claude-code-router, anthropic-proxy
