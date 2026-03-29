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

function parseReminders(input: string): string[] {
  return input.split(',').map((r) => {
    const trimmed = r.trim();
    if (trimmed.startsWith('TRIGGER:')) return trimmed;
    const match = trimmed.match(/^(\d+)([mhd])$/i);
    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toUpperCase();
      if (amount === 0) return 'TRIGGER:PT0S';
      const isoUnit = unit === 'M' ? 'M' : unit === 'H' ? 'H' : 'D';
      return `TRIGGER:-PT${amount}${isoUnit}`;
    }
    return trimmed;
  });
}

function parseSubtasks(input: string): { title: string; status: number }[] {
  return input.split(',').map((s) => ({ title: s.trim(), status: 0 }));
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
    .option('--due <date>', 'Due date (tomorrow, +3d, next monday, 2026-04-01T14:30:00+0000)')
    .option('--start <date>', 'Start date (same formats as --due)')
    .option('--priority <level>', 'Priority: 0 (none), 1 (low), 3 (medium), 5 (high)')
    .option('--content <text>', 'Task content/description')
    .option('--tags <tags>', 'Comma-separated tags (e.g. work,urgent)')
    .option('--subtasks <items>', 'Comma-separated subtask titles (e.g. "step 1,step 2")')
    .option('--reminder <triggers>', 'Comma-separated reminders (e.g. 0m,5m,30m,1h,1d)')
    .option('--repeat <rrule>', 'Recurrence rule (e.g. RRULE:FREQ=WEEKLY;BYDAY=MO,WE)')
    .option('--all-day', 'Mark as all-day task')
    .action(async (title: string, opts: { project?: string; due?: string; start?: string; priority?: string; content?: string; tags?: string; subtasks?: string; reminder?: string; repeat?: string; allDay?: boolean }) => {
      const client = getClient();
      const params: CreateTaskParams = {
        title,
        ...(opts.project && { projectId: opts.project }),
        ...(opts.due && { dueDate: parseDate(opts.due) }),
        ...(opts.start && { startDate: parseDate(opts.start) }),
        ...(opts.priority && { priority: parseInt(opts.priority, 10) }),
        ...(opts.content && { content: opts.content }),
        ...(opts.tags && { tags: opts.tags.split(',').map((t) => t.trim()) }),
        ...(opts.subtasks && { items: parseSubtasks(opts.subtasks) }),
        ...(opts.reminder && { reminders: parseReminders(opts.reminder) }),
        ...(opts.repeat && { repeatFlag: opts.repeat }),
        ...(opts.allDay && { isAllDay: true }),
      };
      const data = await client.createTask(params);
      output(data, program.opts().json);
    });

  tasks
    .command('update <taskId>')
    .description('Update a task')
    .requiredOption('--project <projectId>', 'Project ID (required)')
    .option('--title <title>', 'New title')
    .option('--due <date>', 'Due date (use "none" to clear)')
    .option('--start <date>', 'Start date (use "none" to clear)')
    .option('--priority <level>', 'Priority: 0, 1, 3, or 5')
    .option('--content <text>', 'Task content')
    .option('--tags <tags>', 'Replace all tags (use "none" to clear)')
    .option('--add-tag <tag>', 'Add a tag without replacing existing ones')
    .option('--remove-tag <tag>', 'Remove a specific tag')
    .option('--reminder <triggers>', 'Comma-separated reminders (use "none" to clear)')
    .option('--repeat <rrule>', 'Recurrence rule (use "none" to clear)')
    .action(async (taskId: string, opts: { project: string; title?: string; due?: string; start?: string; priority?: string; content?: string; tags?: string; addTag?: string; removeTag?: string; reminder?: string; repeat?: string }) => {
      const client = getClient();

      // For --add-tag and --remove-tag, fetch current task first
      let currentTags: string[] | undefined;
      if (opts.addTag || opts.removeTag) {
        const current = await client.getTask(opts.project, taskId);
        currentTags = current.tags ?? [];
        if (opts.addTag) {
          const newTag = opts.addTag.trim();
          if (!currentTags.includes(newTag)) currentTags.push(newTag);
        }
        if (opts.removeTag) {
          currentTags = currentTags.filter((t) => t !== opts.removeTag!.trim());
        }
      }

      const params: UpdateTaskParams = {
        id: taskId,
        projectId: opts.project,
        ...(opts.title && { title: opts.title }),
        ...(opts.due && { dueDate: opts.due === 'none' ? '' : parseDate(opts.due) }),
        ...(opts.start && { startDate: opts.start === 'none' ? '' : parseDate(opts.start) }),
        ...(opts.priority && { priority: parseInt(opts.priority, 10) }),
        ...(opts.content && { content: opts.content }),
        ...(opts.tags && { tags: opts.tags === 'none' ? [] : opts.tags.split(',').map((t) => t.trim()) }),
        ...(currentTags && { tags: currentTags }),
        ...(opts.reminder && { reminders: opts.reminder === 'none' ? [] : parseReminders(opts.reminder) }),
        ...(opts.repeat && { repeatFlag: opts.repeat === 'none' ? '' : opts.repeat }),
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
