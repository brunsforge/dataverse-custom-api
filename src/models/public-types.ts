import type { EnvironmentCache } from "./configModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiSemanticDiffResult,
  CustomApiSummaryModel,
  CustomApiSyncExecutionState,
  CustomApiSyncOperationResult,
  CustomApiSyncPlan,
} from "./customApiModels.js";

export interface ConnectOptions { environmentUrl: string; }
export interface ConnectResult { environmentUrl: string; authMode: string; environmentCacheFilePath: string; }

export type GetCurrentEnvironmentResult = EnvironmentCache;
export type ListCustomApisResult = CustomApiSummaryModel[];

export interface SelectCustomApiOptions { uniqueName: string; }
export interface SelectCustomApiResult { uniqueName: string; activeApiCacheFilePath: string; }

export interface ExportCustomApiOptions { uniqueName?: string; }
export interface ExportCustomApiResult { uniqueName: string; filePath: string; catalog: CustomApiCatalogModel; }

export interface LoadLocalCustomApiCatalogOptions { uniqueName?: string; }
export type LoadLocalCustomApiCatalogResult = CustomApiCatalogModel;

export interface DiffCustomApiOptions { uniqueName?: string; }
export type DiffCustomApiResult = CustomApiSemanticDiffResult;

export interface BuildCustomApiSyncPlanOptions { uniqueName?: string; }
export interface BuildCustomApiSyncPlanResult {
  uniqueName: string;
  filePath: string;
  stateFilePath: string;
  plan: CustomApiSyncPlan;
  executionState: CustomApiSyncExecutionState;
}

export interface ExecuteCustomApiSyncOperationOptions {
  uniqueName?: string;
  operationId: string;
  simulate?: boolean;
}
export interface ExecuteCustomApiSyncOperationResult {
  uniqueName: string;
  filePath: string;
  stateFilePath: string;
  result: CustomApiSyncOperationResult;
  executionState: CustomApiSyncExecutionState;
}

export interface ExecuteCustomApiSyncPlanOptions {
  uniqueName?: string;
  simulate?: boolean;
}
export interface ExecuteCustomApiSyncPlanResult {
  uniqueName: string;
  filePath: string;
  stateFilePath: string;
  executionState: CustomApiSyncExecutionState;
}
