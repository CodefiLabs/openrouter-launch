---
title: Codex CLI and Gemini CLI Integration Research
date: 2026-02-03
git_commit: 5078d9da7c729557fcfa30b272d4089ae2187063
git_branch: main
topic: Adding Codex CLI and Gemini CLI support to openrouter-launch
tags: [codex, gemini, cli, integration, openrouter]
---

# Codex CLI and Gemini CLI Integration Research

## Executive Summary

This document analyzes what it would take to add **Codex CLI** (OpenAI) and **Gemini CLI** (Google) support to `openrouter-launch`.

| CLI | OpenRouter Compatible | Integration Effort | Recommended |
|-----|----------------------|-------------------|-------------|
| **Codex CLI** | Yes - Native support | Low | Yes |
| **Gemini CLI** | Partial - Via proxy or fork | Medium-High | Maybe |

## Current Architecture

The `openrouter-launch` tool currently supports three integrations:

1. **Claude Code** (`src/integrations/claude.ts:22-63`)
   - Sets `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL` env vars
   - Spawns `claude` command with passthrough args

2. **Aider** (`src/integrations/aider.ts:20-58`)
   - Sets `OPENROUTER_API_KEY` env var
   - Passes model as `openrouter/<model>` via `--model` flag

3. **OpenCode** (`src/integrations/opencode.ts:63-113`)
   - Sets `OPENROUTER_API_KEY` env var
   - Requires model mapping from OpenRouter format to OpenCode internal format
   - Uses `--model` flag when mapping exists

### Integration Pattern

Each integration follows this pattern:
1. `check<Tool>Installed()` - Verify CLI is available
2. `launch<Tool>(model, config, passthroughArgs)` - Configure and spawn
3. Export from `src/integrations/index.ts`
4. Add case to switch statement in `src/index.ts:204-214`

---

## Codex CLI Integration

### Overview

OpenAI's **Codex CLI** is an open-source coding assistant with **native OpenRouter support** via its flexible provider configuration system.

- **Command**: `codex`
- **Installation**: `npm install -g @openai/codex`
- **GitHub**: https://github.com/openai/codex
- **Config file**: `~/.codex/config.toml`

### OpenRouter Compatibility

Codex CLI **fully supports OpenRouter** through its model provider configuration:

```toml
# ~/.codex/config.toml
model = "anthropic/claude-sonnet-4"
model_provider = "openrouter"

[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "chat"
```

### Integration Approach

**Recommended: Environment-based configuration**

Codex CLI reads:
- `OPENROUTER_API_KEY` - API key (via `env_key` in config)
- `--model` / `-m` flag - Model selection
- `--provider` / `-p` flag - Provider selection

**Implementation Strategy:**

```typescript
// src/integrations/codex.ts
export function launchCodex(
  model: string,
  config: Config,
  passthroughArgs: string[]
): void {
  if (!checkCodexInstalled()) {
    process.exit(1);
  }

  const env = {
    ...process.env,
    OPENROUTER_API_KEY: config.OPENROUTER_API_KEY
  };

  // Codex uses model name directly, provider specified separately
  const args = ['--model', model, '--provider', 'openrouter', ...passthroughArgs];

  const result = spawn.sync('codex', args, {
    env,
    stdio: 'inherit'
  });

  process.exit(result.status ?? 0);
}
```

### Complexity Assessment

| Factor | Assessment |
|--------|------------|
| API Compatibility | Native OpenRouter support |
| Model Format | Uses OpenRouter model IDs directly |
| Environment Variables | Standard `OPENROUTER_API_KEY` |
| CLI Flags | Standard `--model`, `--provider` |
| **Integration Effort** | **Low** |

### Requirements

1. User must have Codex CLI installed (`npm install -g @openai/codex`)
2. User should have OpenRouter provider configured in `~/.codex/config.toml` (or we document the setup)

---

## Gemini CLI Integration

### Overview

Google's **Gemini CLI** is designed primarily for Google's Gemini API with **limited custom endpoint support**.

- **Command**: `gemini`
- **Installation**: `npm install -g @google/gemini-cli`
- **GitHub**: https://github.com/google-gemini/gemini-cli
- **Config file**: `~/.gemini/settings.json`

### OpenRouter Compatibility

Gemini CLI has **partial/indirect OpenRouter support**:

1. **Via LiteLLM Proxy** (Recommended by community)
   - Set `GOOGLE_GEMINI_BASE_URL` to LiteLLM proxy URL
   - LiteLLM handles translation to OpenRouter

2. **Via Third-Party Fork**
   - `@chameleon-nexus-tech/gemini-cli-openrouter` package
   - Different command/env vars, not a drop-in replacement

3. **Direct Integration Challenges**:
   - API key header: Gemini uses `x-goog-api-key`, OpenRouter uses `Authorization: Bearer`
   - Response format differences
   - No official custom endpoint documentation

### Integration Approach Options

**Option A: Proxy-based (Complex)**
```typescript
// Would require bundling/starting a LiteLLM proxy
// Not recommended - too complex for this tool's scope
```

**Option B: Direct attempt (Experimental)**
```typescript
// src/integrations/gemini.ts
export function launchGemini(
  model: string,
  config: Config,
  passthroughArgs: string[]
): void {
  if (!checkGeminiInstalled()) {
    process.exit(1);
  }

  // Map OpenRouter model to Gemini-style name
  const geminiModel = mapToGeminiModel(model);

  const env = {
    ...process.env,
    GOOGLE_GEMINI_BASE_URL: 'https://openrouter.ai/api/v1',
    GEMINI_API_KEY: config.OPENROUTER_API_KEY  // May not work due to header format
  };

  const args = ['--model', geminiModel, ...passthroughArgs];

  const result = spawn.sync('gemini', args, {
    env,
    stdio: 'inherit'
  });

  process.exit(result.status ?? 0);
}
```

### Complexity Assessment

| Factor | Assessment |
|--------|------------|
| API Compatibility | Incompatible headers (`x-goog-api-key` vs `Authorization: Bearer`) |
| Model Format | Different naming conventions |
| Environment Variables | Non-standard for OpenRouter |
| CLI Flags | Standard, but model names differ |
| **Integration Effort** | **High** (may not work at all) |

### Blockers

1. **API Key Header Mismatch**: Gemini CLI sends `x-goog-api-key` header, OpenRouter expects `Authorization: Bearer`
2. **No Official Custom Endpoint Support**: Feature requested but not implemented
3. **Response Schema Differences**: Unknown if OpenRouter responses match Gemini's expected format

---

## Recommendations

### 1. Add Codex CLI Support (Recommended)

**Effort**: Low
**Value**: High

Implementation:
1. Create `src/integrations/codex.ts` following existing patterns
2. Add `codex` case to `src/index.ts` switch statement
3. Export from `src/integrations/index.ts`
4. Update help text with Codex example
5. Document that users need OpenRouter provider in their `~/.codex/config.toml`

### 2. Gemini CLI Support (Not Recommended Yet)

**Effort**: High
**Value**: Low (may not work)

The header incompatibility is a fundamental blocker. Options:
- **Wait**: Monitor GitHub issues for official custom endpoint support
- **Fork**: Use the `@chameleon-nexus-tech/gemini-cli-openrouter` fork (different tool)
- **Proxy**: Require users to set up LiteLLM proxy (too complex)

---

## Implementation Plan for Codex CLI

### Files to Create

**`src/integrations/codex.ts`**:
```typescript
import spawn from 'cross-spawn';
import { logError, commandExists } from '../utils.js';
import type { Config } from '../config.js';

export function checkCodexInstalled(): boolean {
  if (!commandExists('codex')) {
    logError('Codex CLI not found');
    logError('Install it: npm install -g @openai/codex');
    logError('Then configure OpenRouter provider in ~/.codex/config.toml');
    return false;
  }
  return true;
}

export function launchCodex(
  model: string,
  config: Config,
  passthroughArgs: string[]
): void {
  if (!checkCodexInstalled()) {
    process.exit(1);
  }

  const env = {
    ...process.env,
    OPENROUTER_API_KEY: config.OPENROUTER_API_KEY
  };

  console.error('');
  console.error('Launching Codex CLI with OpenRouter...');
  console.error(`  Model: ${model}`);
  console.error(`  Provider: openrouter`);
  console.error(`  Data collection: ${config.DATA_COLLECTION}`);
  if (config.PROVIDER_SORT) {
    console.error(`  Provider sort: ${config.PROVIDER_SORT}`);
  }
  console.error('');

  const args = ['--model', model, '--provider', 'openrouter', ...passthroughArgs];

  const result = spawn.sync('codex', args, {
    env,
    stdio: 'inherit'
  });

  process.exit(result.status ?? 0);
}
```

### Files to Modify

**`src/integrations/index.ts`**:
```typescript
export { launchClaude, checkClaudeInstalled } from './claude.js';
export { launchAider, checkAiderInstalled } from './aider.js';
export { launchOpenCode, checkOpenCodeInstalled } from './opencode.js';
export { launchCodex, checkCodexInstalled } from './codex.js';  // Add
```

**`src/index.ts`**:
- Import `launchCodex`
- Add `'codex'` to `Integration` type
- Add case in switch for `'codex'` integration
- Update help text with Codex examples

---

## Sources

### Codex CLI
- [Codex CLI Documentation](https://developers.openai.com/codex/cli/)
- [GitHub - openai/codex](https://github.com/openai/codex)
- [Configuration Reference](https://developers.openai.com/codex/config-reference/)
- [OpenRouter Configuration Example](https://github.com/feiskyer/codex-settings/blob/main/configs/openrouter.toml)

### Gemini CLI
- [Gemini CLI Documentation](https://geminicli.com/docs/)
- [GitHub - google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
- [GitHub Issue #1679 - Custom API Endpoint](https://github.com/google-gemini/gemini-cli/issues/1679)
- [LiteLLM Gemini CLI Tutorial](https://docs.litellm.ai/docs/tutorials/litellm_gemini_cli)
- [OpenRouter Fork](https://www.npmjs.com/package/@chameleon-nexus-tech/gemini-cli-openrouter)
