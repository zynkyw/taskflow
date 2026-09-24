export interface ProjectProps {
  id: string;
  name: string;
  description?: string;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

const DEFAULT_COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

export class Project {
  readonly id: string;
  name: string;
  description?: string;
  color: string;
  archived: boolean;
  readonly createdAt: string;
  updatedAt: string;

  constructor(props: ProjectProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.color = props.color;
    this.archived = props.archived;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(id: string, input: CreateProjectInput, now: string = new Date().toISOString()): Project {
    const color = input.color ?? DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
    return new Project({
      id,
      name: input.name,
      description: input.description,
      color,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  rename(name: string, now: string = new Date().toISOString()): void {
    this.name = name;
    this.updatedAt = now;
  }

  archive(now: string = new Date().toISOString()): void {
    this.archived = true;
    this.updatedAt = now;
  }

  unarchive(now: string = new Date().toISOString()): void {
    this.archived = false;
    this.updatedAt = now;
  }

  toJSON(): ProjectProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      color: this.color,
      archived: this.archived,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromJSON(data: ProjectProps): Project {
    return new Project(data);
  }
}
