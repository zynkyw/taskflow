export enum TaskStatus {
  Todo = "todo",
  InProgress = "in_progress",
  Done = "done",
  Cancelled = "cancelled",
}

export enum TaskPriority {
  Low = "low",
  Medium = "medium",
  High = "high",
  Urgent = "urgent",
}

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  [TaskPriority.Low]: 0,
  [TaskPriority.Medium]: 1,
  [TaskPriority.High]: 2,
  [TaskPriority.Urgent]: 3,
};

export interface TaskProps {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  tags: string[];
  dueDate: string | null; // ISO date string
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  projectId?: string | null;
  tags?: string[];
  dueDate?: string | null;
}

/**
 * Task is the core domain entity of TaskFlow.
 * It is intentionally kept as a plain, serializable class so it can be
 * persisted to JSON without any custom (de)serialization logic beyond
 * toJSON/fromJSON.
 */
export class Task {
  readonly id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  tags: string[];
  dueDate: string | null;
  readonly createdAt: string;
  updatedAt: string;
  completedAt: string | null;

  constructor(props: TaskProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.projectId = props.projectId;
    this.tags = props.tags;
    this.dueDate = props.dueDate;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.completedAt = props.completedAt;
  }

  static create(id: string, input: CreateTaskInput, now: string = new Date().toISOString()): Task {
    return new Task({
      id,
      title: input.title,
      description: input.description,
      status: TaskStatus.Todo,
      priority: input.priority ?? TaskPriority.Medium,
      projectId: input.projectId ?? null,
      tags: input.tags ?? [],
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
  }

  markStatus(status: TaskStatus, now: string = new Date().toISOString()): void {
    this.status = status;
    this.updatedAt = now;
    this.completedAt = status === TaskStatus.Done ? now : null;
  }

  isOverdue(referenceDate: Date = new Date()): boolean {
    if (!this.dueDate || this.status === TaskStatus.Done || this.status === TaskStatus.Cancelled) {
      return false;
    }
    return new Date(this.dueDate).getTime() < referenceDate.getTime();
  }

  addTag(tag: string): void {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !this.tags.includes(normalized)) {
      this.tags.push(normalized);
      this.updatedAt = new Date().toISOString();
    }
  }

  removeTag(tag: string): void {
    const normalized = tag.trim().toLowerCase();
    this.tags = this.tags.filter((t) => t !== normalized);
    this.updatedAt = new Date().toISOString();
  }

  toJSON(): TaskProps {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      projectId: this.projectId,
      tags: this.tags,
      dueDate: this.dueDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
    };
  }

  static fromJSON(data: TaskProps): Task {
    return new Task(data);
  }
}
