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
-m, --model MODEL    Use specific model (name or alias)
-k, --key KEY        Use API key (overrides saved key)
--save-default       Save the selected model as default
-h, --help           Show help message
-v, --version        Show version
```

## Configuration

Settings are stored in `~/.openrouter-launch/config`:

```bash
OPENROUTER_API_KEY="sk-or-..."
DEFAULT_MODEL="anthropic/claude-sonnet-4"
```

The config file is created with 600 permissions (owner read/write only).

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
