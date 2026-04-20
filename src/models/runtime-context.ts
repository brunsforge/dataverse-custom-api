import path from "node:path";

export interface RuntimeContext {
  workingDirectory?: string;
  cacheRootPath?: string;
  customApiOutputRootPath?: string;
  authFilePath?: string;
  configFilePath?: string;
}

export function resolveWorkingDirectory(context?: RuntimeContext): string {
  if (context?.workingDirectory) {
    return context.workingDirectory;
  }

  if (context?.cacheRootPath) {
    return path.dirname(context.cacheRootPath);
  }

  return process.cwd();
}

export function resolveConfigFilePath(context?: RuntimeContext): string {
  if (context?.configFilePath) {
    return context.configFilePath;
  }

  return path.join(resolveWorkingDirectory(context), "appsettings.json");
}

export function resolveAuthFilePath(context?: RuntimeContext): string {
  if (context?.authFilePath) {
    return context.authFilePath;
  }

  if (context?.cacheRootPath) {
    return path.join(context.cacheRootPath, "auth.json");
  }

  return path.join(resolveWorkingDirectory(context), "auth.json");
}