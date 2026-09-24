import { Task, TaskPriority, TaskStatus } from "../models/Task";
import { Project } from "../models/Project";

const RESET = "\x1b[0m";
const COLORS: Record<string, string> = {
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

let colorEnabled = true;

export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
}

function colorize(text: string, color: keyof typeof COLORS): string {
  if (!colorEnabled) return text;
  return `${COLORS[color]}${text}${RESET}`;
}

const STATUS_ICON: Record<TaskStatus, string> = {
  [TaskStatus.Todo]: "○",
  [TaskStatus.InProgress]: "◐",
  [TaskStatus.Done]: "●",
  [TaskStatus.Cancelled]: "✕",
};

const STATUS_COLOR: Record<TaskStatus, keyof typeof COLORS> = {
  [TaskStatus.Todo]: "gray",
  [TaskStatus.InProgress]: "blue",
  [TaskStatus.Done]: "green",
  [TaskStatus.Cancelled]: "red",
};

const PRIORITY_COLOR: Record<TaskPriority, keyof typeof COLORS> = {
  [TaskPriority.Low]: "gray",
  [TaskPriority.Medium]: "cyan",
  [TaskPriority.High]: "yellow",
  [TaskPriority.Urgent]: "red",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  [TaskPriority.Low]: "LOW",
  [TaskPriority.Medium]: "MED",
  [TaskPriority.High]: "HIGH",
  [TaskPriority.Urgent]: "URG!",
};

export function formatTaskLine(task: Task, projectName?: string): string {
  const icon = colorize(STATUS_ICON[task.status], STATUS_COLOR[task.status]);
  const priority = colorize(`[${PRIORITY_LABEL[task.priority]}]`, PRIORITY_COLOR[task.priority]);
  const id = colorize(task.id, "gray");
  const title = task.status === TaskStatus.Done ? colorize(task.title, "gray") : task.title;
  const due = task.dueDate ? ` ${colorize(`(due ${task.dueDate.slice(0, 10)})`, task.isOverdue() ? "red" : "gray")}` : "";
  const proj = projectName ? ` ${colorize(`#${projectName}`, "magenta")}` : "";
  const tags = task.tags.length ? ` ${colorize(task.tags.map((t) => `+${t}`).join(" "), "cyan")}` : "";
  return `${icon} ${priority} ${title}${proj}${tags}${due} ${id}`;
}

export function formatProjectLine(project: Project, taskCount: number, doneCount: number): string {
  const archivedTag = project.archived ? colorize(" [archived]", "gray") : "";
  const progress = taskCount > 0 ? colorize(` (${doneCount}/${taskCount})`, "gray") : colorize(" (empty)", "gray");
  return `${colorize("■", "magenta")} ${colorize(project.name, "bold")}${progress}${archivedTag} ${colorize(project.id, "gray")}`;
}

export function formatHeader(text: string): string {
  const line = "─".repeat(Math.max(text.length, 4));
  return `\n${colorize(text, "bold")}\n${colorize(line, "gray")}`;
}

export function formatError(message: string): string {
  return colorize(`✕ ${message}`, "red");
}

export function formatSuccess(message: string): string {
  return colorize(`✓ ${message}`, "green");
}

export function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const renderRow = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  return [renderRow(headers), sep, ...rows.map(renderRow)].join("\n");
}
