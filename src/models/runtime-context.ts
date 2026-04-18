import path from "node:path";

export interface RuntimeContext {
  workingDirectory?: string;
  configFilePath?: string;
  authFilePath?: string;
  cacheRootPath?: string;
  customApiOutputRootPath?: string;
}

export function resolveWorkingDirectory(context?: RuntimeContext): string {
  return context?.workingDirectory ?? process.cwd();
}

export function resolveConfigFilePath(context?: RuntimeContext): string {
  return context?.configFilePath ?? path.join(resolveWorkingDirectory(context), "config.json");
}

export function resolveAuthFilePath(context?: RuntimeContext): string {
  return context?.authFilePath ?? path.join(resolveWorkingDirectory(context), "auth.json");
}
