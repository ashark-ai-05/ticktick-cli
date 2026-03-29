import type { Command } from 'commander';
import chalk from 'chalk';
import { TickTickClient } from '../client.js';
import { getToken } from '../auth.js';
import { output, confirm } from '../formatters.js';
import { parseDate } from '../date-parser.js';
import type { CreateTaskParams, UpdateTaskParams } from '../types.js';

function getClient(): TickTickClient {
  return new TickTickClient(getToken);
}

export function registerTaskCommands(program: Command): void {
  const tasks = program.command('tasks').description('Manage tasks');

  tasks
    .command('list')
    .description('List all tasks')
    .option('--project <projectId>', 'Filter by project')
    .action(async (opts: { project?: string }) => {
      const client = getClient();
      const data = await client.getAllTasks(opts.project);
      output(data, program.opts().json);
    });

  tasks
    .command('get <projectId> <taskId>')
    .description('Get a specific task')
    .action(async (projectId: string, taskId: string) => {
      const client = getClient();
      const data = await client.getTask(projectId, taskId);
      output(data, program.opts().json);
    });

  tasks
    .command('create <title>')
    .description('Create a new task')
    .option('--project <projectId>', 'Target project ID')
    .option('--due <date>', 'Due date (tomorrow, +3d, next monday, 2026-04-01)')
    .option('--priority <level>', 'Priority: 0 (none), 1 (low), 3 (medium), 5 (high)')
    .option('--content <text>', 'Task content/description')
    .action(async (title: string, opts: { project?: string; due?: string; priority?: string; content?: string }) => {
      const client = getClient();
      const params: CreateTaskParams = {
        title,
        ...(opts.project && { projectId: opts.project }),
        ...(opts.due && { dueDate: parseDate(opts.due) }),
        ...(opts.priority && { priority: parseInt(opts.priority, 10) }),
        ...(opts.content && { content: opts.content }),
      };
      const data = await client.createTask(params);
      output(data, program.opts().json);
    });

  tasks
    .command('update <taskId>')
    .description('Update a task')
    .requiredOption('--project <projectId>', 'Project ID (required)')
    .option('--title <title>', 'New title')
    .option('--due <date>', 'Due date')
    .option('--priority <level>', 'Priority: 0, 1, 3, or 5')
    .option('--content <text>', 'Task content')
    .action(async (taskId: string, opts: { project: string; title?: string; due?: string; priority?: string; content?: string }) => {
      const client = getClient();
      const params: UpdateTaskParams = {
        id: taskId,
        projectId: opts.project,
        ...(opts.title && { title: opts.title }),
        ...(opts.due && { dueDate: parseDate(opts.due) }),
        ...(opts.priority && { priority: parseInt(opts.priority, 10) }),
        ...(opts.content && { content: opts.content }),
      };
      const data = await client.updateTask(taskId, params);
      output(data, program.opts().json);
    });

  tasks
    .command('complete <projectId> <taskId>')
    .description('Mark a task as complete')
    .action(async (projectId: string, taskId: string) => {
      const client = getClient();
      await client.completeTask(projectId, taskId);
      if (!program.opts().json) {
        console.log(chalk.green('Task completed!'));
      } else {
        output({ completed: true, projectId, taskId }, true);
      }
    });

  tasks
    .command('delete <projectId> <taskId>')
    .description('Delete a task')
    .option('--force', 'Skip confirmation')
    .action(async (projectId: string, taskId: string, opts: { force?: boolean }) => {
      if (!opts.force && !program.opts().json) {
        const ok = await confirm(chalk.red(`Delete task ${taskId}?`));
        if (!ok) {
          console.log('Cancelled.');
          return;
        }
      }
      const client = getClient();
      await client.deleteTask(projectId, taskId);
      if (!program.opts().json) {
        console.log(chalk.green('Task deleted.'));
      } else {
        output({ deleted: true, projectId, taskId }, true);
      }
    });
}
