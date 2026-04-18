import type { EnvironmentCache } from "../models/configModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiSummaryModel,
} from "../models/customApiModels.js";
import type {
  ConnectOptions,
  ConnectResult,
  DiffCustomApiOptions,
  DiffCustomApiResult,
  ExportCustomApiOptions,
  ExportCustomApiResult,
  GetCurrentEnvironmentResult,
  LoadLocalCustomApiCatalogOptions,
  LoadLocalCustomApiCatalogResult,
  ListCustomApisResult,
  SelectCustomApiOptions,
  SelectCustomApiResult,
} from "../models/public-types.js";
import type { RuntimeContext } from "../models/runtime-context.js";
import {
  connectToEnvironment,
  diffCustomApi,
  exportCustomApi,
  getActiveCustomApiUniqueName,
  getCurrentEnvironment,
  listCustomApis,
  loadLocalCustomApiCatalog,
  setActiveCustomApi,
} from "./customApiService.js";

export interface CoreFacade {
  connect(options: ConnectOptions): Promise<ConnectResult>;
  getCurrentEnvironment(): Promise<GetCurrentEnvironmentResult>;
  listCustomApis(): Promise<ListCustomApisResult>;
  selectCustomApi(options: SelectCustomApiOptions): Promise<SelectCustomApiResult>;
  getActiveCustomApiUniqueName(): Promise<string>;
  exportCustomApi(options?: ExportCustomApiOptions): Promise<ExportCustomApiResult>;
  loadLocalCustomApiCatalog(
    options?: LoadLocalCustomApiCatalogOptions
  ): Promise<LoadLocalCustomApiCatalogResult>;
  diffCustomApi(options?: DiffCustomApiOptions): Promise<DiffCustomApiResult>;
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

    async selectCustomApi(
      options: SelectCustomApiOptions
    ): Promise<SelectCustomApiResult> {
      return setActiveCustomApi(options.uniqueName, context);
    },

    async getActiveCustomApiUniqueName(): Promise<string> {
      return getActiveCustomApiUniqueName(context);
    },

    async exportCustomApi(
      options?: ExportCustomApiOptions
    ): Promise<ExportCustomApiResult> {
      return exportCustomApi(options?.uniqueName, context);
    },

    async loadLocalCustomApiCatalog(
      options?: LoadLocalCustomApiCatalogOptions
    ): Promise<CustomApiCatalogModel> {
      return loadLocalCustomApiCatalog(options?.uniqueName, context);
    },

    async diffCustomApi(
      options?: DiffCustomApiOptions
    ): Promise<DiffCustomApiResult> {
      return diffCustomApi(options?.uniqueName, context);
    },
  };
}
