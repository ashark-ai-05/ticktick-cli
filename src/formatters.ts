import chalk from 'chalk';
import type { Task, Project, ProjectData } from './types.js';

const PRIORITY_LABELS: Record<number, string> = {
  0: chalk.gray('none'),
  1: chalk.blue('low'),
  3: chalk.yellow('medium'),
  5: chalk.red('high'),
};

export function output(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data) && data.length === 0) {
    console.log(chalk.gray('No results.'));
    return;
  }

  // Detect type and format accordingly
  if (Array.isArray(data) && data.length > 0) {
    if ('title' in data[0] && 'projectId' in data[0]) {
      formatTasks(data as Task[]);
    } else if ('name' in data[0] && 'id' in data[0] && !('projectId' in data[0])) {
      formatProjects(data as Project[]);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
    return;
  }

  if (data && typeof data === 'object') {
    if ('tasks' in data && 'project' in data) {
      formatProjectData(data as ProjectData);
    } else if ('title' in data && 'projectId' in data) {
      formatTask(data as Task);
    } else if ('name' in data && 'id' in data) {
      formatProject(data as Project);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
    return;
  }

  console.log(data);
}

function formatDueDate(raw: string, isAllDay?: boolean): string {
  const d = new Date(raw);
  const date = raw.substring(0, 10);
  if (isAllDay) return date;
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return (h === '00' && m === '00') ? date : `${date} ${h}:${m}`;
}

function formatTasks(tasks: Task[]): void {
  const header = `${chalk.bold.underline('Title'.padEnd(40))} ${chalk.bold.underline('Due'.padEnd(18))} ${chalk.bold.underline('Priority'.padEnd(10))} ${chalk.bold.underline('ID')}`;
  console.log(header);

  for (const task of tasks) {
    const title = task.title.substring(0, 38).padEnd(40);
    const due = task.dueDate ? formatDueDate(task.dueDate, task.isAllDay).padEnd(18) : chalk.gray('—'.padEnd(18));
    const priority = (PRIORITY_LABELS[task.priority] ?? chalk.gray('none')).padEnd(10 + 10); // chalk adds hidden chars
    const id = chalk.gray(task.id);
    console.log(`${title} ${due} ${priority} ${id}`);
  }

  console.log(chalk.gray(`\n${tasks.length} task(s)`));
}

function formatTask(task: Task): void {
  console.log(chalk.bold(task.title));
  console.log(chalk.gray('─'.repeat(40)));
  if (task.content) console.log(`Content:  ${task.content}`);
  console.log(`Priority: ${PRIORITY_LABELS[task.priority] ?? 'none'}`);
  if (task.dueDate) console.log(`Due:      ${formatDueDate(task.dueDate, task.isAllDay)}`);
  if (task.startDate) console.log(`Start:    ${formatDueDate(task.startDate, task.isAllDay)}`);
  if (task.tags && task.tags.length > 0) console.log(`Tags:     ${task.tags.map((t) => chalk.cyan(t)).join(', ')}`);
  if (task.reminders && task.reminders.length > 0) console.log(`Remind:   ${task.reminders.join(', ')}`);
  if (task.repeatFlag) console.log(`Repeat:   ${task.repeatFlag}`);
  console.log(`Project:  ${chalk.gray(task.projectId)}`);
  console.log(`ID:       ${chalk.gray(task.id)}`);
  if (task.items && task.items.length > 0) {
    console.log(`\nSubtasks:`);
    for (const item of task.items) {
      const check = item.status === 1 ? chalk.green('[x]') : chalk.gray('[ ]');
      console.log(`  ${check} ${item.title}`);
    }
  }
}

function formatProjects(projects: Project[]): void {
  const header = `${chalk.bold.underline('Name'.padEnd(30))} ${chalk.bold.underline('View'.padEnd(10))} ${chalk.bold.underline('Kind'.padEnd(6))} ${chalk.bold.underline('ID')}`;
  console.log(header);

  for (const project of projects) {
    const colorSwatch = project.color ? chalk.hex(project.color)('\u25CF ') : '  ';
    const name = (colorSwatch + project.name).substring(0, 28).padEnd(30);
    const view = (project.viewMode ?? 'list').padEnd(10);
    const kind = (project.kind ?? 'TASK').padEnd(6);
    const id = chalk.gray(project.id);
    console.log(`${name} ${view} ${kind} ${id}`);
  }

  console.log(chalk.gray(`\n${projects.length} project(s)`));
}

function formatProject(project: Project): void {
  const colorSwatch = project.color ? chalk.hex(project.color)('\u25CF ') : '';
  console.log(chalk.bold(`${colorSwatch}${project.name}`));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`View:  ${project.viewMode ?? 'list'}`);
  console.log(`Kind:  ${project.kind ?? 'TASK'}`);
  if (project.color) console.log(`Color: ${project.color}`);
  console.log(`ID:    ${chalk.gray(project.id)}`);
}

function formatProjectData(data: ProjectData): void {
  formatProject(data.project);
  if (data.tasks.length > 0) {
    console.log(`\n${chalk.bold('Tasks:')}`);
    formatTasks(data.tasks);
  } else {
    console.log(chalk.gray('\nNo tasks in this project.'));
  }
}

export function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(`${message} (y/N) `);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data: string) => {
      resolve(data.trim().toLowerCase() === 'y');
    });
  });
}
