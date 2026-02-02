---
date: 2026-02-02T16:25:56-0600
researcher: Claude
git_commit: 789594c4a000e908f2290c3ae81f5b5ded6a1329
branch: main
topic: "Why doesn't openrouter-launch's OpenCode integration respect the model that the model-picker chooses?"
tags: [research, codebase, opencode, model-picker, integrations]
status: complete
last_updated: 2026-02-02
---

# Research: OpenCode Model Picker Investigation

**Date**: 2026-02-02T16:25:56-0600
**Git Commit**: 789594c4a000e908f2290c3ae81f5b5ded6a1329
**Branch**: main

## Research Question

Why doesn't openrouter-launch's OpenCode integration respect the model that the model-picker chooses?

## Summary

The model IS selected correctly in openrouter-launch and logged to stderr, but it is NOT passed to the OpenCode CLI. The `launchOpenCode` function receives the model parameter but only passes the `OPENROUTER_API_KEY` environment variable and user passthrough arguments. Unlike `aider.ts` (which passes `--model openrouter/${model}`) and `claude.ts` (which sets `ANTHROPIC_MODEL` env var), `opencode.ts` does NOT actually use the model parameter to configure OpenCode.

## Detailed Findings

### Current opencode.ts Implementation

The `launchOpenCode` function in `src/integrations/opencode.ts:20-56` receives the model as a parameter but does not use it to configure OpenCode:

```typescript
export function launchOpenCode(
  model: string,  // <-- MODEL IS RECEIVED BUT NOT USED TO CONFIGURE OPENCODE
  config: Config,
  passthroughArgs: string[]
): void {
  // ...
  const env = {
    ...process.env,
    OPENROUTER_API_KEY: config.OPENROUTER_API_KEY
    // NOTE: No model configuration here!
  };

  // Model is only logged, not passed to OpenCode
  console.error(`  Model: ${model}`);
  console.error('Note: OpenCode may use its own default OpenRouter models');
  console.error('      unless you configure ~/.opencode.json with your preferred model.');

  // OpenCode spawned without model specification
  const result = spawn.sync('opencode', passthroughArgs, {
    env,
    stdio: 'inherit'
  });
}
```

Lines 20-56 of `src/integrations/opencode.ts` show the model is received as a parameter at line 21, logged at line 38, but never actually passed to OpenCode.

### How aider.ts Successfully Passes the Model

In `src/integrations/aider.ts:47-48`, Aider prepends `--model openrouter/${model}` to the CLI arguments:

```typescript
const aiderModel = `openrouter/${model}`;
const args = ['--model', aiderModel, ...passthroughArgs];
```

### How claude.ts Successfully Passes the Model

In `src/integrations/claude.ts:31-38`, Claude integration passes the model via the `ANTHROPIC_MODEL` environment variable:

```typescript
const env = {
  ...process.env,
  ANTHROPIC_BASE_URL: OPENROUTER_BASE_URL,
  ANTHROPIC_API_KEY: '',
  ANTHROPIC_AUTH_TOKEN: config.OPENROUTER_API_KEY,
  ANTHROPIC_MODEL: model  // <-- Model passed via env var
};
```

### OpenCode's Model Configuration Options

According to OpenCode documentation, the CLI accepts models via:

1. **CLI Flag (highest priority)**: `opencode --model openrouter/anthropic/claude-sonnet-4`
2. **Environment Variable**: Not officially supported for model selection
3. **Config File**: `~/.config/opencode/opencode.json` or `./.opencode.json`

```json
{
  "model": "openrouter/anthropic/claude-sonnet-4-5",
  "small_model": "openrouter/anthropic/claude-haiku-4-5"
}
```

### The Implementation Gap

The current implementation acknowledges this gap in the comments (lines 44-45):

```typescript
console.error('Note: OpenCode may use its own default OpenRouter models');
console.error('      unless you configure ~/.opencode.json with your preferred model.');
```

This means `opencode.ts` was deliberately shipped without model passthrough, relying on users to manually configure OpenCode's config file.

## Code References

- `src/integrations/opencode.ts:20-56` - launchOpenCode function (model not passed)
- `src/integrations/aider.ts:47-48` - Aider passes model via --model flag
- `src/integrations/claude.ts:31-38` - Claude passes model via ANTHROPIC_MODEL env var
- `src/index.ts:170-190` - Model selection logic
- `src/index.ts:211-212` - OpenCode integration call site

## Architecture Insights

```
openrouter-launch CLI
         |
         v
    src/index.ts:170-190
    selectModel() -> selectedModel
         |
         v
    src/index.ts:211-212
    launchOpenCode(selectedModel, config, passthroughArgs)
         |
         v
    src/integrations/opencode.ts:20-56
    launchOpenCode(model, config, passthroughArgs)
         |
         |  model is LOGGED but NOT PASSED
         |
         v
    spawn.sync('opencode', passthroughArgs, { env })
         |
         |  Only OPENROUTER_API_KEY is passed in env
         |  No --model flag added to args
         |
         v
    OpenCode uses its own default model
```

The pattern across integrations is inconsistent:

| Integration | Model Passing Method |
|-------------|---------------------|
| aider.ts    | CLI flag: `--model openrouter/${model}` |
| claude.ts   | Env var: `ANTHROPIC_MODEL` |
| opencode.ts | **Not implemented** (logged only) |

## Open Questions

1. Does OpenCode support an environment variable for model selection that could be used instead of CLI flags?
2. Should the fix prepend `--model` to the args array like aider.ts does?
3. Does OpenCode expect the model format to include the `openrouter/` prefix?
4. Are there any passthrough args that might conflict with adding `--model`?
