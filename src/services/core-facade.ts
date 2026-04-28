import type { EnvironmentCache } from "../models/configModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiSummaryModel,
} from "../models/customApiModels.js";
import type {
  BuildCustomApiSyncPlanOptions,
  BuildCustomApiSyncPlanResult,
  CheckCustomApiMetadataOptions,
  CheckCustomApiMetadataResult,
  ConnectOptions,
  ConnectResult,
  DiffCustomApiOptions,
  DiffCustomApiResult,
  ExecuteCustomApiSyncOperationOptions,
  ExecuteCustomApiSyncOperationResult,
  ExecuteCustomApiSyncPlanOptions,
  ExecuteCustomApiSyncPlanResult,
  ExportCustomApiOptions,
  ExportCustomApiResult,
  GetCurrentEnvironmentResult,
  LoadLocalCustomApiCatalogOptions,
  LoadLocalCustomApiCatalogResult,
  ListCustomApisResult,
  SelectCustomApiOptions,
  SelectCustomApiResult,
  ListPublishersResult,
  ValidateCustomApiOptions,
  ValidateCustomApiResult,
  ValidatePrivilegesResult,
} from "../models/public-types.js";
import type { RuntimeContext } from "../models/runtime-context.js";
import {
  buildCustomApiSyncPlan,
  checkCustomApiMetadataConsistency,
  connectToEnvironment,
  diffCustomApi,
  executeCustomApiSyncOperation,
  executeCustomApiSyncPlan,
  exportCustomApi,
  getActiveCustomApiUniqueName,
  getCurrentCustomApi,
  getCurrentEnvironment,
  listCustomApis,
  loadLocalCustomApiCatalog,
  removeCustomApi,
  setActiveCustomApi,
  validateLocalCatalog,
  validatePrivileges,
  listPublishers,
  type CurrentCustomApiResult,
  type RemoveCustomApiResult,
} from "./customApiService.js";

export interface CoreFacade {
  connect(options: ConnectOptions): Promise<ConnectResult>;
  getCurrentEnvironment(): Promise<GetCurrentEnvironmentResult>;
  listCustomApis(): Promise<ListCustomApisResult>;
  selectCustomApi(options: SelectCustomApiOptions): Promise<SelectCustomApiResult>;
  getActiveCustomApiUniqueName(): Promise<string>;
  getCurrentCustomApi(): Promise<CurrentCustomApiResult>;
  removeCustomApi(uniqueName?: string): Promise<RemoveCustomApiResult>;
  exportCustomApi(options?: ExportCustomApiOptions): Promise<ExportCustomApiResult>;
  loadLocalCustomApiCatalog(
    options?: LoadLocalCustomApiCatalogOptions
  ): Promise<LoadLocalCustomApiCatalogResult>;
  validateCustomApi(options?: ValidateCustomApiOptions): Promise<ValidateCustomApiResult>;
  diffCustomApi(options?: DiffCustomApiOptions): Promise<DiffCustomApiResult>;
  buildCustomApiSyncPlan(
    options?: BuildCustomApiSyncPlanOptions
  ): Promise<BuildCustomApiSyncPlanResult>;
  executeCustomApiSyncOperation(
    options: ExecuteCustomApiSyncOperationOptions
  ): Promise<ExecuteCustomApiSyncOperationResult>;
  executeCustomApiSyncPlan(
    options?: ExecuteCustomApiSyncPlanOptions
  ): Promise<ExecuteCustomApiSyncPlanResult>;
  checkCustomApiMetadataConsistency(
    options?: CheckCustomApiMetadataOptions
  ): Promise<CheckCustomApiMetadataResult>;
  validatePrivileges(): Promise<ValidatePrivilegesResult>;
  listPublishers(): Promise<ListPublishersResult>;
}

export function createCoreFacade(context?: RuntimeContext): CoreFacade {
  return {
    async connect(options: ConnectOptions): Promise<ConnectResult> {
      return connectToEnvironment(options.environmentUrl, context);
    },

    async getCurrentEnvironment(): Promise<EnvironmentCache> {
      return getCurrentEnvironment(context);
    },

    async listCustomApis(): Promise<CustomApiSummaryModel[]> {
      return listCustomApis(context);
    },

    async selectCustomApi(options: SelectCustomApiOptions): Promise<SelectCustomApiResult> {
      return setActiveCustomApi(options.uniqueName, context);
    },

    async getActiveCustomApiUniqueName(): Promise<string> {
      return getActiveCustomApiUniqueName(context);
    },

    async getCurrentCustomApi(): Promise<CurrentCustomApiResult> {
      return getCurrentCustomApi(context);
    },

    async removeCustomApi(uniqueName?: string): Promise<RemoveCustomApiResult> {
      return removeCustomApi(uniqueName, context);
    },

    async exportCustomApi(options?: ExportCustomApiOptions): Promise<ExportCustomApiResult> {
      return exportCustomApi(options?.uniqueName, context);
    },

    async loadLocalCustomApiCatalog(
      options?: LoadLocalCustomApiCatalogOptions
    ): Promise<CustomApiCatalogModel> {
      return loadLocalCustomApiCatalog(options?.uniqueName, context);
    },

    async validateCustomApi(options?: ValidateCustomApiOptions): Promise<ValidateCustomApiResult> {
      return validateLocalCatalog(options?.uniqueName, context);
    },

    async diffCustomApi(options?: DiffCustomApiOptions): Promise<DiffCustomApiResult> {
      return diffCustomApi(options?.uniqueName, context);
    },

    async buildCustomApiSyncPlan(
      options?: BuildCustomApiSyncPlanOptions
    ): Promise<BuildCustomApiSyncPlanResult> {
      return buildCustomApiSyncPlan(options?.uniqueName, context);
    },

    async executeCustomApiSyncOperation(
      options: ExecuteCustomApiSyncOperationOptions
    ): Promise<ExecuteCustomApiSyncOperationResult> {
      return executeCustomApiSyncOperation(
        options.operationId,
        options.uniqueName,
        options.simulate ?? false,
        context
      );
    },

    async executeCustomApiSyncPlan(
      options?: ExecuteCustomApiSyncPlanOptions
    ): Promise<ExecuteCustomApiSyncPlanResult> {
      return executeCustomApiSyncPlan(
        options?.uniqueName,
        options?.simulate ?? false,
        context
      );
    },

    async checkCustomApiMetadataConsistency(
      options?: CheckCustomApiMetadataOptions
    ): Promise<CheckCustomApiMetadataResult> {
      return checkCustomApiMetadataConsistency(options?.uniqueName, context);
    },

    async validatePrivileges(): Promise<ValidatePrivilegesResult> {
      return validatePrivileges(context);
    },

    async listPublishers(): Promise<ListPublishersResult> {
      return listPublishers(context);
    },
  };
}
