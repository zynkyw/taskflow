import { TaskPriority, TaskStatus } from "../models/Task";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string.`);
  }
}

export function assertMaxLength(value: string, max: number, fieldName: string): void {
  if (value.length > max) {
    throw new ValidationError(`${fieldName} must be at most ${max} characters (got ${value.length}).`);
  }
}

export function isValidPriority(value: string): value is TaskPriority {
  return Object.values(TaskPriority).includes(value as TaskPriority);
}

export function isValidStatus(value: string): value is TaskStatus {
  return Object.values(TaskStatus).includes(value as TaskStatus);
}

export function assertValidPriority(value: string): TaskPriority {
  if (!isValidPriority(value)) {
    throw new ValidationError(
      `Invalid priority "${value}". Expected one of: ${Object.values(TaskPriority).join(", ")}.`
    );
  }
  return value;
}

export function assertValidStatus(value: string): TaskStatus {
  if (!isValidStatus(value)) {
    throw new ValidationError(
      `Invalid status "${value}". Expected one of: ${Object.values(TaskStatus).join(", ")}.`
    );
  }
  return value;
}

export function isValidISODate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function assertValidDate(value: string, fieldName: string): void {
  if (!isValidISODate(value)) {
    throw new ValidationError(`${fieldName} must be a valid date (YYYY-MM-DD or ISO string).`);
  }
}
