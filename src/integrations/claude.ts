import spawn from 'cross-spawn';
import { logError, commandExists } from '../utils.js';
import type { Config } from '../config.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api';

/**
 * Check if Claude Code is installed
 */
export function checkClaudeInstalled(): boolean {
  if (!commandExists('claude')) {
    logError('Claude Code not found');
    logError('Install it from: https://docs.anthropic.com/en/docs/claude-code');
    return false;
  }
  return true;
}

/**
 * Launch Claude Code with OpenRouter configuration
 */
export function launchClaude(
  model: string,
  config: Config,
  passthroughArgs: string[]
): void {
  if (!checkClaudeInstalled()) {
    process.exit(1);
  }

  // Set environment variables for Claude Code
  const env = {
    ...process.env,
    ANTHROPIC_BASE_URL: OPENROUTER_BASE_URL,
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_AUTH_TOKEN: config.OPENROUTER_API_KEY,
    ANTHROPIC_MODEL: model
  };

  console.error('');
  console.error('Launching Claude Code with OpenRouter...');
  console.error(`  Model: ${model}`);
  console.error(`  Base URL: ${OPENROUTER_BASE_URL}`);
  console.error(`  Data collection: ${config.DATA_COLLECTION}`);
  if (config.PROVIDER_SORT) {
    console.error(`  Provider sort: ${config.PROVIDER_SORT}`);
  }
  console.error('');

  // Note: Provider preferences (data_collection, sort) require request body modifications.
  // Claude Code's Anthropic SDK doesn't support custom request body fields.
  // These preferences are saved for future integration support.
  // For now, you can set account-wide preferences at: https://openrouter.ai/settings/privacy

  // Spawn Claude Code, replacing this process
  const result = spawn.sync('claude', passthroughArgs, {
    env,
    stdio: 'inherit'
  });

  // Exit with the same code as Claude
  process.exit(result.status ?? 0);
}
