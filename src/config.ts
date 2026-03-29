import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync } from 'node:fs';
import type { AppConfig } from './types.js';

export const TICKTICK_DIR = join(homedir(), '.ticktick');
export const CONFIG_PATH = join(TICKTICK_DIR, 'config.json');
export const CREDENTIALS_PATH = join(TICKTICK_DIR, 'credentials.json');

export const BASE_URL = 'https://api.ticktick.com/open/v1';
export const AUTH_URL = 'https://ticktick.com/oauth/authorize';
export const TOKEN_URL = 'https://ticktick.com/oauth/token';
export const SCOPES = 'tasks:write tasks:read';

export function loadConfig(): AppConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw) as AppConfig;
    if (!config.client_id || !config.client_secret) {
      throw new Error('client_id and client_secret are required in config.json');
    }
    return config;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Config not found at ${CONFIG_PATH} — create it with client_id, client_secret, and redirect_uri`);
    }
    throw err;
  }
}
