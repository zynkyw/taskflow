import { Storage } from "../storage/Storage.interface";
import { CreateProjectInput, Project } from "../models/Project";
import { generateId } from "../utils/idGenerator";
import { assertMaxLength, assertNonEmptyString, ValidationError } from "../utils/validators";

const ID_PREFIX = "proj";
const MAX_NAME_LENGTH = 100;

export interface ProjectSummary {
  project: Project;
  taskCount: number;
  doneCount: number;
}

export class ProjectService {
  constructor(private readonly storage: Storage) {}

  async create(input: CreateProjectInput): Promise<Project> {
    assertNonEmptyString(input.name, "name");
    assertMaxLength(input.name, MAX_NAME_LENGTH, "name");

    const db = await this.storage.load();
    const duplicate = db.projects.some((p) => p.name.toLowerCase() === input.name.toLowerCase());
    if (duplicate) {
      throw new ValidationError(`A project named "${input.name}" already exists.`);
    }

    const project = Project.create(generateId(ID_PREFIX), input);
    db.projects.push(project.toJSON());
    await this.storage.save(db);
    return project;
  }

  async get(id: string): Promise<Project | null> {
    const db = await this.storage.load();
    const found = db.projects.find((p) => p.id === id);
    return found ? Project.fromJSON(found) : null;
  }

  async list(includeArchived = true): Promise<Project[]> {
    const db = await this.storage.load();
    const projects = db.projects.map(Project.fromJSON);
    return includeArchived ? projects : projects.filter((p) => !p.archived);
  }

  async listWithSummaries(includeArchived = true): Promise<ProjectSummary[]> {
    const db = await this.storage.load();
    const projects = db.projects.map(Project.fromJSON).filter((p) => includeArchived || !p.archived);

    return projects.map((project) => {
      const tasks = db.tasks.filter((t) => t.projectId === project.id);
      const doneCount = tasks.filter((t) => t.status === "done").length;
      return { project, taskCount: tasks.length, doneCount };
    });
  }

  async rename(id: string, name: string): Promise<Project> {
    assertNonEmptyString(name, "name");
    const db = await this.storage.load();
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) throw new ValidationError(`Project "${id}" not found.`);

    const project = Project.fromJSON(db.projects[index]);
    project.rename(name);
    db.projects[index] = project.toJSON();
    await this.storage.save(db);
    return project;
  }

  async setArchived(id: string, archived: boolean): Promise<Project> {
    const db = await this.storage.load();
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) throw new ValidationError(`Project "${id}" not found.`);

    const project = Project.fromJSON(db.projects[index]);
    if (archived) project.archive();
    else project.unarchive();
    db.projects[index] = project.toJSON();
    await this.storage.save(db);
    return project;
  }

  /**
   * Deletes a project. Tasks belonging to it are either deleted too
   * (cascade=true) or detached (projectId set to null).
   */
  async delete(id: string, cascade = false): Promise<{ deletedTasks: number }> {
    const db = await this.storage.load();
    const before = db.projects.length;
    db.projects = db.projects.filter((p) => p.id !== id);
    if (db.projects.length === before) {
      throw new ValidationError(`Project "${id}" not found.`);
    }

    let deletedTasks = 0;
    if (cascade) {
      const beforeTasks = db.tasks.length;
      db.tasks = db.tasks.filter((t) => t.projectId !== id);
      deletedTasks = beforeTasks - db.tasks.length;
    } else {
      db.tasks = db.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t));
    }

    await this.storage.save(db);
    return { deletedTasks };
  }
}
