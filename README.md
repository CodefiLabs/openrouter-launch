# openrouter-launch

Launch [Claude Code](https://docs.anthropic.com/en/docs/claude-code) with [OpenRouter's](https://openrouter.ai) 400+ model catalog in one command.

## Quick Start

```bash
# Clone and install
git clone https://github.com/truefrontier/openrouter-launch.git
cd openrouter-launch
sudo make install

# Launch with your OpenRouter API key
openrouter-launch
```

## Features

- **Live model catalog**: Fetches 300+ models from OpenRouter API (requires jq)
- **Smart caching**: Model list cached for 1 hour at `~/.cache/openrouter/models.json`
- **Coding-focused**: Prioritizes popular coding models (Claude, GPT-4, Gemini, etc.)
- Interactive model selection with pricing info
- Model aliases (`sonnet`, `opus`, `flash`, etc.)
- API key validation against OpenRouter
- Persistent configuration (`~/.openrouter-launch/config`)
- Quick launch mode for repeat usage

## Installation

### From Source

```bash
git clone https://github.com/truefrontier/openrouter-launch.git
cd openrouter-launch
sudo make install
```

This installs:
- `/usr/local/bin/openrouter-launch`
- `/usr/local/bin/or-launch` (symlink)

### Manual

```bash
# Copy script to your PATH
cp bin/openrouter-launch /usr/local/bin/
chmod +x /usr/local/bin/openrouter-launch

# Optional: create short alias
ln -s /usr/local/bin/openrouter-launch /usr/local/bin/or-launch
```

## Usage

### Interactive Mode

```bash
openrouter-launch
```

First run prompts for:
1. OpenRouter API key (get one at https://openrouter.ai/keys)
2. Model selection from 10 popular options

### Quick Launch

```bash
# Use default model (after first run)
openrouter-launch claude

# Specify model by alias
openrouter-launch -m sonnet
openrouter-launch -m flash

# Specify full model name
openrouter-launch -m anthropic/claude-opus-4

# Save model as default
openrouter-launch -m sonnet --save-default
```

### Model Aliases

| Alias | Model |
|-------|-------|
| `sonnet` | anthropic/claude-sonnet-4 |
| `opus` | anthropic/claude-opus-4 |
| `haiku` | anthropic/claude-haiku |
| `flash` | google/gemini-2.0-flash |
| `gemini` | google/gemini-2.5-pro |
| `gpt4` | openai/gpt-4o |
| `gpt4-mini` | openai/gpt-4o-mini |
| `deepseek` | deepseek/deepseek-chat-v3 |
| `llama` | meta-llama/llama-3.3-70b-instruct |
| `qwen` | qwen/qwen-2.5-coder-32b-instruct |

### Options

```
-m, --model MODEL        Use specific model (name or alias)
-k, --key KEY            Use API key (overrides saved key)
--save-default           Save the selected model as default
--refresh-models         Force refresh model list from API
--allow-data-collection  Allow providers to collect/train on data
--sort ORDER             Provider sort: price|throughput|latency
-h, --help               Show help message
-v, --version            Show version
```

### Provider Preferences

OpenRouter routes requests to multiple AI providers. You can control how providers are selected:

**Data Collection (default: deny)**

By default, openrouter-launch only uses providers that do NOT collect or train on your data:

```bash
# Default behavior - deny data collection
openrouter-launch

# Explicitly allow providers that may collect data
openrouter-launch --allow-data-collection
```

**Provider Sorting**

Control how providers are prioritized:

```bash
# Prefer cheapest providers
openrouter-launch --sort price

# Prefer fastest token generation
openrouter-launch --sort throughput

# Prefer lowest latency (fastest first response)
openrouter-launch --sort latency
```

> **Note**: Provider preferences are stored in your config but currently require [OpenRouter account settings](https://openrouter.ai/settings/privacy) for full enforcement, as Claude Code's SDK doesn't support custom request body fields. This will be improved in future versions.

## Configuration

Settings are stored in `~/.openrouter-launch/config`:

```bash
OPENROUTER_API_KEY="sk-or-..."
DEFAULT_MODEL="anthropic/claude-sonnet-4"
DATA_COLLECTION="deny"
PROVIDER_SORT=""
```

The config file is created with 600 permissions (owner read/write only).

### Model Caching

When jq is installed, openrouter-launch fetches the full model catalog from OpenRouter's API and caches it locally:

- **Cache location**: `~/.cache/openrouter/models.json`
- **Cache TTL**: 1 hour (3600 seconds)
- **Fallback behavior**:
  1. Use cached data if valid (< 1 hour old)
  2. Fetch fresh data if cache expired and online
  3. Use stale cache if fetch fails
  4. Use built-in model list if no cache and jq unavailable

Force a cache refresh with:
```bash
openrouter-launch --refresh-models
```

| Setting | Default | Description |
|---------|---------|-------------|
| `OPENROUTER_API_KEY` | - | Your OpenRouter API key |
| `DEFAULT_MODEL` | - | Default model for quick launch |
| `DATA_COLLECTION` | `deny` | Allow/deny provider data collection |
| `PROVIDER_SORT` | - | Provider priority: price/throughput/latency |

### Environment Variables

You can also set your API key via environment variable:

```bash
export OPENROUTER_API_KEY="sk-or-..."
openrouter-launch
```

## Requirements

- Bash 3.2+
- curl
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- jq (optional, for live model fetching)

## How It Works

openrouter-launch sets the following environment variables before launching Claude Code:

```bash
ANTHROPIC_BASE_URL="https://openrouter.ai/api"
ANTHROPIC_API_KEY=""
ANTHROPIC_AUTH_TOKEN="<your-openrouter-key>"
ANTHROPIC_MODEL="<selected-model>"
```

This routes Claude Code's API requests through OpenRouter, allowing you to use any model in their catalog.

## Uninstall

```bash
sudo make uninstall
rm -rf ~/.openrouter-launch
```

## License

MIT
