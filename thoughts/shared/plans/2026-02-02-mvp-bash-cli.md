# Implementation Plan: openrouter-launch MVP

**Date:** 2026-02-02
**Commit:** 74e5317997817e384712654de3775dfdc289f93c
**Branch:** main
**Ticket:** docs/openrouter-launch-prd.md

---

## Overview

Build a lightweight bash CLI tool (`openrouter-launch`) that simplifies using Claude Code with OpenRouter's model catalog. The MVP focuses on Claude Code integration only, with a hardcoded list of popular models and config persistence.

**Goal:** Reduce Claude Code + OpenRouter setup from 3+ manual environment variable configurations to a single interactive command.

---

## Phases

### Phase 1: Project Structure & Core Script

**Objective:** Create the basic script structure with dependency checking and help display.

**Files to create:**
- `bin/openrouter-launch` - Main bash script
- `Makefile` - Installation targets

**Implementation details:**

1. **bin/openrouter-launch** - Core structure:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail

   # Constants
   CONFIG_DIR="$HOME/.openrouter-launch"
   CONFIG_FILE="$CONFIG_DIR/config"
   VERSION="0.1.0"

   # Logging functions (to stderr)
   # Dependency validation (command -v)
   # show_usage() function
   # show_version() function
   ```

2. **Makefile** targets:
   - `install` - Copy script to `/usr/local/bin/openrouter-launch` and `or-launch` symlink
   - `uninstall` - Remove both
   - `test` - Run shellcheck

**Success criteria:**
- [ ] `bin/openrouter-launch --help` displays usage
- [ ] `bin/openrouter-launch --version` shows version
- [ ] `make install` copies to `/usr/local/bin/`
- [ ] `or-launch` symlink works after install

---

### Phase 2: Model Selection & Aliases

**Objective:** Implement hardcoded model list with alias support.

**Implementation details:**

1. **Model array with pricing info:**
   ```bash
   declare -A MODELS=(
     ["anthropic/claude-sonnet-4"]="$3/$15 per 1M tokens"
     ["anthropic/claude-opus-4"]="$15/$75 per 1M tokens"
     ["google/gemini-2.0-flash"]="$0.10/$0.40 per 1M tokens"
     ["openai/gpt-4o"]="$2.50/$10 per 1M tokens"
     # ... 6 more popular models
   )
   ```

2. **Alias mapping:**
   ```bash
   declare -A ALIASES=(
     ["sonnet"]="anthropic/claude-sonnet-4"
     ["opus"]="anthropic/claude-opus-4"
     ["haiku"]="anthropic/claude-haiku"
     ["flash"]="google/gemini-2.0-flash"
     ["gpt4"]="openai/gpt-4o"
   )
   ```

3. **resolve_model() function:**
   - Check if input is an alias, resolve to full name
   - Check if input exists in MODELS array
   - Error if neither

4. **select_model() function:**
   - Display numbered menu with model names and pricing
   - Accept number input or model name/alias
   - Return selected model full name

**Success criteria:**
- [ ] `openrouter-launch` shows model menu with pricing
- [ ] User can select by number (1-10)
- [ ] User can type alias: `sonnet` resolves to `anthropic/claude-sonnet-4`
- [ ] Invalid input shows error and re-prompts

---

### Phase 3: API Key Management

**Objective:** Prompt for API key, validate it, save to config.

**Implementation details:**

1. **Config file structure** (`~/.openrouter-launch/config`):
   ```bash
   OPENROUTER_API_KEY=sk-or-xxx
   DEFAULT_MODEL=anthropic/claude-sonnet-4
   ```

2. **load_config() function:**
   - Create `$CONFIG_DIR` with 700 permissions if needed
   - Source config file if exists
   - Return early if API key already set in environment

3. **prompt_api_key() function:**
   - Check if `OPENROUTER_API_KEY` already set (env or config)
   - If not, prompt interactively with masked input
   - Validate format starts with `sk-or-`

4. **validate_api_key() function:**
   - Make lightweight API call to OpenRouter to verify key works
   - Endpoint: `https://openrouter.ai/api/v1/auth/key` (or similar)
   - Return 0 on success, 1 on failure

5. **save_config() function:**
   - Write config file with 600 permissions
   - Ask user if they want to save the key

**Success criteria:**
- [ ] First run prompts for API key
- [ ] Key is validated against OpenRouter API
- [ ] Key saved to `~/.openrouter-launch/config` with proper permissions (600)
- [ ] Subsequent runs use saved key automatically
- [ ] `OPENROUTER_API_KEY` env var overrides saved key

---

### Phase 4: Claude Code Launch

**Objective:** Set environment variables and launch Claude Code.

**Implementation details:**

1. **check_claude_installed() function:**
   - Verify `claude` command exists
   - Show helpful error if not installed

2. **Environment variables to set:**
   ```bash
   export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
   export ANTHROPIC_API_KEY=""
   export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
   export ANTHROPIC_MODEL="$SELECTED_MODEL"
   ```

3. **launch_claude() function:**
   - Display launch confirmation with selected model
   - Export all environment variables
   - Execute `claude` with any additional arguments passed through

4. **Main flow:**
   ```bash
   main() {
     load_config
     prompt_api_key
     select_model
     launch_claude "$@"
   }
   ```

**Success criteria:**

#### Automated Verification:
- [ ] Script passes shellcheck: `shellcheck bin/openrouter-launch`
- [ ] Script syntax valid: `bash -n bin/openrouter-launch`
- [ ] Makefile install works: `make install && which openrouter-launch`
- [ ] Symlink works: `which or-launch`

#### Manual Verification:
- [ ] Running `openrouter-launch` shows interactive menu
- [ ] Model selection works (by number and by alias)
- [ ] API key prompt appears on first run
- [ ] Claude Code launches with correct environment variables
- [ ] Claude Code shows OpenRouter override in welcome message
- [ ] Selected model is used in Claude Code session

---

### Phase 5: Quick Launch Mode

**Objective:** Support `openrouter-launch claude` to skip menus.

**Implementation details:**

1. **Argument parsing:**
   ```bash
   # Positional args
   INTEGRATION="${1:-}"  # claude, opencode, etc.
   MODEL="${2:-}"        # Optional model override

   # Flags
   --model, -m MODEL     # Alternative model specification
   --key, -k KEY         # API key override (don't save)
   --help, -h            # Show help
   --version, -v         # Show version
   ```

2. **Quick launch flow:**
   - If first arg is `claude`, skip integration menu
   - If `--model` provided, skip model menu
   - Use saved defaults where not specified

3. **save_defaults() function:**
   - After successful interactive selection, offer to save as defaults
   - Defaults stored in config file

**Success criteria:**

#### Automated Verification:
- [ ] `openrouter-launch --help` shows quick launch syntax
- [ ] `openrouter-launch --version` shows version

#### Manual Verification:
- [ ] `openrouter-launch claude` skips integration menu
- [ ] `openrouter-launch claude --model sonnet` uses specified model
- [ ] `openrouter-launch claude -m opus` uses alias
- [ ] Defaults are saved and used on subsequent runs

---

## Out of Scope (v0.2+)

Per PRD, these are explicitly out of scope for MVP:

- Live model fetching from OpenRouter API
- Model search/filtering
- Multiple integrations (OpenCode, Codex, Droid)
- Cost tracking
- Windows support
- npm/homebrew publishing

---

## File Structure

After implementation:

```
openrouter-launch/
├── README.md           # Updated with installation & usage
├── Makefile            # install, uninstall, test targets
├── bin/
│   └── openrouter-launch   # Main bash script
├── docs/
│   └── openrouter-launch-prd.md
└── thoughts/
    └── shared/
        └── plans/
            └── 2026-02-02-mvp-bash-cli.md
```

---

## Dependencies

**Required on target system:**
- bash 4.0+ (for associative arrays)
- curl (for API key validation)
- claude (Claude Code CLI)

**Development:**
- shellcheck (for linting)
- make (for installation)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Claude Code not installed | Clear error message with installation link |
| Invalid API key | Validate before saving, show helpful error |
| Config file permissions | Explicitly set 600 on creation |
| Bash 3.x (macOS default) | Check bash version at startup, suggest brew install |

---

## Implementation Order

1. Phase 1: Project structure (Makefile, basic script)
2. Phase 2: Model selection with aliases
3. Phase 3: API key management
4. Phase 4: Claude Code launch
5. Phase 5: Quick launch mode

Each phase should be committable and testable independently.
