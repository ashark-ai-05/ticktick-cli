import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { output } from '../src/formatters.js';
import type { Task, Project, ProjectData } from '../src/types.js';

// Strip ANSI escape codes so tests are colour-agnostic
function strip(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// Capture all console.log calls made during fn() and return them joined
function capture(fn: () => void): string {
  const lines: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    lines.push(args.map(String).join(' '));
  });
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  return lines.join('\n');
}

// ------ Fixtures ------

const sampleTask: Task = {
  id: 'task-001',
  projectId: 'proj-001',
  title: 'Buy groceries',
  priority: 1,
  dueDate: '2025-06-15T09:00:00+0000',
  isAllDay: false,
  tags: ['personal'],
};

const allDayTask: Task = {
  id: 'task-002',
  projectId: 'proj-001',
  title: 'Team offsite',
  priority: 3,
  dueDate: '2025-07-01T00:00:00+0000',
  isAllDay: true,
};

const sampleProject: Project = {
  id: 'proj-001',
  name: 'Personal',
  color: '#FF0000',
  viewMode: 'list',
  kind: 'TASK',
};

// ------ JSON mode ------

describe('output — JSON mode', () => {
  it('serialises an array of tasks to pretty JSON', () => {
    const out = capture(() => output([sampleTask], true));
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe('task-001');
    expect(parsed[0].title).toBe('Buy groceries');
  });

  it('serialises a single task object to pretty JSON', () => {
    const out = capture(() => output(sampleTask, true));
    const parsed = JSON.parse(out);
    expect(parsed.id).toBe('task-001');
  });

  it('serialises an array of projects to pretty JSON', () => {
    const out = capture(() => output([sampleProject], true));
    const parsed = JSON.parse(out);
    expect(parsed[0].name).toBe('Personal');
  });

  it('serialises null/primitives', () => {
    const out = capture(() => output(null, true));
    expect(out.trim()).toBe('null');
  });
});

// ------ Table / human mode ------

describe('output — table mode (tasks)', () => {
  it('prints a header row with column labels', () => {
    const out = strip(capture(() => output([sampleTask], false)));
    expect(out).toContain('Title');
    expect(out).toContain('Due');
    expect(out).toContain('Priority');
    expect(out).toContain('ID');
  });

  it('prints each task title in the output', () => {
    const out = strip(capture(() => output([sampleTask, allDayTask], false)));
    expect(out).toContain('Buy groceries');
    expect(out).toContain('Team offsite');
  });

  it('prints task IDs', () => {
    const out = strip(capture(() => output([sampleTask], false)));
    expect(out).toContain('task-001');
  });

  it('prints a count footer', () => {
    const out = strip(capture(() => output([sampleTask, allDayTask], false)));
    expect(out).toContain('2 task(s)');
  });

  it('shows "No results." for an empty array', () => {
    const out = strip(capture(() => output([], false)));
    expect(out).toContain('No results.');
  });

  it('shows all-day due date without time (date only)', () => {
    const out = strip(capture(() => output([allDayTask], false)));
    // isAllDay → formatDueDate returns just date (no time)
    expect(out).toContain('2025-07-01');
    expect(out).not.toMatch(/2025-07-01 \d{2}:\d{2}/);
  });
});

describe('output — table mode (projects)', () => {
  it('prints project names', () => {
    const out = strip(capture(() => output([sampleProject], false)));
    expect(out).toContain('Personal');
  });

  it('prints a project count footer', () => {
    const out = strip(capture(() => output([sampleProject], false)));
    expect(out).toContain('1 project(s)');
  });
});

describe('output — single object mode', () => {
  it('prints single task detail (title + ID)', () => {
    const out = strip(capture(() => output(sampleTask, false)));
    expect(out).toContain('Buy groceries');
    expect(out).toContain('task-001');
  });

  it('prints single project detail (name + ID)', () => {
    const out = strip(capture(() => output(sampleProject, false)));
    expect(out).toContain('Personal');
    expect(out).toContain('proj-001');
  });

  it('prints ProjectData (project + tasks)', () => {
    const data: ProjectData = {
      project: sampleProject,
      tasks: [sampleTask],
      columns: [],
    };
    const out = strip(capture(() => output(data, false)));
    expect(out).toContain('Personal');
    expect(out).toContain('Buy groceries');
  });

  it('prints "No tasks" message when ProjectData has no tasks', () => {
    const data: ProjectData = {
      project: sampleProject,
      tasks: [],
      columns: [],
    };
    const out = strip(capture(() => output(data, false)));
    expect(out).toContain('No tasks in this project.');
  });
});

describe('output — task with subtasks', () => {
  it('prints subtask titles and completion status', () => {
    const taskWithSubs: Task = {
      ...sampleTask,
      items: [
        { title: 'Milk', status: 0 },
        { title: 'Eggs', status: 1 },
      ],
    };
    const out = strip(capture(() => output(taskWithSubs, false)));
    expect(out).toContain('Subtasks');
    expect(out).toContain('Milk');
    expect(out).toContain('Eggs');
    expect(out).toContain('[x]');
    expect(out).toContain('[ ]');
  });
});
