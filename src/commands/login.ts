import chalk from 'chalk';
import { login, logout } from '../auth.js';

export async function loginCommand(options: { manual?: boolean }): Promise<void> {
  if (options.manual) {
    console.log(chalk.gray('Manual mode — paste the URL below into any browser.'));
  } else {
    console.log(chalk.gray('Opening browser for TickTick authorization...'));
  }
  try {
    await login({ manual: options.manual });
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
