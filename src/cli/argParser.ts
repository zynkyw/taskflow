export interface ParsedArgs {
  command: string;
  subcommand?: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

/**
 * Parses argv (excluding node & script path) into a command, optional
 * subcommand, positional args, and --flag / --flag=value / -f pairs.
 *
 * Example: ["task", "add", "Buy milk", "--priority=high", "--tag", "errands"]
 *   => { command: "task", subcommand: "add", positional: ["Buy milk"],
 *        flags: { priority: "high", tag: "errands" } }
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command, maybeSub, ...rest] = argv;
  const isSubcommand = maybeSub !== undefined && !maybeSub.startsWith("-");
  const subcommand = isSubcommand ? maybeSub : undefined;
  const remaining = isSubcommand ? rest : maybeSub !== undefined ? [maybeSub, ...rest] : [];

  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < remaining.length; i++) {
    const token = remaining[i];
    if (token.startsWith("--")) {
      const eqIndex = token.indexOf("=");
      if (eqIndex !== -1) {
        flags[token.slice(2, eqIndex)] = token.slice(eqIndex + 1);
      } else {
        const next = remaining[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          flags[token.slice(2)] = next;
          i++;
        } else {
          flags[token.slice(2)] = true;
        }
      }
    } else if (token.startsWith("-") && token.length > 1) {
      flags[token.slice(1)] = true;
    } else {
      positional.push(token);
    }
  }

  return { command: command ?? "", subcommand, positional, flags };
}

export function flagAsString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

export function flagAsBoolean(flags: Record<string, string | boolean>, key: string): boolean {
  return Boolean(flags[key]);
}
