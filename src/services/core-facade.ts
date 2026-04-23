import type { EnvironmentCache } from "../models/configModels.js";
import type { CustomApiCatalogModel, CustomApiSummaryModel } from "../models/customApiModels.js";
import type { BuildCustomApiSyncPlanOptions, BuildCustomApiSyncPlanResult, ConnectOptions, ConnectResult, DiffCustomApiOptions, DiffCustomApiResult, ExecuteCustomApiSyncOperationOptions, ExecuteCustomApiSyncOperationResult, ExecuteCustomApiSyncPlanOptions, ExecuteCustomApiSyncPlanResult, ExportCustomApiOptions, ExportCustomApiResult, GetCurrentEnvironmentResult, LoadLocalCustomApiCatalogOptions, LoadLocalCustomApiCatalogResult, ListCustomApisResult, SelectCustomApiOptions, SelectCustomApiResult } from "../models/public-types.js";
import type { RuntimeContext } from "../models/runtime-context.js";
import { buildCustomApiSyncPlan, connectToEnvironment, diffCustomApi, executeCustomApiSyncOperation, executeCustomApiSyncPlan, exportCustomApi, getActiveCustomApiUniqueName, getCurrentCustomApi, getCurrentEnvironment, listCustomApis, loadLocalCustomApiCatalog, removeCustomApi, setActiveCustomApi, type CurrentCustomApiResult, type RemoveCustomApiResult } from "./customApiService.js";

export interface CoreFacade { connect(options: ConnectOptions): Promise<ConnectResult>; getCurrentEnvironment(): Promise<GetCurrentEnvironmentResult>; listCustomApis(): Promise<ListCustomApisResult>; selectCustomApi(options: SelectCustomApiOptions): Promise<SelectCustomApiResult>; getActiveCustomApiUniqueName(): Promise<string>; getCurrentCustomApi(): Promise<CurrentCustomApiResult>; removeCustomApi(uniqueName?: string): Promise<RemoveCustomApiResult>; exportCustomApi(options?: ExportCustomApiOptions): Promise<ExportCustomApiResult>; loadLocalCustomApiCatalog(options?: LoadLocalCustomApiCatalogOptions): Promise<LoadLocalCustomApiCatalogResult>; diffCustomApi(options?: DiffCustomApiOptions): Promise<DiffCustomApiResult>; buildCustomApiSyncPlan(options?: BuildCustomApiSyncPlanOptions): Promise<BuildCustomApiSyncPlanResult>; executeCustomApiSyncOperation(options: ExecuteCustomApiSyncOperationOptions): Promise<ExecuteCustomApiSyncOperationResult>; executeCustomApiSyncPlan(options?: ExecuteCustomApiSyncPlanOptions): Promise<ExecuteCustomApiSyncPlanResult>; }

export function createCoreFacade(context?: RuntimeContext): CoreFacade {
  return {
    async connect(options) { return connectToEnvironment(options.environmentUrl, context); },
    async getCurrentEnvironment() { return getCurrentEnvironment(context) as Promise<EnvironmentCache>; },
    async listCustomApis() { return listCustomApis(context) as Promise<CustomApiSummaryModel[]>; },
    async selectCustomApi(options) { return setActiveCustomApi(options.uniqueName, context); },
    async getActiveCustomApiUniqueName() { return getActiveCustomApiUniqueName(context); },
    async getCurrentCustomApi() { return getCurrentCustomApi(context); },
    async removeCustomApi(uniqueName?: string) { return removeCustomApi(uniqueName, context); },
    async exportCustomApi(options?: ExportCustomApiOptions) { return exportCustomApi(options?.uniqueName, context); },
    async loadLocalCustomApiCatalog(options?: LoadLocalCustomApiCatalogOptions) { return loadLocalCustomApiCatalog(options?.uniqueName, context) as Promise<CustomApiCatalogModel>; },
    async diffCustomApi(options?: DiffCustomApiOptions) { return diffCustomApi(options?.uniqueName, context); },
    async buildCustomApiSyncPlan(options?: BuildCustomApiSyncPlanOptions) { return buildCustomApiSyncPlan(options?.uniqueName, context); },
    async executeCustomApiSyncOperation(options: ExecuteCustomApiSyncOperationOptions) { return executeCustomApiSyncOperation(options.operationId, options.uniqueName, options.simulate ?? false, context); },
    async executeCustomApiSyncPlan(options?: ExecuteCustomApiSyncPlanOptions) { return executeCustomApiSyncPlan(options?.uniqueName, options?.simulate ?? false, context); },
  };
}
