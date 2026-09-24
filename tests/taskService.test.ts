import { describe, it, expect, beforeEach } from "vitest";
import { TaskService } from "../src/services/TaskService";
import { ProjectService } from "../src/services/ProjectService";
import { Database, Storage, emptyDatabase } from "../src/storage/Storage.interface";
import { TaskPriority, TaskStatus } from "../src/models/Task";
import { ValidationError } from "../src/utils/validators";

class InMemoryStorage implements Storage {
  private db: Database = emptyDatabase();

  async load(): Promise<Database> {
    // Return a deep-ish clone so callers can't mutate internal state directly.
    return JSON.parse(JSON.stringify(this.db));
  }

  async save(db: Database): Promise<void> {
    this.db = JSON.parse(JSON.stringify(db));
  }
}

describe("TaskService", () => {
  let storage: InMemoryStorage;
  let taskService: TaskService;
  let projectService: ProjectService;

  beforeEach(() => {
    storage = new InMemoryStorage();
    taskService = new TaskService(storage);
    projectService = new ProjectService(storage);
  });

  it("creates and retrieves a task", async () => {
    const created = await taskService.create({ title: "Buy milk" });
    const fetched = await taskService.get(created.id);
    expect(fetched?.title).toBe("Buy milk");
  });

  it("rejects empty titles", async () => {
    await expect(taskService.create({ title: "   " })).rejects.toThrow(ValidationError);
  });

  it("rejects tasks assigned to a nonexistent project", async () => {
    await expect(taskService.create({ title: "Orphan", projectId: "proj_missing" })).rejects.toThrow(
      ValidationError
    );
  });

  it("links a task to an existing project", async () => {
    const project = await projectService.create({ name: "Website" });
    const task = await taskService.create({ title: "Design homepage", projectId: project.id });
    expect(task.projectId).toBe(project.id);
  });

  it("filters tasks by status", async () => {
    const a = await taskService.create({ title: "A" });
    await taskService.create({ title: "B" });
    await taskService.setStatus(a.id, TaskStatus.Done);

    const done = await taskService.list({ status: TaskStatus.Done });
    expect(done).toHaveLength(1);
    expect(done[0].id).toBe(a.id);
  });

  it("sorts tasks by priority descending", async () => {
    await taskService.create({ title: "Low", priority: TaskPriority.Low });
    await taskService.create({ title: "Urgent", priority: TaskPriority.Urgent });
    await taskService.create({ title: "Medium", priority: TaskPriority.Medium });

    const all = await taskService.list();
    const sorted = taskService.sort(all, "priority", "desc");
    expect(sorted.map((t) => t.title)).toEqual(["Urgent", "Medium", "Low"]);
  });

  it("computes aggregate stats", async () => {
    const a = await taskService.create({ title: "A" });
    const b = await taskService.create({ title: "B" });
    await taskService.create({ title: "C" });
    await taskService.setStatus(a.id, TaskStatus.Done);
    await taskService.setStatus(b.id, TaskStatus.Cancelled);

    const stats = await taskService.stats();
    expect(stats.total).toBe(3);
    expect(stats.byStatus.done).toBe(1);
    expect(stats.byStatus.cancelled).toBe(1);
    // completion rate excludes cancelled tasks from the denominator: 1 done / 2 relevant
    expect(stats.completionRate).toBeCloseTo(0.5);
  });

  it("deletes a task", async () => {
    const task = await taskService.create({ title: "Temp" });
    await taskService.delete(task.id);
    expect(await taskService.get(task.id)).toBeNull();
  });

  it("throws when deleting a nonexistent task", async () => {
    await expect(taskService.delete("task_missing")).rejects.toThrow(ValidationError);
  });
});

describe("ProjectService", () => {
  let storage: InMemoryStorage;
  let taskService: TaskService;
  let projectService: ProjectService;

  beforeEach(() => {
    storage = new InMemoryStorage();
    taskService = new TaskService(storage);
    projectService = new ProjectService(storage);
  });

  it("prevents duplicate project names (case-insensitive)", async () => {
    await projectService.create({ name: "Marketing" });
    await expect(projectService.create({ name: "marketing" })).rejects.toThrow(ValidationError);
  });

  it("cascades task deletion when requested", async () => {
    const project = await projectService.create({ name: "To delete" });
    await taskService.create({ title: "Task 1", projectId: project.id });
    await taskService.create({ title: "Task 2", projectId: project.id });

    const { deletedTasks } = await projectService.delete(project.id, true);
    expect(deletedTasks).toBe(2);
    expect(await taskService.list()).toHaveLength(0);
  });

  it("detaches tasks instead of deleting them by default", async () => {
    const project = await projectService.create({ name: "To delete" });
    const task = await taskService.create({ title: "Task 1", projectId: project.id });

    await projectService.delete(project.id, false);
    const remaining = await taskService.get(task.id);
    expect(remaining?.projectId).toBeNull();
  });
});
