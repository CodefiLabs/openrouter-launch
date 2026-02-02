#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import { loadConfig, saveConfig, getConfigFile } from './config.js';
import { loadModels, resolveModel, selectModel, resolveAlias, modelExists } from './models.js';
import { launchClaude, launchAider, launchOpenCode } from './integrations/index.js';
import { logInfo, logError, logSuccess, isValidApiKeyFormat, validateApiKey } from './utils.js';

const VERSION = '1.0.0';

type Integration = 'claude' | 'aider' | 'opencode';

interface Options {
  model?: string;
  key?: string;
  saveDefault?: boolean;
  refreshModels?: boolean;
  allowDataCollection?: boolean;
  sort?: 'price' | 'throughput' | 'latency';
}

/**
 * Prompt for API key if not set
 */
async function ensureApiKey(config: ReturnType<typeof loadConfig>): Promise<string> {
  // Check if already set
  if (config.OPENROUTER_API_KEY) {
    logInfo('Using API key from config');
    return config.OPENROUTER_API_KEY;
  }

  // Prompt for key
  console.error('');
  console.error('OpenRouter API key not found.');
  console.error('Get your key at: https://openrouter.ai/keys');
  console.error('');

  while (true) {
    const response = await prompts({
      type: 'password',
      name: 'key',
      message: 'Enter your OpenRouter API key:'
    });

    if (!response.key) {
      logError('API key is required');
      continue;
    }

    if (!isValidApiKeyFormat(response.key)) {
      logError("Invalid API key format (should start with 'sk-or-')");
      continue;
    }

    if (await validateApiKey(response.key)) {
      // Ask to save
      const saveResponse = await prompts({
        type: 'confirm',
        name: 'save',
        message: 'Save API key to config?',
        initial: true
      });

      if (saveResponse.save) {
        saveConfig({ OPENROUTER_API_KEY: response.key });
      }

      return response.key;
    }
  }
}

/**
 * Prompt to save model as default
 */
async function maybeSaveDefaultModel(model: string, currentDefault: string): Promise<void> {
  // Don't prompt if already the default
  if (model === currentDefault) {
    return;
  }

  const response = await prompts({
    type: 'confirm',
    name: 'save',
    message: `Save '${model}' as default model?`,
    initial: false
  });

  if (response.save) {
    saveConfig({ DEFAULT_MODEL: model });
  }
}

/**
 * Main CLI handler
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('openrouter-launch')
    .description('Launch AI coding tools with OpenRouter')
    .version(VERSION);

  program
    .argument('[integration]', 'Integration to launch: claude, aider, opencode (oc)', 'claude')
    .option('-m, --model <model>', 'Use specific model (name or alias)')
    .option('-k, --key <key>', 'Use API key (overrides saved key)')
    .option('--save-default', 'Save the selected model as default')
    .option('--refresh-models', 'Force refresh model list from API')
    .option('--allow-data-collection', 'Allow providers to collect/train on data')
    .option('--sort <order>', 'Provider sort order: price|throughput|latency')
    .allowUnknownOption(true)
    .action(async (integrationArg: string, options: Options, command: Command) => {
      // Parse integration
      let integration: Integration;
      switch (integrationArg.toLowerCase()) {
        case 'claude':
          integration = 'claude';
          break;
        case 'aider':
          integration = 'aider';
          break;
        case 'opencode':
        case 'oc':
          integration = 'opencode';
          break;
        default:
          logError(`Unknown integration: ${integrationArg}`);
          logError('Supported: claude, aider, opencode');
          process.exit(1);
      }

      // Get passthrough args (everything after --)
      const passthroughArgs = command.args.slice(1);

      // Load config
      let config = loadConfig();

      // Apply options
      if (options.allowDataCollection) {
        config = { ...config, DATA_COLLECTION: 'allow' };
      }
      if (options.sort) {
        if (!['price', 'throughput', 'latency'].includes(options.sort)) {
          logError(`Invalid sort order: ${options.sort} (must be price|throughput|latency)`);
          process.exit(1);
        }
        config = { ...config, PROVIDER_SORT: options.sort };
      }

      // Handle API key
      if (options.key) {
        if (!isValidApiKeyFormat(options.key)) {
          logError("Invalid API key format (should start with 'sk-or-')");
          process.exit(1);
        }
        if (!await validateApiKey(options.key)) {
          process.exit(1);
        }
        config = { ...config, OPENROUTER_API_KEY: options.key };
      } else {
        const apiKey = await ensureApiKey(config);
        config = { ...config, OPENROUTER_API_KEY: apiKey };
      }

      // Handle model selection
      let selectedModel: string | null = null;
      let modelWasInteractive = false;

      if (options.model) {
        // Load models to validate
        const models = await loadModels(options.refreshModels);
        selectedModel = resolveModel(options.model, models);
        if (!selectedModel) {
          process.exit(1);
        }
      } else if (config.DEFAULT_MODEL) {
        logInfo(`Using default model: ${config.DEFAULT_MODEL}`);
        selectedModel = config.DEFAULT_MODEL;
      } else {
        // Interactive selection
        const models = await loadModels(options.refreshModels);
        selectedModel = await selectModel(models);
        if (!selectedModel) {
          logError('No model selected');
          process.exit(1);
        }
        modelWasInteractive = true;
      }

      // Save as default if requested
      if (options.saveDefault) {
        saveConfig({
          OPENROUTER_API_KEY: config.OPENROUTER_API_KEY,
          DEFAULT_MODEL: selectedModel
        });
      } else if (modelWasInteractive) {
        await maybeSaveDefaultModel(selectedModel, config.DEFAULT_MODEL);
      }

      // Update config with selected model
      config = { ...config, DEFAULT_MODEL: selectedModel };

      // Launch integration
      switch (integration) {
        case 'claude':
          launchClaude(selectedModel, config, passthroughArgs);
          break;
        case 'aider':
          launchAider(selectedModel, config, passthroughArgs);
          break;
        case 'opencode':
          launchOpenCode(selectedModel, config, passthroughArgs);
          break;
      }
    });

  // Add help text for model aliases
  program.addHelpText('after', `
${chalk.bold('Model Aliases:')}
    sonnet    -> anthropic/claude-sonnet-4
    opus      -> anthropic/claude-opus-4
    haiku     -> anthropic/claude-haiku
    flash     -> google/gemini-2.0-flash
    gpt4      -> openai/gpt-4o

${chalk.bold('Examples:')}
    openrouter-launch                    # Interactive mode (launches Claude)
    openrouter-launch claude             # Launch Claude Code
    openrouter-launch claude -m sonnet   # Use Claude Sonnet with Claude Code
    openrouter-launch aider -m sonnet    # Launch Aider with Claude Sonnet
    openrouter-launch opencode           # Launch OpenCode
    openrouter-launch oc                 # Launch OpenCode (short alias)
    openrouter-launch -m flash           # Use Gemini Flash
    openrouter-launch --sort price       # Prefer cheapest providers

${chalk.bold('Config:')}
    Settings saved to: ${getConfigFile()}

For more information: https://openrouter.ai/docs
`);

  await program.parseAsync();
}

// Run main
main().catch((error) => {
  logError(error.message || 'An unexpected error occurred');
  process.exit(1);
});
