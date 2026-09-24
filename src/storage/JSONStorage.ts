import { promises as fs } from "fs";
import * as path from "path";
import { Database, Storage, emptyDatabase, SCHEMA_VERSION } from "./Storage.interface";

/**
 * A simple, dependency-free JSON file storage backend.
 * Writes are atomic: data is written to a temp file and then renamed,
 * so a crash mid-write can never corrupt the main data file.
 */
export class JSONStorage implements Storage {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<Database> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Database;
      return this.migrate(parsed);
    } catch (err: unknown) {
      if (this.isNotFoundError(err)) {
        const fresh = emptyDatabase();
        await this.save(fresh);
        return fresh;
      }
      throw new Error(`Failed to load database from ${this.filePath}: ${(err as Error).message}`);
    }
  }

  async save(db: Database): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    db.meta.lastModified = new Date().toISOString();
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const serialized = JSON.stringify(db, null, 2);

    await fs.writeFile(tmpPath, serialized, "utf-8");
    await fs.rename(tmpPath, this.filePath);
  }

  private migrate(db: Database): Database {
    if (!db.meta) {
      db.meta = { version: SCHEMA_VERSION, lastModified: new Date().toISOString() };
    }
    if (!Array.isArray(db.tasks)) db.tasks = [];
    if (!Array.isArray(db.projects)) db.projects = [];
    // Future schema migrations would branch on db.meta.version here.
    return db;
  }

  private isNotFoundError(err: unknown): boolean {
    return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "ENOENT";
  }
}
