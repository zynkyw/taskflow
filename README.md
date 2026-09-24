# TaskFlow

A small, dependency-light **task & project manager** written in TypeScript. It works both as a **CLI tool** and as an importable **library** (models, services, storage) that you can build other things on top of.

No frameworks, no database server — just Node.js, the file system, and a JSON file.

## Features

- Projects and tasks with status (`todo`, `in_progress`, `done`, `cancelled`) and priority (`low`, `medium`, `high`, `urgent`)
- Tags, due dates, overdue detection
- Filtering, sorting, and aggregate statistics (completion rate, counts by status/priority)
- Atomic JSON persistence (safe against crashes mid-write)
- Cascading or non-cascading project deletion
- Clean layered architecture: `models` → `storage` → `services` → `cli`
- Fully typed, `strict` TypeScript, zero runtime dependencies
- Unit tests with Vitest

## Installation

```bash
git clone <this-repo-url>
cd taskflow
npm install
npm run build
```

## Usage (CLI)

Run via `npm run dev` during development, or `npm start` after building.

```bash
# Create a project
npm run dev -- project add "Website Redesign"

# Create tasks
npm run dev -- task add "Design homepage" --project proj_abc123 --priority high --due 2026-10-01
npm run dev -- task add "Write copy" --tag content --priority medium

# List and filter
npm run dev -- task list
npm run dev -- task list --status todo --sort priority --desc
npm run dev -- task list --overdue
npm run dev -- task list --search homepage

# Update status
npm run dev -- task start task_xxx
npm run dev -- task done task_xxx

# Inspect
npm run dev -- task show task_xxx
npm run dev -- task stats

# Projects
npm run dev -- project list
npm run dev -- project archive proj_abc123
npm run dev -- project rm proj_abc123 --cascade
```

Data is stored at `./data/taskflow.json` by default. Override with:

```bash
TASKFLOW_DATA_FILE=/path/to/file.json npm run dev -- task list
```

## Usage (as a library)

```ts
import { JSONStorage, TaskService, ProjectService, TaskPriority } from "taskflow";

const storage = new JSONStorage("./data/taskflow.json");
const tasks = new TaskService(storage);
const projects = new ProjectService(storage);

const project = await projects.create({ name: "Launch" });
const task = await tasks.create({
  title: "Write announcement",
  projectId: project.id,
  priority: TaskPriority.High,
  dueDate: "2026-11-01",
});

const stats = await tasks.stats();
console.log(stats.completionRate);
```

## Project structure

```
src/
  models/       Task and Project domain entities (plain, serializable classes)
  storage/      Storage interface + atomic JSON file implementation
  services/     Business logic: TaskService, ProjectService
  utils/        id generation, validation, console formatting
  cli/          argument parsing + command handlers + entry point
tests/          Vitest unit tests (models + services)
```

## Scripts

| Command           | Description                          |
|-------------------|---------------------------------------|
| `npm run build`   | Compile TypeScript to `dist/`         |
| `npm run dev`     | Run the CLI directly via `ts-node`    |
| `npm start`       | Run the compiled CLI from `dist/`     |
| `npm test`        | Run the test suite once               |
| `npm run test:watch` | Run tests in watch mode            |
| `npm run lint`    | Type-check without emitting output    |

## Design notes

- **Atomic writes**: `JSONStorage` writes to a temp file and renames it into place, so a crash mid-save can't corrupt your data.
- **No hidden state**: every service method reads and writes the full database; there's no in-memory cache to get out of sync.
- **Cascading deletes are explicit**: deleting a project defaults to *detaching* its tasks; pass `--cascade` / `cascade=true` to delete them too.
- **Extensible sort/filter**: `TaskFilter` and `TaskSortField` are small, typed surfaces meant to grow as new CLI flags are added.

## License

MIT — see [LICENSE](./LICENSE).
