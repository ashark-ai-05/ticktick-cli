import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ------ Mock node:fs before importing config ------
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from 'node:fs';
import {
  loadConfig,
  CONFIG_PATH,
  CREDENTIALS_PATH,
  TICKTICK_DIR,
  BASE_URL,
  AUTH_URL,
  TOKEN_URL,
  SCOPES,
} from '../src/config.js';

const mockReadFileSync = vi.mocked(readFileSync);

// ------ Constants ------

describe('config constants', () => {
  it('TICKTICK_DIR is under the home directory', () => {
    expect(TICKTICK_DIR).toBe(join(homedir(), '.ticktick'));
  });

  it('CONFIG_PATH is TICKTICK_DIR/config.json', () => {
    expect(CONFIG_PATH).toBe(join(homedir(), '.ticktick', 'config.json'));
  });

  it('CREDENTIALS_PATH is TICKTICK_DIR/credentials.json', () => {
    expect(CREDENTIALS_PATH).toBe(join(homedir(), '.ticktick', 'credentials.json'));
  });

  it('BASE_URL points to the TickTick open API', () => {
    expect(BASE_URL).toBe('https://api.ticktick.com/open/v1');
  });

  it('AUTH_URL points to the TickTick OAuth authorize endpoint', () => {
    expect(AUTH_URL).toBe('https://ticktick.com/oauth/authorize');
  });

  it('TOKEN_URL points to the TickTick OAuth token endpoint', () => {
    expect(TOKEN_URL).toBe('https://ticktick.com/oauth/token');
  });

  it('SCOPES includes tasks read and write', () => {
    expect(SCOPES).toContain('tasks:read');
    expect(SCOPES).toContain('tasks:write');
  });
});

// ------ loadConfig() ------

describe('loadConfig()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns parsed config when file contains valid JSON', () => {
    const validConfig = {
      client_id: 'my-client-id',
      client_secret: 'my-client-secret',
      redirect_uri: 'http://localhost:3000/callback',
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(validConfig));

    const config = loadConfig();
    expect(config.client_id).toBe('my-client-id');
    expect(config.client_secret).toBe('my-client-secret');
    expect(config.redirect_uri).toBe('http://localhost:3000/callback');
  });

  it('throws when client_id is missing', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ client_secret: 'secret', redirect_uri: 'http://localhost' })
    );
    expect(() => loadConfig()).toThrow('client_id and client_secret are required');
  });

  it('throws when client_secret is missing', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ client_id: 'id', redirect_uri: 'http://localhost' })
    );
    expect(() => loadConfig()).toThrow('client_id and client_secret are required');
  });

  it('throws a helpful "Config not found" error when file does not exist', () => {
    const notFound = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
    mockReadFileSync.mockImplementation(() => { throw notFound; });

    expect(() => loadConfig()).toThrow(/Config not found at/);
    expect(() => loadConfig()).toThrow(/config\.json/);
  });

  it('re-throws non-ENOENT errors (e.g. malformed JSON)', () => {
    mockReadFileSync.mockReturnValue('not-valid-json{{{');
    expect(() => loadConfig()).toThrow(SyntaxError);
  });

  it('reads from the correct path (CONFIG_PATH)', () => {
    const validConfig = {
      client_id: 'x',
      client_secret: 'y',
      redirect_uri: 'z',
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(validConfig));
    loadConfig();
    expect(mockReadFileSync).toHaveBeenCalledWith(CONFIG_PATH, 'utf-8');
  });
});
