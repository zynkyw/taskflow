import { TaskProps } from "../models/Task";
import { ProjectProps } from "../models/Project";

export interface Database {
  tasks: TaskProps[];
  projects: ProjectProps[];
  meta: {
    version: number;
    lastModified: string;
  };
}

export interface Storage {
  load(): Promise<Database>;
  save(db: Database): Promise<void>;
}

export const SCHEMA_VERSION = 1;

export function emptyDatabase(): Database {
  return {
    tasks: [],
    projects: [],
    meta: {
      version: SCHEMA_VERSION,
      lastModified: new Date().toISOString(),
    },
  };
}
