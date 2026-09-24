import { ParsedArgs, flagAsBoolean, flagAsString } from "../argParser";
import { TaskService, TaskFilter, TaskSortField } from "../../services/TaskService";
import { ProjectService } from "../../services/ProjectService";
import { TaskPriority, TaskStatus } from "../../models/Task";
import { assertValidPriority, assertValidStatus } from "../../utils/validators";
import { formatError, formatHeader, formatSuccess, formatTaskLine } from "../../utils/formatter";

async function projectNameLookup(projectService: ProjectService): Promise<Map<string, string>> {
  const projects = await projectService.list();
  return new Map(projects.map((p) => [p.id, p.name]));
}

export async function runTaskCommand(
  args: ParsedArgs,
  taskService: TaskService,
  projectService: ProjectService
): Promise<void> {
  switch (args.subcommand) {
    case "add":
      return addTask(args, taskService);
    case "list":
    case "ls":
      return listTasks(args, taskService, projectService);
    case "done":
      return setStatus(args, taskService, TaskStatus.Done);
    case "start":
      return setStatus(args, taskService, TaskStatus.InProgress);
    case "cancel":
      return setStatus(args, taskService, TaskStatus.Cancelled);
    case "reopen":
      return setStatus(args, taskService, TaskStatus.Todo);
    case "rm":
    case "delete":
      return deleteTask(args, taskService);
    case "show":
      return showTask(args, taskService, projectService);
    case "edit":
      return editTask(args, taskService);
    case "stats":
      return showStats(args, taskService);
    default:
      console.log(formatError(`Unknown task subcommand: "${args.subcommand ?? ""}"`));
      printTaskHelp();
  }
}

function printTaskHelp(): void {
  console.log(`
Usage: taskflow task <subcommand> [options]

Subcommands:
  add <title>          Create a task
  list                 List tasks (aliases: ls)
  show <id>             Show full task details
  edit <id>             Edit a task's fields
  start <id>            Mark task in progress
  done <id>             Mark task done
  cancel <id>            Mark task cancelled
  reopen <id>            Reset task to todo
  rm <id>                Delete a task (alias: delete)
  stats                 Show aggregate statistics

Options for add/edit:
  --priority <low|medium|high|urgent>
  --project <projectId>
  --due <YYYY-MM-DD>
  --tag <tag>            (repeatable)
  --description <text>

Options for list:
  --status <status>  --priority <priority>  --project <id>
  --tag <tag>  --overdue  --search <text>
  --sort <priority|dueDate|createdAt|title>  --desc
`);
}

async function addTask(args: ParsedArgs, taskService: TaskService): Promise<void> {
  const title = args.positional.join(" ").trim();
  if (!title) {
    console.log(formatError("Task title is required: taskflow task add \"Buy milk\""));
    return;
  }

  const priorityFlag = flagAsString(args.flags, "priority");
  const priority = priorityFlag ? assertValidPriority(priorityFlag) : undefined;

  const task = await taskService.create({
    title,
    description: flagAsString(args.flags, "description"),
    priority: priority as TaskPriority | undefined,
    projectId: flagAsString(args.flags, "project") ?? null,
    dueDate: flagAsString(args.flags, "due") ?? null,
    tags: flagAsString(args.flags, "tag") ? [flagAsString(args.flags, "tag")!] : [],
  });

  console.log(formatSuccess(`Created task ${task.id}: "${task.title}"`));
}

async function listTasks(args: ParsedArgs, taskService: TaskService, projectService: ProjectService): Promise<void> {
  const filter: TaskFilter = {};
  const statusFlag = flagAsString(args.flags, "status");
  const priorityFlag = flagAsString(args.flags, "priority");

  if (statusFlag) filter.status = assertValidStatus(statusFlag);
  if (priorityFlag) filter.priority = assertValidPriority(priorityFlag);
  const projectFlag = flagAsString(args.flags, "project");
  if (projectFlag) filter.projectId = projectFlag;
  const tagFlag = flagAsString(args.flags, "tag");
  if (tagFlag) filter.tag = tagFlag;
  if (flagAsBoolean(args.flags, "overdue")) filter.overdueOnly = true;
  const searchFlag = flagAsString(args.flags, "search");
  if (searchFlag) filter.search = searchFlag;

  let tasks = await taskService.list(filter);
  const sortField = (flagAsString(args.flags, "sort") as TaskSortField) ?? "priority";
  const direction = flagAsBoolean(args.flags, "desc") ? "desc" : "asc";
  tasks = taskService.sort(tasks, sortField, direction);

  if (tasks.length === 0) {
    console.log("No tasks match the given filters.");
    return;
  }

  const names = await projectNameLookup(projectService);
  console.log(formatHeader(`Tasks (${tasks.length})`));
  for (const task of tasks) {
    const projectName = task.projectId ? names.get(task.projectId) : undefined;
    console.log(formatTaskLine(task, projectName));
  }
}

async function setStatus(args: ParsedArgs, taskService: TaskService, status: TaskStatus): Promise<void> {
  const id = args.positional[0];
  if (!id) {
    console.log(formatError("Task id is required."));
    return;
  }
  const task = await taskService.setStatus(id, status);
  console.log(formatSuccess(`Task ${task.id} is now "${task.status}"`));
}

async function deleteTask(args: ParsedArgs, taskService: TaskService): Promise<void> {
  const id = args.positional[0];
  if (!id) {
    console.log(formatError("Task id is required."));
    return;
  }
  await taskService.delete(id);
  console.log(formatSuccess(`Deleted task ${id}`));
}

async function showTask(args: ParsedArgs, taskService: TaskService, projectService: ProjectService): Promise<void> {
  const id = args.positional[0];
  if (!id) {
    console.log(formatError("Task id is required."));
    return;
  }
  const task = await taskService.get(id);
  if (!task) {
    console.log(formatError(`Task "${id}" not found.`));
    return;
  }
  const project = task.projectId ? await projectService.get(task.projectId) : null;

  console.log(formatHeader(task.title));
  console.log(`ID:          ${task.id}`);
  console.log(`Status:      ${task.status}`);
  console.log(`Priority:    ${task.priority}`);
  console.log(`Project:     ${project ? project.name : "(none)"}`);
  console.log(`Tags:        ${task.tags.join(", ") || "(none)"}`);
  console.log(`Due:         ${task.dueDate ?? "(none)"}${task.isOverdue() ? " — OVERDUE" : ""}`);
  console.log(`Created:     ${task.createdAt}`);
  console.log(`Updated:     ${task.updatedAt}`);
  if (task.description) console.log(`\n${task.description}`);
}

async function editTask(args: ParsedArgs, taskService: TaskService): Promise<void> {
  const id = args.positional[0];
  if (!id) {
    console.log(formatError("Task id is required."));
    return;
  }

  const priorityFlag = flagAsString(args.flags, "priority");
  const task = await taskService.update(id, {
    title: flagAsString(args.flags, "title"),
    description: flagAsString(args.flags, "description"),
    priority: priorityFlag ? assertValidPriority(priorityFlag) : undefined,
    dueDate: flagAsString(args.flags, "due"),
    projectId: flagAsString(args.flags, "project"),
  });

  console.log(formatSuccess(`Updated task ${task.id}`));
}

async function showStats(args: ParsedArgs, taskService: TaskService): Promise<void> {
  const projectFlag = flagAsString(args.flags, "project");
  const stats = await taskService.stats(projectFlag ? { projectId: projectFlag } : {});

  console.log(formatHeader("Task statistics"));
  console.log(`Total:            ${stats.total}`);
  console.log(`Todo:             ${stats.byStatus.todo}`);
  console.log(`In progress:      ${stats.byStatus.in_progress}`);
  console.log(`Done:             ${stats.byStatus.done}`);
  console.log(`Cancelled:        ${stats.byStatus.cancelled}`);
  console.log(`Overdue:          ${stats.overdue}`);
  console.log(`Completion rate:  ${(stats.completionRate * 100).toFixed(1)}%`);
}
