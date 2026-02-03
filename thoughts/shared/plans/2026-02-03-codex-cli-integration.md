---
title: Codex CLI Integration
date: 2026-02-03
git_commit: 5078d9da7c729557fcfa30b272d4089ae2187063
git_branch: main
status: ready
research: thoughts/shared/research/2026-02-03-codex-gemini-cli-integration.md
---

# Codex CLI Integration Plan

## Overview

Add support for OpenAI's Codex CLI to `openrouter-launch`, enabling users to launch Codex with OpenRouter's 400+ model catalog using a single command.

**Complexity**: Low - Codex CLI has native OpenRouter support via `--provider openrouter` flag and `OPENROUTER_API_KEY` environment variable.

## Out of Scope

- Gemini CLI integration (blocked by API header incompatibility)
- Codex config file auto-generation (users can configure manually)
- Model mapping (Codex uses OpenRouter model IDs directly)

## Phase 1: Create Integration File

### Create `src/integrations/codex.ts`

Follow the established pattern from `aider.ts`:

```typescript
import spawn from 'cross-spawn';
import { logError, commandExists } from '../utils.js';
import type { Config } from '../config.js';

/**
 * Check if Codex CLI is installed
 */
export function checkCodexInstalled(): boolean {
  if (!commandExists('codex')) {
    logError('Codex CLI not found');
    logError('Install it: npm install -g @openai/codex');
    return false;
  }
  return true;
}

/**
 * Launch Codex CLI with OpenRouter configuration
 */
export function launchCodex(
  model: string,
  config: Config,
  passthroughArgs: string[]
): void {
  if (!checkCodexInstalled()) {
    process.exit(1);
  }

  // Codex uses OPENROUTER_API_KEY directly when --provider openrouter is set
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

  // Build args: --model and --provider first, then passthrough args
  const args = ['--model', model, '--provider', 'openrouter', ...passthroughArgs];

  // Spawn Codex, replacing this process
  const result = spawn.sync('codex', args, {
    env,
    stdio: 'inherit'
  });

  // Exit with the same code as Codex
  process.exit(result.status ?? 0);
}
```

### Success Criteria - Phase 1

#### Automated Verification:
- [ ] File exists: `src/integrations/codex.ts`
- [ ] TypeScript compiles: `npm run build`

---

## Phase 2: Wire Up Integration

### Modify `src/integrations/index.ts`

Add export for codex integration:

```typescript
export { launchClaude, checkClaudeInstalled } from './claude.js';
export { launchAider, checkAiderInstalled } from './aider.js';
export { launchOpenCode, checkOpenCodeInstalled } from './opencode.js';
export { launchCodex, checkCodexInstalled } from './codex.js';
```

### Modify `src/index.ts`

1. **Update import** (line 8):
```typescript
import { launchClaude, launchAider, launchOpenCode, launchCodex } from './integrations/index.js';
```

2. **Update Integration type** (line 13):
```typescript
type Integration = 'claude' | 'aider' | 'opencode' | 'codex';
```

3. **Add case to switch** (after line 128):
```typescript
case 'codex':
  integration = 'codex';
  break;
```

4. **Update error message** (line 132):
```typescript
logError('Supported: claude, aider, opencode, codex');
```

5. **Add launch case** (after line 212):
```typescript
case 'codex':
  launchCodex(selectedModel, config, passthroughArgs);
  break;
```

6. **Update argument description** (line 108):
```typescript
.argument('[integration]', 'Integration to launch: claude, aider, opencode (oc), codex', 'claude')
```

7. **Update help text examples** (after line 232):
```typescript
    openrouter-launch codex              # Launch Codex CLI
    openrouter-launch codex -m sonnet    # Launch Codex with Claude Sonnet
```

### Success Criteria - Phase 2

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Help text shows codex: `node dist/index.js --help | grep codex`

---

## Phase 3: Test Integration

### Manual Testing Steps

1. **Verify help text**:
   ```bash
   npm run build && node dist/index.js --help
   ```
   - Should show `codex` in integration list
   - Should show codex examples

2. **Test without Codex installed**:
   ```bash
   node dist/index.js codex -m sonnet
   ```
   - Should show "Codex CLI not found" error
   - Should show installation instructions

3. **Test with Codex installed** (if available):
   ```bash
   # Install Codex first
   npm install -g @openai/codex

   # Configure OpenRouter provider in ~/.codex/config.toml:
   # [model_providers.openrouter]
   # name = "OpenRouter"
   # base_url = "https://openrouter.ai/api/v1"
   # env_key = "OPENROUTER_API_KEY"
   # wire_api = "chat"

   # Then test
   node dist/index.js codex -m anthropic/claude-sonnet-4
   ```

### Success Criteria - Phase 3

#### Automated Verification:
- [ ] Build succeeds: `npm run build`
- [ ] Help contains codex: `node dist/index.js --help 2>&1 | grep -q codex`

#### Manual Verification:
- [ ] Without Codex: Shows helpful error message
- [ ] With Codex: Launches with correct model and provider flags

---

## Phase 4: Version Bump & Commit

### Update `package.json`

Bump version from `1.0.2` to `1.1.0` (minor version for new feature).

### Commit Message

```
feat: add Codex CLI integration

- Add src/integrations/codex.ts with launch and check functions
- Wire up codex integration in index.ts
- Update help text with codex examples

Codex CLI has native OpenRouter support via --provider flag.
Users need to configure OpenRouter provider in ~/.codex/config.toml.
```

### Success Criteria - Phase 4

#### Automated Verification:
- [ ] package.json version is 1.1.0: `grep '"version"' package.json`
- [ ] All changes committed: `git status`

---

## File Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/integrations/codex.ts` | Create | ~45 lines |
| `src/integrations/index.ts` | Modify | +1 line |
| `src/index.ts` | Modify | ~10 lines |
| `package.json` | Modify | 1 line (version) |

## Prerequisites

Users will need to:
1. Install Codex CLI: `npm install -g @openai/codex`
2. Configure OpenRouter provider in `~/.codex/config.toml`:
   ```toml
   [model_providers.openrouter]
   name = "OpenRouter"
   base_url = "https://openrouter.ai/api/v1"
   env_key = "OPENROUTER_API_KEY"
   wire_api = "chat"
   ```

## Risk Assessment

**Low risk** - This follows the exact same pattern as the existing Aider integration:
- Same environment variable (`OPENROUTER_API_KEY`)
- Same spawn pattern with `cross-spawn`
- Same passthrough args handling
- Model IDs are passed directly (no mapping needed like OpenCode)
