import type { Command } from 'commander';
import chalk from 'chalk';
import { TickTickClient } from '../client.js';
import { getToken } from '../auth.js';
import { output, confirm } from '../formatters.js';
import type { CreateTaskParams, UpdateTaskParams, Task } from '../types.js';

function getClient(): TickTickClient {
  return new TickTickClient(getToken);
}

async function getNoteProjectIds(client: TickTickClient): Promise<string[]> {
  const projects = await client.getProjects();
  return projects.filter((p) => p.kind === 'NOTE').map((p) => p.id);
}

export function registerNoteCommands(program: Command): void {
  const notes = program.command('notes').description('Manage notes (items in NOTE-kind projects)');

  notes
    .command('list')
    .description('List all notes across NOTE projects')
    .option('--project <projectId>', 'Filter by specific NOTE project')
    .action(async (opts: { project?: string }) => {
      const client = getClient();
      if (opts.project) {
        const data = await client.getAllTasks(opts.project);
        output(data, program.opts().json);
        return;
      }
      const noteProjectIds = await getNoteProjectIds(client);
      const allNotes: Task[] = [];
      for (const projectId of noteProjectIds) {
        try {
          const data = await client.getProjectData(projectId);
          allNotes.push(...data.tasks);
        } catch {
          // Skip projects that fail
        }
      }
      output(allNotes, program.opts().json);
    });

  notes
    .command('get <projectId> <noteId>')
    .description('Get a specific note')
    .action(async (projectId: string, noteId: string) => {
      const client = getClient();
      const data = await client.getTask(projectId, noteId);
      output(data, program.opts().json);
    });

  notes
    .command('create <title>')
    .description('Create a new note')
    .requiredOption('--project <projectId>', 'Target NOTE project ID')
    .option('--content <text>', 'Note content')
    .action(async (title: string, opts: { project: string; content?: string }) => {
      const client = getClient();
      const params: CreateTaskParams = {
        title,
        projectId: opts.project,
        ...(opts.content && { content: opts.content }),
      };
      const data = await client.createTask(params);
      output(data, program.opts().json);
    });

  notes
    .command('update <noteId>')
    .description('Update a note')
    .requiredOption('--project <projectId>', 'Project ID (required)')
    .option('--title <title>', 'New title')
    .option('--content <text>', 'New content')
    .action(async (noteId: string, opts: { project: string; title?: string; content?: string }) => {
      const client = getClient();
      const params: UpdateTaskParams = {
        id: noteId,
        projectId: opts.project,
        ...(opts.title && { title: opts.title }),
        ...(opts.content && { content: opts.content }),
      };
      const data = await client.updateTask(noteId, params);
      output(data, program.opts().json);
    });

  notes
    .command('delete <projectId> <noteId>')
    .description('Delete a note')
    .option('--force', 'Skip confirmation')
    .action(async (projectId: string, noteId: string, opts: { force?: boolean }) => {
      if (!opts.force && !program.opts().json) {
        const ok = await confirm(chalk.red(`Delete note ${noteId}?`));
        if (!ok) {
          console.log('Cancelled.');
          return;
        }
      }
      const client = getClient();
      await client.deleteTask(projectId, noteId);
      if (!program.opts().json) {
        console.log(chalk.green('Note deleted.'));
      } else {
        output({ deleted: true, projectId, noteId }, true);
      }
    });
}
