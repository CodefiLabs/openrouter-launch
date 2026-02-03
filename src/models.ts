import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ora from 'ora';
import chalk from 'chalk';
import { logInfo, logError, formatPrice } from './utils.js';
import Enquirer from 'enquirer';

export interface Model {
  id: string;
  pricing: string;
  promptPrice: number;
  completionPrice: number;
}

interface ModelChoice {
  name: string;
  message: string;
  value: string;
}

const CACHE_DIR = path.join(os.homedir(), '.cache', 'openrouter');
const CACHE_FILE = path.join(CACHE_DIR, 'models.json');
const CACHE_TTL = 3600; // 1 hour in seconds

// Fallback model list (used when API fetch fails and no cache)
const FALLBACK_MODELS: Model[] = [
  { id: 'anthropic/claude-sonnet-4', pricing: '$3/$15 per 1M tokens', promptPrice: 3, completionPrice: 15 },
  { id: 'anthropic/claude-opus-4', pricing: '$15/$75 per 1M tokens', promptPrice: 15, completionPrice: 75 },
  { id: 'anthropic/claude-haiku', pricing: '$0.25/$1.25 per 1M tokens', promptPrice: 0.25, completionPrice: 1.25 },
  { id: 'google/gemini-2.0-flash', pricing: '$0.10/$0.40 per 1M tokens', promptPrice: 0.10, completionPrice: 0.40 },
  { id: 'google/gemini-2.5-pro', pricing: '$1.25/$10 per 1M tokens', promptPrice: 1.25, completionPrice: 10 },
  { id: 'openai/gpt-4o', pricing: '$2.50/$10 per 1M tokens', promptPrice: 2.50, completionPrice: 10 },
  { id: 'openai/gpt-4o-mini', pricing: '$0.15/$0.60 per 1M tokens', promptPrice: 0.15, completionPrice: 0.60 },
  { id: 'deepseek/deepseek-chat-v3', pricing: '$0.14/$0.28 per 1M tokens', promptPrice: 0.14, completionPrice: 0.28 },
  { id: 'meta-llama/llama-3.3-70b-instruct', pricing: '$0.30/$0.40 per 1M tokens', promptPrice: 0.30, completionPrice: 0.40 },
  { id: 'qwen/qwen-2.5-coder-32b-instruct', pricing: '$0.20/$0.20 per 1M tokens', promptPrice: 0.20, completionPrice: 0.20 }
];

// Coding model prefixes (prioritized in model list)
const CODING_MODEL_PREFIXES = [
  'anthropic/claude',
  'openai/gpt-4',
  'openai/o1',
  'openai/o3',
  'google/gemini',
  'deepseek/deepseek',
  'meta-llama/llama',
  'qwen/qwen',
  'mistralai/mistral',
  'mistralai/codestral',
  'x-ai/grok'
];

// Model aliases
const MODEL_ALIASES: Record<string, string> = {
  'sonnet': 'anthropic/claude-sonnet-4',
  'sonnet4': 'anthropic/claude-sonnet-4',
  'opus': 'anthropic/claude-opus-4',
  'opus4': 'anthropic/claude-opus-4',
  'haiku': 'anthropic/claude-haiku',
  'flash': 'google/gemini-2.0-flash',
  'gemini': 'google/gemini-2.5-pro',
  'gemini-pro': 'google/gemini-2.5-pro',
  'gpt4': 'openai/gpt-4o',
  'gpt4o': 'openai/gpt-4o',
  'gpt4-mini': 'openai/gpt-4o-mini',
  'gpt4o-mini': 'openai/gpt-4o-mini',
  'deepseek': 'deepseek/deepseek-chat-v3',
  'llama': 'meta-llama/llama-3.3-70b-instruct',
  'llama3': 'meta-llama/llama-3.3-70b-instruct',
  'qwen': 'qwen/qwen-2.5-coder-32b-instruct',
  'qwen-coder': 'qwen/qwen-2.5-coder-32b-instruct'
};

/**
 * Check if a model is a coding-focused model
 */
function isCodingModel(modelId: string): boolean {
  return CODING_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix));
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Check if cache is valid (exists and not expired)
 */
function isCacheValid(): boolean {
  if (!fs.existsSync(CACHE_FILE)) {
    return false;
  }

  try {
    const stats = fs.statSync(CACHE_FILE);
    const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
    return ageSeconds < CACHE_TTL;
  } catch {
    return false;
  }
}

/**
 * Load models from cache
 */
function loadFromCache(): Model[] | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(CACHE_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);

    const codingModels: Model[] = [];
    const otherModels: Model[] = [];

    for (const line of lines) {
      const [id, promptStr, completionStr] = line.split('|');
      if (!id || !promptStr || !completionStr) continue;

      const promptPrice = parseFloat(promptStr);
      const completionPrice = parseFloat(completionStr);
      const pricing = `${formatPrice(promptPrice)}/${formatPrice(completionPrice)} per 1M tokens`;

      const model: Model = { id, pricing, promptPrice, completionPrice };

      if (isCodingModel(id)) {
        codingModels.push(model);
      } else {
        otherModels.push(model);
      }
    }

    // Combine: coding models first, then others
    const result = [...codingModels, ...otherModels];

    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Fetch models from OpenRouter API
 */
async function fetchModels(): Promise<boolean> {
  const spinner = ora('Fetching models from OpenRouter...').start();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      spinner.fail('Failed to fetch models from API');
      return false;
    }

    const data = await response.json() as { data: Array<{
      id: string;
      pricing?: { prompt?: string; completion?: string };
    }> };

    if (!data.data || !Array.isArray(data.data)) {
      spinner.fail('Invalid API response');
      return false;
    }

    // Parse models
    const parsed: string[] = [];

    for (const model of data.data) {
      if (!model.id || !model.pricing?.prompt || !model.pricing?.completion) continue;

      // Skip free models
      if (model.id.endsWith(':free')) continue;

      const promptPrice = parseFloat(model.pricing.prompt) * 1000000;
      const completionPrice = parseFloat(model.pricing.completion) * 1000000;

      if (isNaN(promptPrice) || isNaN(completionPrice)) continue;

      parsed.push(`${model.id}|${promptPrice}|${completionPrice}`);
    }

    if (parsed.length === 0) {
      spinner.fail('Failed to parse model data');
      return false;
    }

    // Sort by model ID
    parsed.sort();

    // Save to cache
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, parsed.join('\n'));

    spinner.succeed(`Model list updated (${parsed.length} models)`);
    return true;
  } catch (error) {
    spinner.fail('Failed to fetch models from API');
    return false;
  }
}

/**
 * Load models with caching and fallback
 */
export async function loadModels(forceRefresh = false): Promise<Model[]> {
  // Try cache first (if not forcing refresh)
  if (!forceRefresh && isCacheValid()) {
    const cached = loadFromCache();
    if (cached) return cached;
  }

  // Try to fetch fresh data
  if (await fetchModels()) {
    const cached = loadFromCache();
    if (cached) return cached;
  }

  // Try stale cache as fallback
  if (fs.existsSync(CACHE_FILE)) {
    logInfo('Using cached model list (may be outdated)');
    const cached = loadFromCache();
    if (cached) return cached;
  }

  // Ultimate fallback: hardcoded list
  logInfo('Using built-in model list');
  return FALLBACK_MODELS;
}

/**
 * Resolve a model alias to its full name
 */
export function resolveAlias(alias: string): string {
  return MODEL_ALIASES[alias] || alias;
}

/**
 * Check if a model exists in the model list or is a valid format
 */
export function modelExists(modelId: string, models: Model[]): boolean {
  // Check loaded models
  if (models.some(m => m.id === modelId)) {
    return true;
  }

  // Check fallback models
  if (FALLBACK_MODELS.some(m => m.id === modelId)) {
    return true;
  }

  // Accept any model in provider/model format
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(modelId)) {
    return true;
  }

  return false;
}

/**
 * Resolve a model name or alias, validating it exists
 */
export function resolveModel(input: string, models: Model[]): string | null {
  const resolved = resolveAlias(input);

  if (modelExists(resolved, models)) {
    return resolved;
  }

  logError(`Unknown model: ${input}`);
  logError('Use --help to see available models and aliases');
  return null;
}

/**
 * Get pricing for a model
 */
export function getModelPricing(modelId: string, models: Model[]): string {
  const model = models.find(m => m.id === modelId);
  return model?.pricing || 'unknown pricing';
}

/**
 * Interactive model selection menu with fuzzy search
 */
export async function selectModel(models: Model[]): Promise<string | null> {
  if (models.length === 0) {
    logError('No models available');
    return null;
  }

  // Build choices array for enquirer
  const choices: ModelChoice[] = models.map(model => ({
    name: model.id,
    message: model.id.padEnd(40, ' ') + chalk.dim(model.pricing),
    value: model.id
  }));

  console.error('');
  console.error(chalk.dim('↑↓ Navigate • Type to filter • Enter to select • Esc to cancel'));
  console.error('');

  try {
    // Use static prompt method with type assertion for autocomplete options
    // (suggest is a valid option but not in the type definitions)
    const response = await Enquirer.prompt<{ model: string }>({
      type: 'autocomplete',
      name: 'model',
      message: 'Select a model',
      limit: 15,
      choices,
      suggest(input: string, choices: ModelChoice[]) {
        const search = input.toLowerCase();

        // First check if input matches an alias
        const aliasMatch = MODEL_ALIASES[search];
        if (aliasMatch) {
          return choices.filter(choice => choice.name === aliasMatch);
        }

        // Otherwise fuzzy match on model name
        return choices.filter(choice =>
          choice.name.toLowerCase().includes(search)
        );
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    console.error(''); // Blank line after prompt
    return response.model;
  } catch (error) {
    // User cancelled (Ctrl+C or Escape)
    return null;
  }
}

/**
 * Get list of model aliases for help text
 */
export function getModelAliases(): Record<string, string> {
  return { ...MODEL_ALIASES };
}
