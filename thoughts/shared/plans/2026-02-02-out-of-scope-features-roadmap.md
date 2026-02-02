# Implementation Plan: Out-of-Scope Features Roadmap

**Date**: 2026-02-02
**Git Commit**: e3a4cea79ac2324243034d4f28a783112fb32d21
**Branch**: main
**Based On**: `thoughts/shared/research/2026-02-02-out-of-scope-features.md`

---

## Overview

This plan implements features currently marked as out-of-scope for openrouter-launch, progressing from v0.2 through v1.0. The roadmap prioritizes quick wins first (provider preferences, easy integrations) while building toward a cross-platform Node.js solution.

**Current State**: v0.1.0 - Bash script supporting Claude Code only, hardcoded 10-model list, config persistence at `~/.openrouter-launch/config`

**End State**: v1.0 - Cross-platform Node.js CLI with live model fetching, multiple tool integrations, distribution via curl installer and Homebrew

---

## Phase 1: Provider Preferences (v0.2)

**Goal**: Add OpenRouter provider routing options to the config and CLI

### Tasks

1. **Add provider preference config variables**
   - Location: `bin/openrouter-launch` lines 240-242 (global state), 258-274 (save_config)
   - New variables:
     - `DATA_COLLECTION="deny"` (default)
     - `PROVIDER_SORT=""` (optional: price|throughput|latency)
   - Update `save_config()` to persist new variables
   - Update `load_config()` to source them

2. **Add CLI flags for provider preferences**
   - Location: `bin/openrouter-launch` lines 458-508 (argument parsing)
   - New flags:
     - `--no-data-collection` (set DATA_COLLECTION="deny")
     - `--sort price|throughput|latency`
   - Add to `show_usage()` help text

3. **Pass provider preferences to launch**
   - Location: `bin/openrouter-launch` lines 374-398 (launch_claude)
   - Add HTTP headers via environment or curl passthrough
   - OpenRouter uses `X-Provider-Preferences` header or request body

4. **Update README documentation**
   - Add provider preferences section
   - Document default data_collection="deny" behavior

### Files to Modify
- `bin/openrouter-launch`: ~50 lines added
- `README.md`: ~20 lines added

### Success Criteria

#### Automated Verification
- [ ] Syntax check passes: `make test`
- [ ] ShellCheck passes: `shellcheck --severity=error bin/openrouter-launch`
- [ ] Config saves new variables: `grep DATA_COLLECTION ~/.openrouter-launch/config`

#### Manual Verification
- [ ] `openrouter-launch --help` shows new flags
- [ ] `--no-data-collection` flag works correctly
- [ ] Provider preferences persist across sessions

---

## Phase 2: Live Model Fetching (v0.3)

**Goal**: Fetch models from OpenRouter API instead of hardcoded list

### Tasks

1. **Add jq dependency check**
   - Location: `bin/openrouter-launch` line 511 (check_dependencies)
   - Make jq optional with graceful fallback to hardcoded list
   - Add `check_dependencies curl` → `check_dependencies curl && check_optional jq`

2. **Implement model caching**
   - Create `~/.cache/openrouter/models.json`
   - Cache TTL: 1 hour (3600 seconds)
   - Fallback to cached data if API fails
   - Fallback to hardcoded MODELS if no cache

3. **Add fetch_models() function**
   - Endpoint: `GET https://openrouter.ai/api/v1/models`
   - No auth required for this endpoint
   - Parse with jq: id, name, pricing (per_input_token, per_output_token)
   - Store in cache file

4. **Update model selection to use live data**
   - Modify `show_model_menu()` to display live models
   - Keep hardcoded MODELS as fallback
   - Add popular/recommended filter (top 20 by usage)

5. **Handle cross-platform stat differences**
   - macOS: `stat -f %m` for mtime
   - Linux: `stat -c %Y` for mtime
   - Detect platform and use correct syntax

### Files to Modify
- `bin/openrouter-launch`: ~80 lines added
- `README.md`: Update requirements (jq optional)

### Dependencies
- `jq` (optional, for JSON parsing)

### Success Criteria

#### Automated Verification
- [ ] Syntax check passes: `make test`
- [ ] Cache file created: `test -f ~/.cache/openrouter/models.json`
- [ ] Fallback works without jq: `(command -v jq && sudo mv /usr/local/bin/jq /usr/local/bin/jq.bak); openrouter-launch --help; sudo mv /usr/local/bin/jq.bak /usr/local/bin/jq`

#### Manual Verification
- [ ] Model list shows more than 10 models
- [ ] Cache refreshes after 1 hour
- [ ] Works offline with cached data

---

## Phase 3: Multiple Integrations - Easy Wins (v0.4)

**Goal**: Add support for Aider and OpenCode (both have native OpenRouter support)

### Tasks

1. **Add integration detection functions**
   - `check_aider_installed()` - `command -v aider`
   - `check_opencode_installed()` - `command -v opencode`
   - Keep existing `check_claude_installed()`

2. **Add Aider launch function**
   - Location: New function `launch_aider()`
   - Environment: `OPENROUTER_API_KEY` (native support)
   - CLI flag: `--model <model>` for model selection
   - Command: `exec aider --model "openrouter/$model" "$@"`

3. **Add OpenCode launch function**
   - Location: New function `launch_opencode()`
   - Environment: `OPENROUTER_API_KEY` (native support)
   - Config location: `~/.config/opencode/`
   - Command: `exec opencode "$@"` with model in config

4. **Update argument parsing for integrations**
   - Location: `bin/openrouter-launch` lines 488-491
   - Add cases: `aider)`, `opencode)`
   - Update show_usage() to list all integrations

5. **Update main() launch logic**
   - Location: `bin/openrouter-launch` lines 549-558
   - Add cases for aider, opencode in the launch switch

6. **Add integration auto-detection (optional)**
   - If no integration specified, detect installed tools
   - Show menu of available tools if multiple installed

### Files to Modify
- `bin/openrouter-launch`: ~100 lines added
- `README.md`: Add Aider and OpenCode sections

### Success Criteria

#### Automated Verification
- [ ] Syntax check passes: `make test`
- [ ] Help shows new integrations: `openrouter-launch --help | grep -E 'aider|opencode'`

#### Manual Verification
- [ ] `openrouter-launch aider -m sonnet` launches Aider with correct model
- [ ] `openrouter-launch opencode` launches OpenCode
- [ ] Each tool receives passthrough arguments correctly

---

## Phase 4: Distribution (v0.5)

**Goal**: Enable easy installation via curl | bash and Homebrew tap

### Tasks

1. **Create install.sh script**
   - Download latest release from GitHub
   - Install to `~/.local/bin` (user) or `/usr/local/bin` (sudo)
   - Create or-launch symlink
   - Verify installation

2. **Create GitHub Release workflow**
   - Location: `.github/workflows/release.yml`
   - Trigger on version tags (v*)
   - Create release with changelog
   - Upload script as release asset

3. **Create Homebrew tap repository**
   - Create `truefrontier/homebrew-tap` repository
   - Write formula: `openrouter-launch.rb`
   - Formula downloads from GitHub releases
   - Include dependencies: curl, bash

4. **Update README with new install methods**
   - curl | bash install command
   - Homebrew tap instructions
   - Keep manual install as fallback

### Files to Create
- `install.sh`: ~80 lines
- `.github/workflows/release.yml`: ~40 lines
- (External) `homebrew-tap/openrouter-launch.rb`: ~30 lines

### Files to Modify
- `README.md`: Add installation methods

### Success Criteria

#### Automated Verification
- [ ] Install script syntax valid: `bash -n install.sh`
- [ ] GitHub workflow valid: `yamllint .github/workflows/release.yml`
- [ ] Formula syntax valid (Ruby): `ruby -c homebrew-tap/openrouter-launch.rb`

#### Manual Verification
- [ ] `curl -fsSL https://raw.githubusercontent.com/truefrontier/openrouter-launch/main/install.sh | bash` works
- [ ] `brew install truefrontier/tap/openrouter-launch` works
- [ ] Installed version matches expected

---

## Phase 5: Node.js Rewrite (v1.0)

**Goal**: Cross-platform support including Windows, better UX, npm distribution

### Tasks

1. **Initialize Node.js project**
   - Create `package.json` with bin field
   - Add TypeScript configuration
   - Set up build process (tsc)

2. **Port core functionality**
   - Config management (`~/.openrouter-launch/config`)
   - API key validation
   - Model resolution and aliases
   - Launch functions for all integrations

3. **Add cross-platform support**
   - Use `os.homedir()` for home directory
   - Use `path.join()` for path construction
   - Use `cross-spawn` for process spawning
   - Handle Windows env vars correctly

4. **Improve UX**
   - Add colors with `chalk`
   - Add spinners with `ora`
   - Add fuzzy search for models with `fzf` or similar
   - Better error messages

5. **Set up npm publishing**
   - Package name: `@truefrontier/openrouter-launch`
   - Shebang in bin file
   - Add prepare script for build
   - Publish to npm

6. **Update documentation**
   - Windows installation instructions
   - npm install instructions
   - Migration guide from bash version

### Files to Create
- `package.json`
- `tsconfig.json`
- `src/index.ts` (entry point)
- `src/config.ts`
- `src/models.ts`
- `src/integrations/claude.ts`
- `src/integrations/aider.ts`
- `src/integrations/opencode.ts`
- `.github/workflows/npm-publish.yml`

### Dependencies (npm)
- `chalk` - Terminal colors
- `ora` - Spinners
- `prompts` or `inquirer` - Interactive prompts
- `cross-spawn` - Cross-platform spawn
- `commander` - CLI argument parsing

### Success Criteria

#### Automated Verification
- [ ] TypeScript compiles: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] npm package valid: `npm pack --dry-run`
- [ ] Windows CI passes (GitHub Actions)

#### Manual Verification
- [ ] Works on macOS: `npx @truefrontier/openrouter-launch`
- [ ] Works on Linux: `npx @truefrontier/openrouter-launch`
- [ ] Works on Windows: `npx @truefrontier/openrouter-launch`
- [ ] All integrations work correctly
- [ ] Fuzzy model search works

---

## Out of Scope (Future Versions)

These features are explicitly NOT included in this roadmap:

1. **Claude Code proxy setup** - Complex, requires LiteLLM or custom proxy
2. **Cursor support** - Requires LiteLLM proxy, not worth complexity
3. **GUI/TUI for model selection** - Beyond CLI scope
4. **Cost tracking** - Requires tracking API responses
5. **Tool-specific model preferences** - Different defaults per tool
6. **PowerShell native support** - WSL is sufficient

---

## Implementation Order Summary

| Version | Features | Effort | Dependencies |
|---------|----------|--------|--------------|
| v0.2 | Provider preferences, data_collection default | 2-4 hours | None |
| v0.3 | Live model fetching with caching | 4-8 hours | jq (optional) |
| v0.4 | Aider + OpenCode integrations | 4-8 hours | None |
| v0.5 | curl installer + Homebrew tap | 4-8 hours | GitHub releases |
| v1.0 | Node.js rewrite, Windows support | 2-3 days | Node.js, npm |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| jq not installed | Graceful fallback to hardcoded models |
| OpenRouter API changes | Version lock, monitor changelog, cache |
| Windows edge cases | GitHub Actions CI on Windows |
| npm namespace conflicts | Use @truefrontier scope |
| Breaking changes to tools | Integration-specific version detection |

---

## Open Questions (Resolved)

1. ~~Should we support tool-specific model preferences?~~ → No, out of scope
2. ~~Is there demand for a GUI/TUI?~~ → No, keep as CLI
3. ~~Should proxy setup for Claude Code be automated?~~ → No, too complex, document manually
4. ~~What level of provider preference granularity?~~ → Basic: sort, data_collection

---

## References

- OpenRouter API: https://openrouter.ai/api/v1/models
- OpenRouter Provider Routing: https://openrouter.ai/docs/provider-routing
- Aider OpenRouter Integration: https://aider.chat/docs/llms/openrouter.html
- OpenCode: https://github.com/OpenCode-AI/opencode
