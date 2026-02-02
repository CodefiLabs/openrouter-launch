import spawn from 'cross-spawn';
import { logError, commandExists } from '../utils.js';
import type { Config } from '../config.js';

/**
 * Check if OpenCode is installed
 */
export function checkOpenCodeInstalled(): boolean {
  if (!commandExists('opencode')) {
    logError('OpenCode not found');
    logError('Install it from: https://github.com/opencode-ai/opencode');
    return false;
  }
  return true;
}

/**
 * Launch OpenCode with OpenRouter configuration
 */
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

  console.error('');
  console.error('Launching OpenCode with OpenRouter...');
  console.error(`  Model: ${model}`);
  console.error(`  Data collection: ${config.DATA_COLLECTION}`);
  if (config.PROVIDER_SORT) {
    console.error(`  Provider sort: ${config.PROVIDER_SORT}`);
  }
  console.error('');
  console.error('Note: OpenCode may use its own default OpenRouter models');
  console.error('      unless you configure ~/.opencode.json with your preferred model.');
  console.error('');

  // Spawn OpenCode, replacing this process
  const result = spawn.sync('opencode', passthroughArgs, {
    env,
    stdio: 'inherit'
  });

  // Exit with the same code as OpenCode
  process.exit(result.status ?? 0);
}
