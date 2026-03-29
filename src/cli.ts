#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerProjectCommands } from './commands/projects.js';
import { registerTaskCommands } from './commands/tasks.js';
import { registerNoteCommands } from './commands/notes.js';
import { loginCommand, logoutCommand } from './commands/login.js';
import { ApiError } from './types.js';
import { TickTickClient } from './client.js';
import { getToken } from './auth.js';
import { output } from './formatters.js';

const program = new Command();

program
  .name('ticktick')
  .description('TickTick CLI — manage tasks and projects from the terminal')
  .version('0.1.0')
  .option('--json', 'Output raw JSON')
  .option('--pretty', 'Human-formatted output (default)');

program.command('login').description('Authenticate with TickTick').action(loginCommand);
program.command('logout').description('Clear stored credentials').action(logoutCommand);

program
  .command('status')
  .description('Dashboard: overdue, today, upcoming tasks, and project summary')
  .action(async () => {
    const client = new TickTickClient(getToken);
    const status = await client.getStatus();
    const json = program.opts().json;

    if (json) {
      output(status, true);
      return;
    }

    if (status.overdue.length > 0) {
      console.log(chalk.red.bold(`\nOverdue (${status.overdue.length}):`));
      for (const t of status.overdue) {
        console.log(`  ${chalk.red('!')} ${t.title} ${chalk.gray(`(due ${t.dueDate!.substring(0, 10)})`)}`);
      }
    }

    if (status.today.length > 0) {
      console.log(chalk.yellow.bold(`\nToday (${status.today.length}):`));
      for (const t of status.today) {
        console.log(`  ${chalk.yellow('>')} ${t.title}`);
      }
    }

    if (status.upcoming.length > 0) {
      console.log(chalk.blue.bold(`\nUpcoming this week (${status.upcoming.length}):`));
      for (const t of status.upcoming) {
        console.log(`  ${chalk.blue('-')} ${t.title} ${chalk.gray(`(${t.dueDate!.substring(0, 10)})`)}`);
      }
    }

    if (status.overdue.length === 0 && status.today.length === 0 && status.upcoming.length === 0) {
      console.log(chalk.green('\nAll clear — no overdue, today, or upcoming tasks.'));
    }

    console.log(chalk.gray(`\nTotal open tasks: ${status.totalTasks}`));
    console.log(chalk.gray(`Projects: ${status.projectSummary.filter((p) => p.taskCount > 0).map((p) => `${p.name}(${p.taskCount})`).join(', ')}`));
  });

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
