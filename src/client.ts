import { BASE_URL } from './config.js';
import {
  ApiError,
  AuthError,
  NotFoundError,
  type Task,
  type Project,
  type ProjectData,
  type CreateTaskParams,
  type UpdateTaskParams,
  type CreateProjectParams,
  type UpdateProjectParams,
} from './types.js';
import { refreshToken } from './auth.js';

export class TickTickClient {
  private hasRetried = false;

  constructor(private getToken: () => Promise<string>) {}

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const token = await this.getToken();

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    // Auto-refresh on 401 and retry once
    if (res.status === 401 && !this.hasRetried) {
      this.hasRetried = true;
      try {
        const newCreds = await refreshToken();
        this.getToken = async () => newCreds.access_token;
        return this.request<T>(method, path, body);
      } catch {
        throw new AuthError();
      } finally {
        this.hasRetried = false;
      }
    }

    if (res.status === 401) {
      this.hasRetried = false;
      throw new AuthError();
    }

    if (res.status === 404) {
      throw new NotFoundError();
    }

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || `API error: ${res.statusText}`);
    }

    // Some endpoints return no content (complete, delete)
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  // --- Projects ---

  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('GET', '/project');
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>('GET', `/project/${projectId}`);
  }

  async getProjectData(projectId: string): Promise<ProjectData> {
    return this.request<ProjectData>('GET', `/project/${projectId}/data`);
  }

  async createProject(params: CreateProjectParams): Promise<Project> {
    return this.request<Project>('POST', '/project', params as unknown as Record<string, unknown>);
  }

  async updateProject(projectId: string, params: UpdateProjectParams): Promise<Project> {
    return this.request<Project>('POST', `/project/${projectId}`, params as unknown as Record<string, unknown>);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.request<void>('DELETE', `/project/${projectId}`);
  }

  // --- Tasks ---

  async getTask(projectId: string, taskId: string): Promise<Task> {
    return this.request<Task>('GET', `/project/${projectId}/task/${taskId}`);
  }

  async createTask(params: CreateTaskParams): Promise<Task> {
    return this.request<Task>('POST', '/task', params as unknown as Record<string, unknown>);
  }

  async updateTask(taskId: string, params: UpdateTaskParams): Promise<Task> {
    return this.request<Task>('POST', `/task/${taskId}`, params as unknown as Record<string, unknown>);
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    return this.request<void>('POST', `/project/${projectId}/task/${taskId}/complete`);
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    return this.request<void>('DELETE', `/project/${projectId}/task/${taskId}`);
  }

  // --- Convenience ---

  async resolveProjectId(nameOrId: string): Promise<string> {
    // If it looks like an ID (hex string or has digits), try it directly first
    if (/^[a-f0-9]{20,}$/.test(nameOrId) || nameOrId.startsWith('inbox')) {
      return nameOrId;
    }
    // Otherwise, search by name (case-insensitive, partial match)
    const projects = await this.getProjects();
    const lower = nameOrId.toLowerCase();
    // Strip emoji for matching — compare cleaned names
    const clean = (s: string) => s.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim().toLowerCase();
    const exact = projects.find((p) => clean(p.name) === lower || p.name.toLowerCase() === lower);
    if (exact) return exact.id;
    const partial = projects.find((p) => clean(p.name).includes(lower) || p.name.toLowerCase().includes(lower));
    if (partial) return partial.id;
    throw new NotFoundError(`No project matching "${nameOrId}"`);
  }

  async getAllTasks(projectId?: string): Promise<Task[]> {
    if (projectId) {
      const resolvedId = await this.resolveProjectId(projectId);
      const data = await this.getProjectData(resolvedId);
      return data.tasks;
    }

    const projects = await this.getProjects();
    const allTasks: Task[] = [];
    for (const project of projects) {
      try {
        const data = await this.getProjectData(project.id);
        allTasks.push(...data.tasks);
      } catch {
        // Skip projects that fail (e.g. shared projects with limited access)
      }
    }
    return allTasks;
  }

  async getStatus(): Promise<{
    overdue: Task[];
    today: Task[];
    upcoming: Task[];
    projectSummary: { id: string; name: string; taskCount: number }[];
    totalTasks: number;
  }> {
    const projects = await this.getProjects();
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().substring(0, 10);

    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const projectSummary: { id: string; name: string; taskCount: number }[] = [];
    let totalTasks = 0;

    for (const project of projects) {
      if (project.kind === 'NOTE') continue;
      try {
        const data = await this.getProjectData(project.id);
        const tasks = data.tasks.filter((t) => t.status === 0);
        projectSummary.push({ id: project.id, name: project.name, taskCount: tasks.length });
        totalTasks += tasks.length;

        for (const task of tasks) {
          if (!task.dueDate) continue;
          const due = task.dueDate.substring(0, 10);
          if (due < todayStr) overdue.push(task);
          else if (due === todayStr) today.push(task);
          else if (due <= weekEndStr) upcoming.push(task);
        }
      } catch {
        // Skip
      }
    }

    return { overdue, today, upcoming, projectSummary, totalTasks };
  }
}
