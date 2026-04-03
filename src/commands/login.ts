import { createInterface } from 'node:readline';
import { writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import chalk from 'chalk';
import { login, logout } from '../auth.js';
import { TICKTICK_DIR, CREDENTIALS_PATH } from '../config.js';
import type { Command } from 'commander';

export function registerLoginCommands(program: Command): void {
  program
    .command('login')
    .description('Authenticate with TickTick')
    .option('--manual', 'Manually enter access token (skips OAuth, prompts for token via stdin)')
    .action(loginCommand);

  program.command('logout').description('Clear stored credentials').action(logoutCommand);
}

export async function loginCommand(options: { manual?: boolean }): Promise<void> {
  if (options.manual) {
    // Readline prompt: ask user to paste token directly
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const token = await new Promise<string>((resolve) => {
      rl.question(chalk.cyan('Enter your TickTick access token: '), (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    if (!token) {
      console.error(chalk.red('No token provided — aborting.'));
      process.exit(1);
    }
    mkdirSync(TICKTICK_DIR, { recursive: true });
    writeFileSync(CREDENTIALS_PATH, JSON.stringify({ access_token: token }, null, 2));
    chmodSync(CREDENTIALS_PATH, 0o600);
    console.log(chalk.green(`Token saved to ${CREDENTIALS_PATH}`));
    return;
  }

  console.log(chalk.gray('Opening browser for TickTick authorization...'));
  try {
    await login({ manual: false });
    console.log(chalk.green('Logged in successfully!'));
  } catch (err) {
    console.error(chalk.red(`Login failed: ${(err as Error).message}`));
    process.exit(1);
  }
}

export function logoutCommand(): void {
  logout();
  console.log(chalk.green('Logged out — credentials cleared.'));
}
