import spawn from 'cross-spawn';
import { logError, commandExists } from '../utils.js';
import type { Config } from '../config.js';

/**
 * Check if Aider is installed
 */
export function checkAiderInstalled(): boolean {
  if (!commandExists('aider')) {
    logError('Aider not found');
    logError('Install it from: https://aider.chat/docs/install.html');
    return false;
  }
  return true;
}

/**
 * Launch Aider with OpenRouter configuration
 */
export function launchAider(
  model: string,
  config: Config,
  passthroughArgs: string[]
): void {
  if (!checkAiderInstalled()) {
    process.exit(1);
  }

  // Aider uses OPENROUTER_API_KEY directly
  const env = {
    ...process.env,
    OPENROUTER_API_KEY: config.OPENROUTER_API_KEY
  };

  // Aider uses openrouter/<model> format for model selection
  const aiderModel = `openrouter/${model}`;

  console.error('');
  console.error('Launching Aider with OpenRouter...');
  console.error(`  Model: ${aiderModel}`);
  console.error(`  Data collection: ${config.DATA_COLLECTION}`);
  if (config.PROVIDER_SORT) {
    console.error(`  Provider sort: ${config.PROVIDER_SORT}`);
  }
  console.error('');

  // Build args: --model first, then passthrough args
  const args = ['--model', aiderModel, ...passthroughArgs];

  // Spawn Aider, replacing this process
  const result = spawn.sync('aider', args, {
    env,
    stdio: 'inherit'
  });

  // Exit with the same code as Aider
  process.exit(result.status ?? 0);
}
