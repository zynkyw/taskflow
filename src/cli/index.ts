#!/usr/bin/env node
import * as path from "path";
import { parseArgs } from "./argParser";
import { JSONStorage } from "../storage/JSONStorage";
import { TaskService } from "../services/TaskService";
import { ProjectService } from "../services/ProjectService";
import { runTaskCommand } from "./commands/taskCommands";
import { runProjectCommand } from "./commands/projectCommands";
import { formatError } from "../utils/formatter";
import { ValidationError } from "../utils/validators";

const DATA_FILE = process.env.TASKFLOW_DATA_FILE ?? path.join(process.cwd(), "data", "taskflow.json");

function printHelp(): void {
  console.log(`
TaskFlow — a small, dependency-light task & project manager.

Usage: taskflow <command> <subcommand> [options]

Commands:
  task     Manage tasks       (taskflow task --help)
  project  Manage projects    (taskflow project --help)

Examples:
  taskflow project add "Website Redesign"
  taskflow task add "Design homepage" --project proj_abc123 --priority high --due 2026-10-01
  taskflow task list --status todo --sort priority
  taskflow task done task_xyz789
  taskflow task stats

Data is stored as JSON at: ${DATA_FILE}
Override the location with the TASKFLOW_DATA_FILE environment variable.
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (!args.command || args.command === "help" || args.command === "--help" || args.command === "-h") {
    printHelp();
    return;
  }

  const storage = new JSONStorage(DATA_FILE);
  const taskService = new TaskService(storage);
  const projectService = new ProjectService(storage);

  switch (args.command) {
    case "task":
      await runTaskCommand(args, taskService, projectService);
      break;
    case "project":
      await runProjectCommand(args, projectService);
      break;
    default:
      console.log(formatError(`Unknown command: "${args.command}"`));
      printHelp();
      process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  if (err instanceof ValidationError) {
    console.log(formatError(err.message));
  } else {
    console.error(formatError("Unexpected error:"), err);
  }
  process.exitCode = 1;
});
