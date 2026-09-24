import { Storage } from "../storage/Storage.interface";
import { CreateTaskInput, PRIORITY_WEIGHT, Task, TaskPriority, TaskStatus } from "../models/Task";
import { generateId } from "../utils/idGenerator";
import { assertMaxLength, assertNonEmptyString, ValidationError } from "../utils/validators";

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string | null;
  tag?: string;
  overdueOnly?: boolean;
  search?: string;
}

export type TaskSortField = "priority" | "dueDate" | "createdAt" | "title";
export type SortDirection = "asc" | "desc";

export interface TaskStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  overdue: number;
  completionRate: number; // 0..1
}

const ID_PREFIX = "task";
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

export class TaskService {
  constructor(private readonly storage: Storage) {}

  async create(input: CreateTaskInput): Promise<Task> {
    assertNonEmptyString(input.title, "title");
    assertMaxLength(input.title, MAX_TITLE_LENGTH, "title");
    if (input.description) {
      assertMaxLength(input.description, MAX_DESCRIPTION_LENGTH, "description");
    }

    const db = await this.storage.load();

    if (input.projectId) {
      const projectExists = db.projects.some((p) => p.id === input.projectId);
      if (!projectExists) {
        throw new ValidationError(`Project "${input.projectId}" does not exist.`);
      }
    }

    const task = Task.create(generateId(ID_PREFIX), input);
    db.tasks.push(task.toJSON());
    await this.storage.save(db);
    return task;
  }

  async get(id: string): Promise<Task | null> {
    const db = await this.storage.load();
    const found = db.tasks.find((t) => t.id === id);
    return found ? Task.fromJSON(found) : null;
  }

  async list(filter: TaskFilter = {}): Promise<Task[]> {
    const db = await this.storage.load();
    let tasks = db.tasks.map(Task.fromJSON);

    if (filter.status) tasks = tasks.filter((t) => t.status === filter.status);
    if (filter.priority) tasks = tasks.filter((t) => t.priority === filter.priority);
    if (filter.projectId !== undefined) tasks = tasks.filter((t) => t.projectId === filter.projectId);
    if (filter.tag) tasks = tasks.filter((t) => t.tags.includes(filter.tag!.toLowerCase()));
    if (filter.overdueOnly) tasks = tasks.filter((t) => t.isOverdue());
    if (filter.search) {
      const q = filter.search.toLowerCase();
      tasks = tasks.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
      );
    }

    return tasks;
  }

  sort(tasks: Task[], field: TaskSortField, direction: SortDirection = "asc"): Task[] {
    const factor = direction === "asc" ? 1 : -1;
    const sorted = [...tasks].sort((a, b) => {
      switch (field) {
        case "priority":
          return (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * factor;
        case "dueDate": {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return (aTime - bTime) * factor;
        }
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
        case "title":
          return a.title.localeCompare(b.title) * factor;
        default:
          return 0;
      }
    });
    return sorted;
  }

  async update(id: string, changes: Partial<Pick<Task, "title" | "description" | "priority" | "dueDate" | "projectId">>): Promise<Task> {
    const db = await this.storage.load();
    const index = db.tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new ValidationError(`Task "${id}" not found.`);

    const task = Task.fromJSON(db.tasks[index]);
    if (changes.title !== undefined) {
      assertNonEmptyString(changes.title, "title");
      task.title = changes.title;
    }
    if (changes.description !== undefined) task.description = changes.description;
    if (changes.priority !== undefined) task.priority = changes.priority;
    if (changes.dueDate !== undefined) task.dueDate = changes.dueDate;
    if (changes.projectId !== undefined) task.projectId = changes.projectId;
    task.updatedAt = new Date().toISOString();

    db.tasks[index] = task.toJSON();
    await this.storage.save(db);
    return task;
  }

  async setStatus(id: string, status: TaskStatus): Promise<Task> {
    const db = await this.storage.load();
    const index = db.tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new ValidationError(`Task "${id}" not found.`);

    const task = Task.fromJSON(db.tasks[index]);
    task.markStatus(status);
    db.tasks[index] = task.toJSON();
    await this.storage.save(db);
    return task;
  }

  async delete(id: string): Promise<void> {
    const db = await this.storage.load();
    const before = db.tasks.length;
    db.tasks = db.tasks.filter((t) => t.id !== id);
    if (db.tasks.length === before) {
      throw new ValidationError(`Task "${id}" not found.`);
    }
    await this.storage.save(db);
  }

  async stats(filter: TaskFilter = {}): Promise<TaskStats> {
    const tasks = await this.list(filter);
    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.Todo]: 0,
      [TaskStatus.InProgress]: 0,
      [TaskStatus.Done]: 0,
      [TaskStatus.Cancelled]: 0,
    };
    const byPriority: Record<TaskPriority, number> = {
      [TaskPriority.Low]: 0,
      [TaskPriority.Medium]: 0,
      [TaskPriority.High]: 0,
      [TaskPriority.Urgent]: 0,
    };
    let overdue = 0;

    for (const task of tasks) {
      byStatus[task.status]++;
      byPriority[task.priority]++;
      if (task.isOverdue()) overdue++;
    }

    const relevantForCompletion = tasks.filter((t) => t.status !== TaskStatus.Cancelled);
    const completionRate =
      relevantForCompletion.length === 0
        ? 0
        : byStatus[TaskStatus.Done] / relevantForCompletion.length;

    return { total: tasks.length, byStatus, byPriority, overdue, completionRate };
  }
}
