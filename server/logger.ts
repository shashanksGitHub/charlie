/**
 * Simple logging utility to control verbose output
 */

// Set to false to reduce verbose logging
const VERBOSE_LOGGING = false;

export function debugLog(...args: any[]) {
  if (VERBOSE_LOGGING) {
    console.log(...args);
  }
}

export function log(...args: any[]) {
  console.log(...args);
}

export function errorLog(...args: any[]) {
  console.error(...args);
}