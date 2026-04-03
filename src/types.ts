// --- API Response Types ---

export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  priority: number;
  sortOrder?: number;
  items?: ChecklistItem[];
  status?: number;
  completedTime?: string;
  tags?: string[];
}

export interface ChecklistItem {
  id?: string;
  title: string;
  status: number;
  completedTime?: string;
  isAllDay?: boolean;
  sortOrder?: number;
  startDate?: string;
  timeZone?: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  closed?: boolean;
  groupId?: string;
  viewMode?: string;
  permission?: string;
  kind?: string;
}

export interface ProjectData {
  project: Project;
  tasks: Task[];
  columns: Column[];
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
}

// --- Request Parameter Types ---

export interface CreateTaskParams {
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  priority?: number;
  sortOrder?: number;
  items?: Omit<ChecklistItem, 'id'>[];
  projectId?: string;
  tags?: string[];
}

export interface UpdateTaskParams {
  id: string;
  projectId: string;
  title?: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  priority?: number;
  sortOrder?: number;
  items?: ChecklistItem[];
  tags?: string[];
}

export interface CreateProjectParams {
  name: string;
  color?: string;
  sortOrder?: number;
  viewMode?: string;
  kind?: string;
}

export interface UpdateProjectParams {
  name?: string;
  color?: string;
  sortOrder?: number;
  viewMode?: string;
  kind?: string;
}

// --- Config Types ---

export interface AppConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface Credentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// --- Error Types ---

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthError extends ApiError {
  constructor(message: string = 'Unauthorized — run `ticktick login` to re-authenticate') {
    super(401, message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Cannot reach TickTick. Check internet.') {
    super(message);
    this.name = 'NetworkError';
  }
}
