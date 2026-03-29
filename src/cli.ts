#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerProjectCommands } from './commands/projects.js';
import { registerTaskCommands } from './commands/tasks.js';
import { registerNoteCommands } from './commands/notes.js';
import { loginCommand, logoutCommand } from './commands/login.js';
import { ApiError } from './types.js';

const program = new Command();

program
  .name('ticktick')
  .description('TickTick CLI — manage tasks and projects from the terminal')
  .version('0.1.0')
  .option('--json', 'Output raw JSON')
  .option('--pretty', 'Human-formatted output (default)');

program.command('login').description('Authenticate with TickTick').action(loginCommand);
program.command('logout').description('Clear stored credentials').action(logoutCommand);

registerProjectCommands(program);
registerTaskCommands(program);
registerNoteCommands(program);

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof ApiError) {
      if (program.opts().json) {
        console.log(JSON.stringify({ error: err.message, statusCode: err.statusCode }));
      } else {
        console.error(chalk.red(`Error: ${err.message}`));
      }
      process.exit(1);
    }
    throw err;
  }
}

main();
