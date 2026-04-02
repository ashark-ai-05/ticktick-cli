import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import open from 'open';
import {
  CREDENTIALS_PATH,
  TICKTICK_DIR,
  AUTH_URL,
  TOKEN_URL,
  SCOPES,
  loadConfig,
} from './config.js';
import { AuthError, type Credentials } from './types.js';

export function loadCredentials(): Credentials {
  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(raw) as Credentials;
  } catch {
    throw new AuthError('No credentials found — run `ticktick login` first');
  }
}

function saveCredentials(creds: Credentials): void {
  mkdirSync(TICKTICK_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2));
  chmodSync(CREDENTIALS_PATH, 0o600);
}

// TickTick's OAuth does not issue refresh tokens.
// Access tokens last ~6 months. Re-login is required when they expire.

export async function getToken(): Promise<string> {
  const creds = loadCredentials();
  if (creds.expires_at) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec >= creds.expires_at) {
      throw new AuthError('Token expired — run `ticktick login` to re-authenticate');
    }
    const daysLeft = Math.floor((creds.expires_at - nowSec) / 86400);
    if (daysLeft <= 7) {
      console.error(`Warning: token expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — run \`ticktick login\` to renew`);
    }
  }
  return creds.access_token;
}

export async function login(options?: { manual?: boolean }): Promise<void> {
  const config = loadConfig();
  const state = randomBytes(16).toString('hex');
  const manual = options?.manual ?? false;

  const redirectUrl = new URL(config.redirect_uri);
  const port = parseInt(redirectUrl.port || '8090', 10);

  return new Promise<void>((resolve, reject) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url!, `http://localhost:${port}`);

        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (returnedState !== state) {
          res.writeHead(400);
          res.end('State mismatch — possible CSRF attack. Please try again.');
          server.close();
          reject(new Error('State mismatch'));
          return;
        }

        if (!code) {
          res.writeHead(400);
          res.end('No authorization code received.');
          server.close();
          reject(new Error('No code'));
          return;
        }

        // Exchange code for token
        const basicAuth = Buffer.from(`${config.client_id}:${config.client_secret}`).toString('base64');

        const tokenRes = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            scope: SCOPES,
            redirect_uri: config.redirect_uri,
          }).toString(),
        });

        if (!tokenRes.ok) {
          const errorText = await tokenRes.text();
          res.writeHead(500);
          res.end(`Token exchange failed: ${errorText}`);
          server.close();
          reject(new Error(`Token exchange failed: ${errorText}`));
          return;
        }

        const tokenData = (await tokenRes.json()) as Record<string, unknown>;
        const expiresIn = typeof tokenData.expires_in === 'number' ? tokenData.expires_in : undefined;
        const creds: Credentials = {
          access_token: tokenData.access_token as string,
          refresh_token: tokenData.refresh_token as string | undefined,
          expires_at: expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : undefined,
        };
        saveCredentials(creds);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Logged in to TickTick!</h1><p>You can close this tab.</p></body></html>');
        server.close();
        resolve();
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    const host = manual ? '0.0.0.0' : undefined;
    server.listen(port, host, () => {
      const authUrl = new URL(AUTH_URL);
      authUrl.searchParams.set('client_id', config.client_id);
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('redirect_uri', config.redirect_uri);
      authUrl.searchParams.set('response_type', 'code');

      if (manual) {
        console.log(`\nOpen this URL in your browser:\n\n  ${authUrl.toString()}\n`);
        console.log(`Waiting for callback on ${config.redirect_uri} ...\n`);
      } else {
        open(authUrl.toString());
      }
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Login timed out — no callback received within 2 minutes'));
    }, 120_000);
  });
}

export function logout(): void {
  try {
    unlinkSync(CREDENTIALS_PATH);
  } catch {
    // Already logged out — ignore
  }
}
