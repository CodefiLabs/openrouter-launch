# OpenCode Model Passthrough Implementation Plan

## Overview

Fix the OpenCode integration in openrouter-launch so that the model selected via the model picker is actually passed to the OpenCode CLI.

### Problem
The `launchOpenCode()` function in `src/integrations/opencode.ts` receives the selected model but doesn't pass it to OpenCode. The model is only logged, not used.

### Complication
OpenCode uses its own internal model ID format (`openrouter.claude-3.7-sonnet`) that differs from OpenRouter's API format (`anthropic/claude-3.7-sonnet`). A direct pass-through won't work.

### Solution
1. Create a mapping from OpenRouter model IDs to OpenCode internal IDs
2. Add `--model` flag to OpenCode CLI args when a mapping exists
3. Warn users when their selected model isn't supported by OpenCode
4. Update messaging to remove the "configure ~/.opencode.json" note when model is passed

## Current State Analysis

The model IS selected correctly in openrouter-launch and logged to stderr, but it is NOT passed to the OpenCode CLI. The `launchOpenCode` function receives the model parameter but only passes the `OPENROUTER_API_KEY` environment variable and user passthrough arguments.

### Key Discoveries:
- `src/integrations/opencode.ts:20-56` - Model received but not used
- `src/integrations/aider.ts:47-48` - Reference pattern: passes `--model openrouter/${model}`
- `src/integrations/claude.ts:31-38` - Reference pattern: passes `ANTHROPIC_MODEL` env var
- OpenCode CLI accepts `--model` flag with format like `openrouter.claude-3.7-sonnet`

## Desired End State

When a user runs `openrouter-launch opencode -m anthropic/claude-3.7-sonnet`:
1. The model is mapped to OpenCode's format: `openrouter.claude-3.7-sonnet`
2. OpenCode is launched with `--model openrouter.claude-3.7-sonnet`
3. The console output confirms which model is being used
4. No mention of "configure ~/.opencode.json" since model is already specified

### Verification:
- Running `openrouter-launch opencode -m anthropic/claude-3.7-sonnet` should spawn OpenCode with the correct model
- The OpenCode UI should display the specified model
- Unsupported models should show a clear warning message

## What We're NOT Doing

- Adding new models to OpenCode's supported list (that's an OpenCode upstream issue)
- Environment variable support for model selection (OpenCode doesn't support it)
- Automatic sync of supported models from OpenCode (would require maintaining parity with OpenCode releases)
- Modifying the model aliases in `src/models.ts` (separate concern)

## Implementation Approach

Follow the pattern established by `aider.ts`: map the model to the tool's expected format and prepend `--model` to the CLI arguments.

---

## Phase 1: Add Model Mapping

### Overview
Create the mapping infrastructure to convert OpenRouter model IDs to OpenCode's internal format.

### Changes Required:

#### 1. Add Model Mapping Constant
**File**: `src/integrations/opencode.ts`
**Changes**: Add mapping constant and helper function before the `launchOpenCode` function

```typescript
/**
 * Mapping from OpenRouter model IDs to OpenCode internal model IDs.
 * OpenCode uses format like 'openrouter.claude-3.7-sonnet' internally.
 *
 * To find supported models, check OpenCode's model configuration:
 * https://github.com/opencode-ai/opencode
 */
const OPENCODE_MODEL_MAP: Record<string, string> = {
  // Anthropic Claude models
  'anthropic/claude-3.7-sonnet': 'openrouter.claude-3.7-sonnet',
  'anthropic/claude-3.5-sonnet': 'openrouter.claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku': 'openrouter.claude-3.5-haiku',
  'anthropic/claude-3-haiku': 'openrouter.claude-3-haiku',
  'anthropic/claude-3-opus': 'openrouter.claude-3-opus',
  // OpenAI GPT models
  'openai/gpt-4o': 'openrouter.gpt-4o',
  'openai/gpt-4o-mini': 'openrouter.gpt-4o-mini',
  'openai/gpt-4.1': 'openrouter.gpt-4.1',
  'openai/gpt-4.1-mini': 'openrouter.gpt-4.1-mini',
  'openai/gpt-4.1-nano': 'openrouter.gpt-4.1-nano',
  'openai/gpt-4.5-preview': 'openrouter.gpt-4.5-preview',
  // OpenAI reasoning models
  'openai/o1': 'openrouter.o1',
  'openai/o1-pro': 'openrouter.o1-pro',
  'openai/o1-mini': 'openrouter.o1-mini',
  'openai/o3': 'openrouter.o3',
  'openai/o3-mini-high': 'openrouter.o3-mini',
  'openai/o4-mini-high': 'openrouter.o4-mini',
  // Google Gemini models
  'google/gemini-2.5-flash-preview:thinking': 'openrouter.gemini-2.5-flash',
  'google/gemini-2.5-pro-preview-03-25': 'openrouter.gemini-2.5',
  // DeepSeek models
  'deepseek/deepseek-r1-0528:free': 'openrouter.deepseek-r1-free',
};

/**
 * Map an OpenRouter model ID to OpenCode's internal format.
 * Returns null if the model is not in OpenCode's supported list.
 */
function mapToOpenCodeModel(model: string): string | null {
  return OPENCODE_MODEL_MAP[model] || null;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`

#### Manual Verification:
- [ ] Mapping constant contains 20 model entries
- [ ] Helper function signature matches expected types

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 2: Update launchOpenCode Function

### Overview
Modify the `launchOpenCode` function to use the mapping and pass the model to OpenCode.

### Changes Required:

#### 1. Update launchOpenCode Function
**File**: `src/integrations/opencode.ts`
**Changes**: Replace the existing function body to use model mapping and pass `--model` flag

```typescript
export function launchOpenCode(
  model: string,
  config: Config,
  passthroughArgs: string[]
): void {
  if (!checkOpenCodeInstalled()) {
    process.exit(1);
  }

  // OpenCode uses OPENROUTER_API_KEY directly
  // When set, it auto-detects and uses OpenRouter as the provider
  const env = {
    ...process.env,
    OPENROUTER_API_KEY: config.OPENROUTER_API_KEY
  };

  // Map model to OpenCode's internal format
  const openCodeModel = mapToOpenCodeModel(model);

  console.error('');
  console.error('Launching OpenCode with OpenRouter...');
  console.error(`  Model: ${model}`);

  // Build args - prepend --model if we have a valid mapping
  let args: string[];
  if (openCodeModel) {
    args = ['--model', openCodeModel, ...passthroughArgs];
    console.error(`  OpenCode model ID: ${openCodeModel}`);
  } else {
    args = passthroughArgs;
    console.error('');
    console.error(`  Warning: Model '${model}' is not in OpenCode's supported list.`);
    console.error('  OpenCode will use its default model configuration.');
    console.error('  You can configure a model in ~/.opencode.json or use a supported model.');
  }

  console.error(`  Data collection: ${config.DATA_COLLECTION}`);
  if (config.PROVIDER_SORT) {
    console.error(`  Provider sort: ${config.PROVIDER_SORT}`);
  }
  console.error('');

  // Spawn OpenCode, replacing this process
  const result = spawn.sync('opencode', args, {
    env,
    stdio: 'inherit'
  });

  // Exit with the same code as OpenCode
  process.exit(result.status ?? 0);
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] No new linting errors

#### Manual Verification:
- [ ] When a supported model is selected, `--model` flag is passed to OpenCode
- [ ] When an unsupported model is selected, warning is shown
- [ ] Existing behavior preserved for passthrough args
- [ ] The "configure ~/.opencode.json" note only appears for unsupported models

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to the next phase.

---

## Phase 3: End-to-End Testing

### Overview
Verify the complete integration works correctly with various model inputs.

### Manual Testing Steps:

#### Test 1: Supported Anthropic Model
```bash
openrouter-launch opencode -m anthropic/claude-3.7-sonnet
```
**Expected**: Console shows "OpenCode model ID: openrouter.claude-3.7-sonnet"

#### Test 2: Supported OpenAI Model
```bash
openrouter-launch opencode -m openai/gpt-4o
```
**Expected**: Console shows "OpenCode model ID: openrouter.gpt-4o"

#### Test 3: Unsupported Model
```bash
openrouter-launch opencode -m some/unknown-model
```
**Expected**: Warning message about unsupported model, OpenCode uses defaults

#### Test 4: Model Alias Resolution
```bash
openrouter-launch opencode -m sonnet
```
**Expected**: Alias resolves to full model ID, then maps to OpenCode format

#### Test 5: Passthrough Args Preserved
```bash
openrouter-launch opencode -m openai/gpt-4o -- --help
```
**Expected**: `--model openrouter.gpt-4o --help` passed to OpenCode

#### Test 6: Interactive Session
```bash
openrouter-launch opencode -m anthropic/claude-3.7-sonnet
```
**Expected**: OpenCode launches and shows the specified model in its UI

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Package builds correctly: `npm pack --dry-run`

#### Manual Verification:
- [ ] Test 1 passes: Supported Anthropic model
- [ ] Test 2 passes: Supported OpenAI model
- [ ] Test 3 passes: Unsupported model warning
- [ ] Test 4 passes: Alias resolution (if alias maps to supported model)
- [ ] Test 5 passes: Passthrough args preserved
- [ ] Test 6 passes: OpenCode UI shows correct model

---

## Testing Strategy

### Unit Tests:
- Model mapping function returns correct OpenCode IDs
- Model mapping function returns null for unknown models
- Args array is correctly constructed with --model prepended

### Integration Tests:
- End-to-end flow from model selection to OpenCode launch
- Passthrough args combined correctly with --model flag

### Manual Testing Steps:
1. Test with each category of model (Anthropic, OpenAI, Google, DeepSeek)
2. Verify warning appears for unsupported models
3. Confirm OpenCode actually uses the specified model (visible in OpenCode UI)
4. Test passthrough args still work

## Performance Considerations

No performance impact - this is a simple object lookup (O(1)) performed once at launch.

## Migration Notes

This is a backward-compatible change. Users who previously configured `~/.opencode.json` will continue to work, but CLI-specified models will take precedence per OpenCode's configuration hierarchy.

## References

- Original research: `thoughts/shared/research/2026-02-02-opencode-model-picker-investigation.md`
- Current implementation: `src/integrations/opencode.ts:20-56`
- Reference pattern (Aider): `src/integrations/aider.ts:47-48`
- Reference pattern (Claude): `src/integrations/claude.ts:31-38`
- Model aliases: `src/models.ts:56-74`

## Metadata
- date: 2026-02-02
- commit: 789594c4a000e908f2290c3ae81f5b5ded6a1329
- branch: main
- related_research: thoughts/shared/research/2026-02-02-opencode-model-picker-investigation.md
