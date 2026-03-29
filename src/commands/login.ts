import chalk from 'chalk';
import { login, logout } from '../auth.js';

export async function loginCommand(): Promise<void> {
  console.log(chalk.gray('Opening browser for TickTick authorization...'));
  try {
    await login();
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
