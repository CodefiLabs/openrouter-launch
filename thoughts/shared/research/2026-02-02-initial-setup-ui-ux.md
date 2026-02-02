---
date: 2026-02-02T00:00:00-08:00
researcher: Claude
git_commit: c6b30b5c2b342e931b054bd41487cc0ca7466e73
branch: main
topic: Initial Setup UI/UX Implementation
tags: [research, ui-ux, setup-flow, interactive-prompts]
status: complete
last_updated: 2026-02-02
---

# Research: Initial Setup UI/UX Implementation

**Date**: 2026-02-02
**Git Commit**: c6b30b5c2b342e931b054bd41487cc0ca7466e73
**Branch**: main

## Research Question
How are the initial setup flows (API key entry, model selection, tool launch) currently implemented across the bash and Node.js/TypeScript versions, and what are the UI/UX differences?

## Summary
The openrouter-launch CLI has two parallel implementations with distinct UI/UX approaches: a bash script (v0.5.0) with plain text output to stderr, and a Node.js/TypeScript version (v1.0) with rich terminal UI featuring colors, spinners, and masked password input. Both share the same underlying logic for API key validation, model selection, and configuration storage, but diverge significantly in presentation and interactivity.

## Detailed Findings

### 1. Logging System Implementation

**Bash Script** (`bin/openrouter-launch:52-62`):
- `log_info()` - Outputs `[INFO] message` to stderr
- `log_error()` - Outputs `[ERROR] message` to stderr
- `log_success()` - Outputs `✓ message` with checkmark to stderr
- Plain text with no color formatting

**Node.js/TypeScript** (`src/utils.ts:7-30`):
- `logInfo()` - Blue `[INFO]` prefix with chalk color library
- `logError()` - Red `[ERROR]` prefix
- `logSuccess()` - Green `✓` checkmark
- `logWarn()` - Yellow `[WARN]` prefix
- All functions use stderr for logging, stdout for data output

### 2. API Key Entry Flow

**Common Pattern** (both implementations):
1. Check environment variable `OPENROUTER_API_KEY`
2. Check config file at `~/.openrouter-launch/config`
3. If not found, prompt user interactively
4. Validate API key format and authentication
5. Offer to save to config file

**Bash Implementation** (`bin/openrouter-launch:587-630`):
```
OpenRouter API key not found.
Get your API key at: https://openrouter.ai/keys
Enter your OpenRouter API key: [plain text input, not masked]
[INFO] Validating API key...
✓ API key validated successfully
Save API key to config? [Y/n]: [default YES]
```

**TypeScript Implementation** (`src/index.ts:27-73`):
- Uses `prompts` library with `type: 'password'`
- Input is masked with asterisks during entry
- Validation loop with retry on failure
- Save prompt uses `confirm` type with default `true`

### 3. Model Selection Menu

**Display Format** (consistent across both):
- Header: "Select a model:"
- Format: `  NN) model-name-40-char-padded  $X/$Y per 1M tokens`
- Hard limit: 30 models displayed
- Coding models prioritized first in menu
- Pricing aligned with printf/text-based formatting

**Bash Implementation** (`bin/openrouter-launch:426-480`):
- Plain text, printf-based column alignment
- Prompt: `Enter number (1-30) or model name:`
- No color distinction between elements

**TypeScript Implementation** (`src/models.ts:301-333`):
- Model numbers: `chalk.cyan()` (cyan color)
- Pricing information: `chalk.dim()` (dimmed/gray)
- Uses `prompts` library for interactive selection
- Same underlying format as bash but with visual hierarchy

**Post-Selection Behavior**:
- Bash: `Save 'model' as default model? [y/N]:` (default NO)
- TypeScript: Uses `confirm` prompt with `default: false`

### 4. Model Fetching and Spinner Integration

**TypeScript Only** (`src/models.ts:160-216`):
- Uses `ora` library for loading spinner
- Displays: "Fetching models from OpenRouter..."
- Success state: `✓ Model list updated (X models)`
- Failure state: `✗ Failed to fetch models from API`
- Provides user feedback during async operation

**Bash Implementation**:
- No spinner; outputs progress as plain text
- `[INFO]` messages during fetch operations

### 5. Model List Storage and Formatting

**Cache Format** (both implementations):
- Location: `~/.openrouter-launch/config`
- Format: Pipe-delimited `model-id|prompt-price|completion-price`
- Example: `anthropic/claude-sonnet-4|0.003|0.015`

**Pricing Display Logic** (`src/utils.ts:35-43` and `bin/openrouter-launch:211-227`):
- ≥$1: Round to integer format (`$3`)
- <$1 and >$0: Two decimals (`$0.25`)
- $0: Display as `$0`
- Consistent across both implementations

**Fallback Models**:
- Bash: String array with hardcoded model definitions
- TypeScript: Typed Model[] objects with id, prices, and display name

### 6. Configuration Storage

**File Location**: `~/.openrouter-launch/config`
**File Permissions**: 600 (owner read/write only)
**Format**: Simple key=value structure
```bash
OPENROUTER_API_KEY="sk-or-..."
DEFAULT_MODEL="anthropic/claude-sonnet-4"
DATA_COLLECTION="deny"
PROVIDER_SORT=""
```

**Configuration Management**:
- Bash: Direct `echo` and source commands
- TypeScript: `src/config.ts:56-103` with dedicated config class

### 7. Launch Feedback and Tool Integration

**Launch Summary** (`bin/openrouter-launch:660-693` and `src/integrations/claude.ts:40-48`):
```
Launching Claude Code with OpenRouter...
  Model: anthropic/claude-sonnet-4
  Base URL: https://openrouter.ai/api
  Data collection: deny
```

**Tool Detection**:
- Both check for Claude Code, Aider, and OpenCode installations
- Error messages include installation URLs
- Bash: Plain text error messages
- TypeScript: Color-coded error prefix with chalk

### 8. Error Handling UX

**Validation Error Messages** (both implementations):
- Invalid format: `[ERROR] Invalid API key format (should start with 'sk-or-')`
- Auth failed: `[ERROR] Invalid API key (authentication failed)`
- Network issues: `[ERROR] Could not connect to OpenRouter API` + guidance

**Missing Tool Errors**:
- Claude: `[ERROR] Claude Code not found` + installation URL
- Aider: `[ERROR] Aider not found` + installation URL
- OpenCode: `[ERROR] OpenCode not found` + installation URL

### 9. UI/UX Comparison Table

| Feature | Bash | TypeScript |
|---------|------|------------|
| Colors | None | chalk (cyan, red, green, dim) |
| API Key Display | Plain text visible | Password masked with asterisks |
| Loading Spinners | None | ora spinners during fetch |
| Prompt Library | read + printf | prompts library with validation |
| Help Text | Plain text | Bold headers via chalk formatting |
| Column Alignment | printf formatting | prompts + color separation |
| Async Feedback | Plain [INFO] messages | Spinner + progress indicator |
| Prompt Defaults | Implicit in text | Explicit in prompts config |
| Interactive Selection | Number or name entry | Typed prompts with validation |

## Code References

**Bash Script** (`bin/openrouter-launch`):
- `52-62` - Logging functions (log_info, log_error, log_success)
- `211-227` - Model pricing format logic
- `279-309` - Model loading from cache and fallback
- `426-480` - Model selection menu display and interaction
- `587-630` - API key entry flow and validation
- `660-693` - Launch feedback and summary

**TypeScript Implementation**:
- `src/utils.ts:7-30` - Logging system with chalk colors
- `src/utils.ts:35-43` - Pricing format utility function
- `src/index.ts:27-73` - Main setup flow with API key prompts
- `src/models.ts:160-216` - Model fetch with ora spinner
- `src/models.ts:301-333` - Model selection menu with prompts
- `src/config.ts:56-103` - Configuration file management
- `src/integrations/claude.ts:40-48` - Claude Code launch integration

## Architecture Insights

### Design Patterns
1. **Parallel Implementations**: Both bash and TypeScript versions maintain feature parity while using language-appropriate libraries (chalk/ora in Node, bash builtins in shell)
2. **Configuration Hierarchy**: Environment variables > Config file > Interactive prompts (consistent UX expectation)
3. **Security**: API keys stored with 600 permissions, masked input in interactive mode
4. **Graceful Degradation**: Fallback model list when API fetch fails

### UI/UX Principles
- **Progressive Disclosure**: Model menu shows only coding models first, allows filtering
- **Sensible Defaults**: Config save defaults to YES for API key (security/convenience), NO for model (flexibility)
- **Visual Hierarchy**: TypeScript uses colors (cyan for selection, dim for pricing) to guide attention
- **Error Context**: Error messages include actionable next steps (URLs for tool installation, format hints for keys)
- **Feedback During Wait**: Spinners in TypeScript provide reassurance during model fetch operations

### Library Choices
- **chalk** (v5.3.0): Terminal color output for semantic highlighting
- **ora** (v8.0.1): Spinner animation during async operations
- **prompts** (v2.4.2): Interactive CLI with validation, password masking, and type safety
- **commander** (v12.1.0): CLI argument parsing and help text generation

## Open Questions

1. **Mobile/Terminal Compatibility**: How do color and spinner features degrade on limited terminals or piped output?
2. **Accessibility**: Are color-coded messages accessible to colorblind users? Should there be fallback indicators?
3. **Batch Mode**: Does the TypeScript version support non-interactive batch operations (e.g., passing API key as argument)?
4. **Model Update Frequency**: How often is the cached model list refreshed? Are there TTL mechanisms?
5. **Migration Path**: What's the strategy for users currently using bash v0.5.0 to adopt TypeScript v1.0?
