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

  async getAllTasks(projectId?: string): Promise<Task[]> {
    if (projectId) {
      const data = await this.getProjectData(projectId);
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
}
