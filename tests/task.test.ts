import { describe, it, expect } from "vitest";
import { Task, TaskPriority, TaskStatus } from "../src/models/Task";

describe("Task", () => {
  it("creates a task with sensible defaults", () => {
    const task = Task.create("task_1", { title: "Write report" });
    expect(task.title).toBe("Write report");
    expect(task.status).toBe(TaskStatus.Todo);
    expect(task.priority).toBe(TaskPriority.Medium);
    expect(task.tags).toEqual([]);
    expect(task.completedAt).toBeNull();
  });

  it("marks a task done and records completedAt", () => {
    const task = Task.create("task_2", { title: "Ship feature" });
    task.markStatus(TaskStatus.Done, "2026-01-01T00:00:00.000Z");
    expect(task.status).toBe(TaskStatus.Done);
    expect(task.completedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("clears completedAt when reopened", () => {
    const task = Task.create("task_3", { title: "Fix bug" });
    task.markStatus(TaskStatus.Done);
    task.markStatus(TaskStatus.Todo);
    expect(task.completedAt).toBeNull();
  });

  it("detects overdue tasks", () => {
    const task = Task.create("task_4", { title: "Old task", dueDate: "2020-01-01" });
    expect(task.isOverdue(new Date("2026-01-01"))).toBe(true);
  });

  it("does not consider done tasks overdue", () => {
    const task = Task.create("task_5", { title: "Old but done", dueDate: "2020-01-01" });
    task.markStatus(TaskStatus.Done);
    expect(task.isOverdue(new Date("2026-01-01"))).toBe(false);
  });

  it("normalizes and deduplicates tags", () => {
    const task = Task.create("task_6", { title: "Tagged" });
    task.addTag("Urgent");
    task.addTag("urgent");
    task.addTag("  Home ");
    expect(task.tags).toEqual(["urgent", "home"]);
  });

  it("round-trips through JSON", () => {
    const task = Task.create("task_7", { title: "Serialize me", tags: ["a", "b"] });
    const restored = Task.fromJSON(JSON.parse(JSON.stringify(task.toJSON())));
    expect(restored.toJSON()).toEqual(task.toJSON());
  });
});
