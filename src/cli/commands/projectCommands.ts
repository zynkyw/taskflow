import { ParsedArgs, flagAsBoolean, flagAsString } from "../argParser";
import { ProjectService } from "../../services/ProjectService";
import { formatError, formatHeader, formatProjectLine, formatSuccess } from "../../utils/formatter";

export async function runProjectCommand(args: ParsedArgs, projectService: ProjectService): Promise<void> {
  switch (args.subcommand) {
    case "add":
    case "create":
      return addProject(args, projectService);
    case "list":
    case "ls":
      return listProjects(args, projectService);
    case "rename":
      return renameProject(args, projectService);
    case "archive":
      return setArchived(args, projectService, true);
    case "unarchive":
      return setArchived(args, projectService, false);
    case "rm":
    case "delete":
      return deleteProject(args, projectService);
    default:
      console.log(formatError(`Unknown project subcommand: "${args.subcommand ?? ""}"`));
      printProjectHelp();
  }
}

function printProjectHelp(): void {
  console.log(`
Usage: taskflow project <subcommand> [options]

Subcommands:
  add <name>              Create a project (alias: create)
  list                    List projects (alias: ls)  [--active-only]
  rename <id> <name>      Rename a project
  archive <id>            Archive a project
  unarchive <id>          Unarchive a project
  rm <id>                 Delete a project (alias: delete) [--cascade]
`);
}

async function addProject(args: ParsedArgs, projectService: ProjectService): Promise<void> {
  const name = args.positional.join(" ").trim();
  if (!name) {
    console.log(formatError("Project name is required: taskflow project add \"Website Redesign\""));
    return;
  }
  const project = await projectService.create({
    name,
    description: flagAsString(args.flags, "description"),
    color: flagAsString(args.flags, "color"),
  });
  console.log(formatSuccess(`Created project ${project.id}: "${project.name}"`));
}

async function listProjects(args: ParsedArgs, projectService: ProjectService): Promise<void> {
  const activeOnly = flagAsBoolean(args.flags, "active-only");
  const summaries = await projectService.listWithSummaries(!activeOnly);

  if (summaries.length === 0) {
    console.log("No projects yet. Create one with: taskflow project add \"My Project\"");
    return;
  }

  console.log(formatHeader(`Projects (${summaries.length})`));
  for (const { project, taskCount, doneCount } of summaries) {
    console.log(formatProjectLine(project, taskCount, doneCount));
  }
}

async function renameProject(args: ParsedArgs, projectService: ProjectService): Promise<void> {
  const [id, ...nameParts] = args.positional;
  const name = nameParts.join(" ").trim();
  if (!id || !name) {
    console.log(formatError("Usage: taskflow project rename <id> <new name>"));
    return;
  }
  const project = await projectService.rename(id, name);
  console.log(formatSuccess(`Renamed project ${project.id} to "${project.name}"`));
}

async function setArchived(args: ParsedArgs, projectService: ProjectService, archived: boolean): Promise<void> {
  const id = args.positional[0];
  if (!id) {
    console.log(formatError("Project id is required."));
    return;
  }
  const project = await projectService.setArchived(id, archived);
  console.log(formatSuccess(`Project ${project.id} is now ${archived ? "archived" : "active"}`));
}

async function deleteProject(args: ParsedArgs, projectService: ProjectService): Promise<void> {
  const id = args.positional[0];
  if (!id) {
    console.log(formatError("Project id is required."));
    return;
  }
  const cascade = flagAsBoolean(args.flags, "cascade");
  const { deletedTasks } = await projectService.delete(id, cascade);
  console.log(
    formatSuccess(
      cascade
        ? `Deleted project ${id} and ${deletedTasks} associated task(s)`
        : `Deleted project ${id} (its tasks were detached, not deleted)`
    )
  );
}
