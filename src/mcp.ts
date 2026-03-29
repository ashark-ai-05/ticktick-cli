#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TickTickClient } from './client.js';
import { getToken } from './auth.js';

const client = new TickTickClient(getToken);
const server = new McpServer({
  name: 'ticktick',
  version: '0.1.0',
});

// --- Project Tools ---

server.tool('ticktick_list_projects', 'List all TickTick projects', {}, async () => {
  const projects = await client.getProjects();
  return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
});

server.tool(
  'ticktick_get_project',
  'Get a TickTick project by ID',
  { projectId: z.string().describe('Project ID') },
  async ({ projectId }) => {
    const project = await client.getProject(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
  },
);

server.tool(
  'ticktick_get_project_data',
  'Get a TickTick project with all its tasks and columns',
  { projectId: z.string().describe('Project ID') },
  async ({ projectId }) => {
    const data = await client.getProjectData(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'ticktick_create_project',
  'Create a new TickTick project',
  {
    name: z.string().describe('Project name'),
    color: z.string().optional().describe('Color hex code (e.g. "#F18181")'),
    viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('View mode'),
    kind: z.enum(['TASK', 'NOTE']).optional().describe('Project type'),
  },
  async (params) => {
    const project = await client.createProject(params);
    return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
  },
);

server.tool(
  'ticktick_update_project',
  'Update a TickTick project',
  {
    projectId: z.string().describe('Project ID'),
    name: z.string().optional().describe('New project name'),
    color: z.string().optional().describe('Color hex code'),
    viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('View mode'),
  },
  async ({ projectId, ...params }) => {
    const project = await client.updateProject(projectId, params);
    return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
  },
);

server.tool(
  'ticktick_delete_project',
  'Delete a TickTick project',
  { projectId: z.string().describe('Project ID') },
  async ({ projectId }) => {
    await client.deleteProject(projectId);
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, projectId }) }] };
  },
);

// --- Task Tools ---

server.tool(
  'ticktick_list_tasks',
  'List all tasks, optionally filtered by project',
  { projectId: z.string().optional().describe('Filter by project ID') },
  async ({ projectId }) => {
    const tasks = await client.getAllTasks(projectId);
    return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
  },
);

server.tool(
  'ticktick_get_task',
  'Get a specific task by project ID and task ID',
  {
    projectId: z.string().describe('Project ID'),
    taskId: z.string().describe('Task ID'),
  },
  async ({ projectId, taskId }) => {
    const task = await client.getTask(projectId, taskId);
    return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
  },
);

server.tool(
  'ticktick_create_task',
  'Create a new task in TickTick',
  {
    title: z.string().describe('Task title'),
    projectId: z.string().optional().describe('Target project ID'),
    content: z.string().optional().describe('Task content/description'),
    dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
    priority: z.number().optional().describe('Priority: 0 (none), 1 (low), 3 (medium), 5 (high)'),
    tags: z.array(z.string()).optional().describe('Tags (e.g. ["work", "urgent"])'),
    reminders: z.array(z.string()).optional().describe('Reminders in TRIGGER format (e.g. ["TRIGGER:PT0S", "TRIGGER:-PT5M"])'),
    repeatFlag: z.string().optional().describe('Recurrence rule (e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE")'),
  },
  async (params) => {
    const task = await client.createTask(params);
    return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
  },
);

server.tool(
  'ticktick_update_task',
  'Update an existing task',
  {
    taskId: z.string().describe('Task ID'),
    projectId: z.string().describe('Project ID (required)'),
    title: z.string().optional().describe('New title'),
    content: z.string().optional().describe('New content'),
    dueDate: z.string().optional().describe('Due date in ISO 8601 (empty string to clear)'),
    priority: z.number().optional().describe('Priority: 0, 1, 3, or 5'),
    tags: z.array(z.string()).optional().describe('Tags (empty array to clear)'),
    reminders: z.array(z.string()).optional().describe('Reminders in TRIGGER format (empty array to clear)'),
    repeatFlag: z.string().optional().describe('Recurrence rule (empty string to clear)'),
  },
  async ({ taskId, projectId, ...rest }) => {
    const task = await client.updateTask(taskId, { id: taskId, projectId, ...rest });
    return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
  },
);

server.tool(
  'ticktick_complete_task',
  'Mark a task as complete',
  {
    projectId: z.string().describe('Project ID'),
    taskId: z.string().describe('Task ID'),
  },
  async ({ projectId, taskId }) => {
    await client.completeTask(projectId, taskId);
    return { content: [{ type: 'text', text: JSON.stringify({ completed: true, projectId, taskId }) }] };
  },
);

server.tool(
  'ticktick_delete_task',
  'Delete a task',
  {
    projectId: z.string().describe('Project ID'),
    taskId: z.string().describe('Task ID'),
  },
  async ({ projectId, taskId }) => {
    await client.deleteTask(projectId, taskId);
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, projectId, taskId }) }] };
  },
);

// --- Start Server ---

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed:', err);
  process.exit(1);
});
