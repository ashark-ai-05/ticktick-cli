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
    .option('--project-id <id>', 'Filter by project ID (exact)')
    .option('--project <name>', 'Filter by project name (resolved)')
    .option('--today', 'Tasks due today')
    .option('--overdue', 'Tasks past due')
    .option('--week', 'Tasks due this week')
    .option('--tag <tag>', 'Filter by tag')
    .option('--priority <level>', 'Filter by priority (0, 1, 3, or 5)')
    .action(async (opts: { projectId?: string; project?: string; today?: boolean; overdue?: boolean; week?: boolean; tag?: string; priority?: string }) => {
      const client = getClient();
      // --project-id takes precedence over --project
      const projectFilter = opts.projectId ?? opts.project;
      let data = await client.getAllTasks(projectFilter);

      const now = new Date();
      const todayStr = now.toISOString().substring(0, 10);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().substring(0, 10);

      if (opts.today) {
        data = data.filter((t) => t.dueDate && t.dueDate.substring(0, 10) === todayStr);
      }
      if (opts.overdue) {
        data = data.filter((t) => t.dueDate && t.dueDate.substring(0, 10) < todayStr && t.status === 0);
      }
      if (opts.week) {
        data = data.filter((t) => t.dueDate && t.dueDate.substring(0, 10) >= todayStr && t.dueDate.substring(0, 10) <= weekEndStr);
      }
      if (opts.tag) {
        const tagLower = opts.tag.toLowerCase();
        data = data.filter((t) => t.tags?.some((tag) => tag.toLowerCase() === tagLower));
      }
      if (opts.priority) {
        const p = parseInt(opts.priority, 10);
        data = data.filter((t) => t.priority === p);
      }

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
    .option('--project-id <id>', 'Target project ID (exact; takes precedence over --project)')
    .option('--project <name>', 'Target project name (resolved; use --project-id for exact IDs)')
    .option('--due <date>', 'Due date (tomorrow, +3d, next monday, 2026-04-01T14:30:00+0000)')
    .option('--start <date>', 'Start date (same formats as --due)')
    .option('--priority <level>', 'Priority: 0 (none), 1 (low), 3 (medium), 5 (high)')
    .option('--content <text>', 'Task content/description')
    .option('--tags <tags>', 'Comma-separated tags (e.g. work,urgent)')
    .option('--subtasks <items>', 'Comma-separated subtask titles (e.g. "step 1,step 2")')
    .option('--reminder <triggers>', 'Comma-separated reminders (e.g. 0m,5m,30m,1h,1d)')
    .option('--repeat <rrule>', 'Recurrence rule (e.g. RRULE:FREQ=WEEKLY;BYDAY=MO,WE)')
    .option('--all-day', 'Mark as all-day task')
    .action(async (title: string, opts: { projectId?: string; project?: string; due?: string; start?: string; priority?: string; content?: string; tags?: string; subtasks?: string; reminder?: string; repeat?: string; allDay?: boolean }) => {
      const client = getClient();
      let resolvedProject: string | undefined;
      // --project-id takes precedence; if only --project provided, resolve by name
      const projectInput = opts.projectId ?? opts.project;
      if (projectInput) {
        try {
          resolvedProject = opts.projectId ?? await client.resolveProjectId(opts.project!);
          // Validate the project actually exists (catches raw IDs that don't exist)
          await client.getProject(resolvedProject);
        } catch {
          console.error(chalk.red(`Project not found: ${projectInput}. Run: ticktick projects list`));
          process.exit(1);
        }
      }
      const params: CreateTaskParams = {
        title,
        ...(resolvedProject && { projectId: resolvedProject }),
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
    .option('--project-id <id>', 'Project ID (exact; takes precedence over --project)')
    .option('--project <nameOrId>', 'Project name or ID')
    .option('--title <title>', 'New title')
    .option('--due <date>', 'Due date (use "none" to clear)')
    .option('--start <date>', 'Start date (use "none" to clear)')
    .option('--priority <level>', 'Priority: 0, 1, 3, or 5')
    .option('--content <text>', 'Task content')
    .option('--tags <tags>', 'Replace all tags (use "none" to clear)')
    .option('--add-tag <tags...>', 'Add one or more tags without replacing existing ones')
    .option('--remove-tag <tags...>', 'Remove one or more specific tags')
    .option('--reminder <triggers>', 'Comma-separated reminders (use "none" to clear)')
    .option('--repeat <rrule>', 'Recurrence rule (use "none" to clear)')
    .action(async (taskId: string, opts: { projectId?: string; project?: string; title?: string; due?: string; start?: string; priority?: string; content?: string; tags?: string; addTag?: string[]; removeTag?: string[]; reminder?: string; repeat?: string }) => {
      const client = getClient();

      const projectInput = opts.projectId ?? opts.project;
      if (!projectInput) {
        console.error(chalk.red('Either --project-id or --project is required.'));
        process.exit(1);
      }
      const resolvedProject = opts.projectId ?? await client.resolveProjectId(opts.project!);

      // For --add-tag and --remove-tag, fetch current task first to merge tags
      let currentTags: string[] | undefined;
      if (opts.addTag || opts.removeTag) {
        const current = await client.getTask(resolvedProject, taskId);
        currentTags = current.tags ?? [];
        if (opts.addTag) {
          for (const tag of opts.addTag) {
            const trimmed = tag.trim();
            if (trimmed && !currentTags.includes(trimmed)) currentTags.push(trimmed);
          }
        }
        if (opts.removeTag) {
          const toRemove = new Set(opts.removeTag.map((t) => t.trim()));
          currentTags = currentTags.filter((t) => !toRemove.has(t));
        }
      }

      const params: UpdateTaskParams = {
        id: taskId,
        projectId: resolvedProject,
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
    .command('move <taskId>')
    .description('Move a task to a different project (get → create in target → delete from source)')
    .requiredOption('--project-id <id>', 'Source project ID')
    .requiredOption('--target-project <id>', 'Target project ID')
    .action(async (taskId: string, opts: { projectId: string; targetProject: string }) => {
      const client = getClient();
      const task = await client.getTask(opts.projectId, taskId);
      const created = await client.createTask({
        title: task.title,
        projectId: opts.targetProject,
        ...(task.content && { content: task.content }),
        ...(task.tags && { tags: task.tags }),
        ...(task.priority !== undefined && { priority: task.priority }),
        ...(task.dueDate && { dueDate: task.dueDate }),
        ...(task.startDate && { startDate: task.startDate }),
      });
      await client.deleteTask(opts.projectId, taskId);
      if (!program.opts().json) {
        console.log(chalk.green(`Task moved to project ${opts.targetProject}`));
      }
      output(created, program.opts().json);
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
