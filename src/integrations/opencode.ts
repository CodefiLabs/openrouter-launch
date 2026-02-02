import spawn from 'cross-spawn';
import { logError, commandExists } from '../utils.js';
import type { Config } from '../config.js';

/**
 * Mapping from OpenRouter model IDs to OpenCode internal model IDs.
 * OpenCode uses format like 'openrouter.claude-3.7-sonnet' internally.
 *
 * To find supported models, check OpenCode's model configuration:
 * https://github.com/opencode-ai/opencode
 */
const OPENCODE_MODEL_MAP: Record<string, string> = {
  // Anthropic Claude models
  'anthropic/claude-3.7-sonnet': 'openrouter.claude-3.7-sonnet',
  'anthropic/claude-3.5-sonnet': 'openrouter.claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku': 'openrouter.claude-3.5-haiku',
  'anthropic/claude-3-haiku': 'openrouter.claude-3-haiku',
  'anthropic/claude-3-opus': 'openrouter.claude-3-opus',
  // OpenAI GPT models
  'openai/gpt-4o': 'openrouter.gpt-4o',
  'openai/gpt-4o-mini': 'openrouter.gpt-4o-mini',
  'openai/gpt-4.1': 'openrouter.gpt-4.1',
  'openai/gpt-4.1-mini': 'openrouter.gpt-4.1-mini',
  'openai/gpt-4.1-nano': 'openrouter.gpt-4.1-nano',
  'openai/gpt-4.5-preview': 'openrouter.gpt-4.5-preview',
  // OpenAI reasoning models
  'openai/o1': 'openrouter.o1',
  'openai/o1-pro': 'openrouter.o1-pro',
  'openai/o1-mini': 'openrouter.o1-mini',
  'openai/o3': 'openrouter.o3',
  'openai/o3-mini-high': 'openrouter.o3-mini',
  'openai/o4-mini-high': 'openrouter.o4-mini',
  // Google Gemini models
  'google/gemini-2.5-flash-preview:thinking': 'openrouter.gemini-2.5-flash',
  'google/gemini-2.5-pro-preview-03-25': 'openrouter.gemini-2.5',
  // DeepSeek models
  'deepseek/deepseek-r1-0528:free': 'openrouter.deepseek-r1-free',
};

/**
 * Map an OpenRouter model ID to OpenCode's internal format.
 * Returns null if the model is not in OpenCode's supported list.
 */
function mapToOpenCodeModel(model: string): string | null {
  return OPENCODE_MODEL_MAP[model] || null;
}

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

  // Map model to OpenCode's internal format
  const openCodeModel = mapToOpenCodeModel(model);

  console.error('');
  console.error('Launching OpenCode with OpenRouter...');
  console.error(`  Model: ${model}`);

  // Build args - prepend --model if we have a valid mapping
  let args: string[];
  if (openCodeModel) {
    args = ['--model', openCodeModel, ...passthroughArgs];
    console.error(`  OpenCode model ID: ${openCodeModel}`);
  } else {
    args = passthroughArgs;
    console.error('');
    console.error(`  Warning: Model '${model}' is not in OpenCode's supported list.`);
    console.error('  OpenCode will use its default model configuration.');
    console.error('  You can configure a model in ~/.opencode.json or use a supported model.');
  }

  console.error(`  Data collection: ${config.DATA_COLLECTION}`);
  if (config.PROVIDER_SORT) {
    console.error(`  Provider sort: ${config.PROVIDER_SORT}`);
  }
  console.error('');

  // Spawn OpenCode, replacing this process
  const result = spawn.sync('opencode', args, {
    env,
    stdio: 'inherit'
  });

  // Exit with the same code as OpenCode
  process.exit(result.status ?? 0);
}
