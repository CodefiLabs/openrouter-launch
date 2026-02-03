import spawn from 'cross-spawn';
import { existsSync, readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logError, logInfo, logSuccess, commandExists } from '../utils.js';
import type { Config } from '../config.js';

const CODEX_CONFIG_DIR = join(homedir(), '.codex');
const CODEX_CONFIG_FILE = join(CODEX_CONFIG_DIR, 'config.toml');

const OPENROUTER_PROVIDER_CONFIG = `
[model_providers.openrouter]
name = "OpenRouter"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "chat"
`;

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
 * Check if OpenRouter provider is configured in Codex config
 */
function isOpenRouterConfigured(): boolean {
  if (!existsSync(CODEX_CONFIG_FILE)) {
    return false;
  }

  const config = readFileSync(CODEX_CONFIG_FILE, 'utf-8');
  return config.includes('[model_providers.openrouter]');
}

/**
 * Add OpenRouter provider to Codex config
 */
function addOpenRouterConfig(): boolean {
  try {
    // Create config directory if it doesn't exist
    if (!existsSync(CODEX_CONFIG_DIR)) {
      mkdirSync(CODEX_CONFIG_DIR, { recursive: true });
    }

    // Create or append to config file
    if (!existsSync(CODEX_CONFIG_FILE)) {
      writeFileSync(CODEX_CONFIG_FILE, OPENROUTER_PROVIDER_CONFIG.trim() + '\n');
    } else {
      appendFileSync(CODEX_CONFIG_FILE, '\n' + OPENROUTER_PROVIDER_CONFIG.trim() + '\n');
    }

    logSuccess('Added OpenRouter provider to Codex config');
    return true;
  } catch (error) {
    logError(`Failed to update Codex config: ${error}`);
    return false;
  }
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

  // Check if OpenRouter provider is configured, add it if not
  if (!isOpenRouterConfigured()) {
    logInfo('OpenRouter provider not found in Codex config');
    logInfo(`Adding to ${CODEX_CONFIG_FILE}...`);
    if (!addOpenRouterConfig()) {
      logError('To configure manually, add this to ~/.codex/config.toml:');
      console.error(OPENROUTER_PROVIDER_CONFIG);
      process.exit(1);
    }
  }

  // Codex uses OPENROUTER_API_KEY directly when model_provider=openrouter is set
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

  // Build args: --model and config override for provider first, then passthrough args
  // Codex CLI uses -c for config overrides, not --provider
  const args = ['--model', model, '-c', 'model_provider="openrouter"', ...passthroughArgs];

  // Spawn Codex, replacing this process
  const result = spawn.sync('codex', args, {
    env,
    stdio: 'inherit'
  });

  // Exit with the same code as Codex
  process.exit(result.status ?? 0);
}
