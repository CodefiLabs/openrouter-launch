import chalk from 'chalk';
import { execFileSync } from 'child_process';

/**
 * Log an info message to stderr
 */
export function logInfo(message: string): void {
  console.error(chalk.blue('[INFO]'), message);
}

/**
 * Log an error message to stderr
 */
export function logError(message: string): void {
  console.error(chalk.red('[ERROR]'), message);
}

/**
 * Log a success message to stderr
 */
export function logSuccess(message: string): void {
  console.error(chalk.green('✓'), message);
}

/**
 * Log a warning message to stderr
 */
export function logWarn(message: string): void {
  console.error(chalk.yellow('[WARN]'), message);
}

/**
 * Format a price nicely (e.g., 3.00 -> $3, 0.10 -> $0.10)
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${Math.round(price)}`;
  } else if (price > 0) {
    return `$${price.toFixed(2)}`;
  } else {
    return '$0';
  }
}

/**
 * Check if a command exists in the system PATH
 */
export function commandExists(command: string): boolean {
  try {
    // On Unix-like systems, use 'which'
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    // On Windows, use 'where'
    try {
      execFileSync('where', [command], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Validate an OpenRouter API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith('sk-or-');
}

/**
 * Validate an OpenRouter API key against the API
 */
export async function validateApiKey(key: string): Promise<boolean> {
  logInfo('Validating API key...');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${key}`
      }
    });

    if (response.status === 200) {
      logSuccess('API key validated successfully');
      return true;
    } else if (response.status === 401) {
      logError('Invalid API key (authentication failed)');
      return false;
    } else {
      logError(`Unexpected response from OpenRouter (HTTP ${response.status})`);
      return false;
    }
  } catch (error) {
    logError('Could not connect to OpenRouter API');
    logError('Check your internet connection');
    return false;
  }
}
