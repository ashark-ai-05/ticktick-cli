import type { Command } from 'commander';
import chalk from 'chalk';
import { TickTickClient } from '../client.js';
import { getToken } from '../auth.js';
import { output, confirm } from '../formatters.js';
import type { CreateProjectParams, UpdateProjectParams } from '../types.js';

function getClient(): TickTickClient {
  return new TickTickClient(getToken);
}

export function registerProjectCommands(program: Command): void {
  const projects = program.command('projects').description('Manage projects');

  projects
    .command('list')
    .description('List all projects')
    .action(async () => {
      const client = getClient();
      const data = await client.getProjects();
      output(data, program.opts().json);
    });

  projects
    .command('get <projectId>')
    .description('Get project details')
    .option('--with-tasks', 'Include all tasks and columns')
    .action(async (projectId: string, opts: { withTasks?: boolean }) => {
      const client = getClient();
      if (opts.withTasks) {
        const data = await client.getProjectData(projectId);
        output(data, program.opts().json);
      } else {
        const data = await client.getProject(projectId);
        output(data, program.opts().json);
      }
    });

  projects
    .command('create <name>')
    .description('Create a new project')
    .option('--color <hex>', 'Color hex code (e.g. "#F18181")')
    .option('--view <mode>', 'View mode: list, kanban, or timeline')
    .option('--kind <type>', 'Project type: TASK or NOTE')
    .action(async (name: string, opts: { color?: string; view?: string; kind?: string }) => {
      const client = getClient();
      const params: CreateProjectParams = {
        name,
        ...(opts.color && { color: opts.color }),
        ...(opts.view && { viewMode: opts.view }),
        ...(opts.kind && { kind: opts.kind }),
      };
      const data = await client.createProject(params);
      output(data, program.opts().json);
    });

  projects
    .command('update <projectId>')
    .description('Update a project')
    .option('--name <name>', 'New project name')
    .option('--color <hex>', 'Color hex code')
    .option('--view <mode>', 'View mode: list, kanban, or timeline')
    .action(async (projectId: string, opts: { name?: string; color?: string; view?: string }) => {
      const client = getClient();
      const params: UpdateProjectParams = {
        ...(opts.name && { name: opts.name }),
        ...(opts.color && { color: opts.color }),
        ...(opts.view && { viewMode: opts.view }),
      };
      const data = await client.updateProject(projectId, params);
      output(data, program.opts().json);
    });

  projects
    .command('delete <projectId>')
    .description('Delete a project')
    .option('--force', 'Skip confirmation')
    .action(async (projectId: string, opts: { force?: boolean }) => {
      if (!opts.force && !program.opts().json) {
        const ok = await confirm(chalk.red(`Delete project ${projectId}?`));
        if (!ok) {
          console.log('Cancelled.');
          return;
        }
      }
      const client = getClient();
      await client.deleteProject(projectId);
      if (!program.opts().json) {
        console.log(chalk.green('Project deleted.'));
      } else {
        output({ deleted: true, projectId }, true);
      }
    });
}
