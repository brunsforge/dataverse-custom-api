import type { EnvironmentCache } from "./configModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiSemanticDiffResult,
  CustomApiSummaryModel,
} from "./customApiModels.js";

export interface ConnectOptions {
  environmentUrl: string;
}

export interface ConnectResult {
  environmentUrl: string;
  authMode: string;
  environmentCacheFilePath: string;
}

export type GetCurrentEnvironmentResult = EnvironmentCache;
export type ListCustomApisResult = CustomApiSummaryModel[];

export interface SelectCustomApiOptions {
  uniqueName: string;
}

export interface SelectCustomApiResult {
  uniqueName: string;
  activeApiCacheFilePath: string;
}

export interface ExportCustomApiOptions {
  uniqueName?: string;
}

export interface ExportCustomApiResult {
  uniqueName: string;
  filePath: string;
  catalog: CustomApiCatalogModel;
}

export interface LoadLocalCustomApiCatalogOptions {
  uniqueName?: string;
}

export type LoadLocalCustomApiCatalogResult = CustomApiCatalogModel;

export interface DiffCustomApiOptions {
  uniqueName?: string;
}

export type DiffCustomApiResult = CustomApiSemanticDiffResult;
