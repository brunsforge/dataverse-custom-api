import { DataverseClient } from "./dataverseClient.js";
import type {
  CustomApiCatalogModel,
  CustomApiDefinitionModel,
  CustomApiParameterModel,
  CustomApiResponsePropertyModel,
  CustomApiSummaryModel,
} from "../models/customApiModels.js";
import { CUSTOM_API_SCHEMA_VERSION } from "../models/customApiModels.js";

interface PluginTypeRow {
  plugintypeid?: string;
  typename?: string;
  assemblyname?: string;
  name?: string;
  version?: string;
}

interface DataverseRequestParameterRow {
  uniquename: string;
  name?: string;
  displayname?: string;
  description?: string;
  logicalentityname?: string;
  isoptional?: boolean;
  type?: number;
}

interface DataverseResponsePropertyRow {
  uniquename: string;
  name?: string;
  displayname?: string;
  description?: string;
  logicalentityname?: string;
  type?: number;
}

interface DataverseCustomApiRow {
  customapiid: string;
  uniquename: string;
  name?: string;
  displayname?: string;
  description?: string;
  executeprivilegename?: string;
  bindingtype?: number;
  boundentitylogicalname?: string;
  isfunction?: boolean;
  isprivate?: boolean;
  workflowsdkstepenabled?: boolean;
  allowedcustomprocessingsteptype?: number;
  PluginTypeId?: PluginTypeRow;
  CustomAPIRequestParameters?: DataverseRequestParameterRow[];
  CustomAPIResponseProperties?: DataverseResponsePropertyRow[];
}

function mapBindingType(value?: number): string {
  switch (value) {
    case 0:
      return "Global";
    case 1:
      return "Entity";
    case 2:
      return "EntityCollection";
    default:
      return "Unknown";
  }
}

function mapAllowedCustomProcessingStepType(value?: number): string {
  switch (value) {
    case 0:
      return "None";
    case 1:
      return "AsyncOnly";
    case 2:
      return "SyncAndAsync";
    default:
      return "Unknown";
  }
}

function mapParameterType(value?: number): string {
  switch (value) {
    case 0:
      return "Boolean";
    case 1:
      return "DateTime";
    case 2:
      return "Decimal";
    case 3:
      return "Entity";
    case 4:
      return "EntityCollection";
    case 5:
      return "EntityReference";
    case 6:
      return "Float";
    case 7:
      return "Integer";
    case 8:
      return "Money";
    case 9:
      return "Picklist";
    case 10:
      return "String";
    case 11:
      return "StringArray";
    case 12:
      return "Guid";
    default:
      return "Unknown";
  }
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function mapRequestParameter(row: DataverseRequestParameterRow): CustomApiParameterModel {
  const parameter: CustomApiParameterModel = {
    uniqueName: row.uniquename,
    type: mapParameterType(row.type),
    isOptional: row.isoptional ?? false,
  };

  if (row.name) {
    parameter.name = row.name;
  }

  if (row.displayname) {
    parameter.displayName = row.displayname;
  }

  if (row.description) {
    parameter.description = row.description;
  }

  if (row.logicalentityname) {
    parameter.logicalEntityName = row.logicalentityname;
  }

  return parameter;
}

function mapResponseProperty(
  row: DataverseResponsePropertyRow
): CustomApiResponsePropertyModel {
  const property: CustomApiResponsePropertyModel = {
    uniqueName: row.uniquename,
    type: mapParameterType(row.type),
  };

  if (row.name) {
    property.name = row.name;
  }

  if (row.displayname) {
    property.displayName = row.displayname;
  }

  if (row.description) {
    property.description = row.description;
  }

  if (row.logicalentityname) {
    property.logicalEntityName = row.logicalentityname;
  }

  return property;
}

function mapSummary(row: DataverseCustomApiRow): CustomApiSummaryModel {
  const summary: CustomApiSummaryModel = {
    uniqueName: row.uniquename,
    displayName: row.displayname ?? row.name ?? row.uniquename,
    name: row.name ?? row.uniquename,
    bindingType: mapBindingType(row.bindingtype),
    isFunction: row.isfunction ?? false,
    isPrivate: row.isprivate ?? false,
    workflowSdkStepEnabled: row.workflowsdkstepenabled ?? false,
    allowedCustomProcessingStepType: mapAllowedCustomProcessingStepType(
      row.allowedcustomprocessingsteptype
    ),
  };

  if (row.description) {
    summary.description = row.description;
  }

  if (row.boundentitylogicalname) {
    summary.boundEntityLogicalName = row.boundentitylogicalname;
  }

  if (row.executeprivilegename) {
    summary.executePrivilegeName = row.executeprivilegename;
  }

  if (row.PluginTypeId?.typename) {
    summary.pluginTypeName = row.PluginTypeId.typename;
  }

  return summary;
}

function mapDefinition(row: DataverseCustomApiRow): CustomApiDefinitionModel {
  const definition: CustomApiDefinitionModel = {
    uniqueName: row.uniquename,
    displayName: row.displayname ?? row.name ?? row.uniquename,
    name: row.name ?? row.uniquename,
    bindingType: mapBindingType(row.bindingtype),
    isFunction: row.isfunction ?? false,
    isPrivate: row.isprivate ?? false,
    workflowSdkStepEnabled: row.workflowsdkstepenabled ?? false,
    allowedCustomProcessingStepType: mapAllowedCustomProcessingStepType(
      row.allowedcustomprocessingsteptype
    ),
    requestParameters: (row.CustomAPIRequestParameters ?? []).map(mapRequestParameter),
    responseProperties: (row.CustomAPIResponseProperties ?? []).map(mapResponseProperty),
  };

  if (row.description) {
    definition.description = row.description;
  }

  if (row.executeprivilegename) {
    definition.executePrivilegeName = row.executeprivilegename;
  }

  if (row.boundentitylogicalname) {
    definition.boundEntityLogicalName = row.boundentitylogicalname;
  }

  if (row.PluginTypeId?.typename) {
    definition.pluginTypeName = row.PluginTypeId.typename;
  }

  if (row.PluginTypeId?.plugintypeid) {
    definition.pluginTypeId = row.PluginTypeId.plugintypeid;
  }

  if (row.PluginTypeId?.assemblyname) {
    definition.pluginAssemblyName = row.PluginTypeId.assemblyname;
  }

  if (row.PluginTypeId?.name) {
    definition.pluginTypeFriendlyName = row.PluginTypeId.name;
  }

  if (row.PluginTypeId?.version) {
    definition.pluginAssemblyVersion = row.PluginTypeId.version;
  }

  return definition;
}

export class CustomApiRepository {
  public constructor(private readonly client: DataverseClient) {}

  public async listCustomApis(): Promise<CustomApiSummaryModel[]> {
    const http = await this.client.createHttpClient();

    const response = await http.get<{ value: DataverseCustomApiRow[] }>(
      "/customapis" +
        "?$select=customapiid,uniquename,name,displayname,description,executeprivilegename,bindingtype,boundentitylogicalname,isfunction,isprivate,workflowsdkstepenabled,allowedcustomprocessingsteptype" +
        "&$expand=PluginTypeId($select=plugintypeid,typename,assemblyname,name,version)" +
        "&$orderby=uniquename"
    );

    return response.data.value.map(mapSummary);
  }

  public async getCustomApiByUniqueName(
    uniqueName: string
  ): Promise<CustomApiDefinitionModel | null> {
    const http = await this.client.createHttpClient();
    const escapedUniqueName = escapeODataString(uniqueName);

    const response = await http.get<{ value: DataverseCustomApiRow[] }>(
      "/customapis" +
        "?$select=customapiid,uniquename,name,displayname,description,executeprivilegename,bindingtype,boundentitylogicalname,isfunction,isprivate,workflowsdkstepenabled,allowedcustomprocessingsteptype" +
        `&$filter=uniquename eq '${escapedUniqueName}'` +
        "&$expand=" +
        "CustomAPIRequestParameters($select=uniquename,name,displayname,description,type,logicalentityname,isoptional)," +
        "CustomAPIResponseProperties($select=uniquename,name,displayname,description,type,logicalentityname)," +
        "PluginTypeId($select=plugintypeid,typename,assemblyname,name,version)"
    );

    const row = response.data.value[0];
    if (!row) {
      return null;
    }

    return mapDefinition(row);
  }

  public async exportCatalog(
    uniqueName: string,
    options?: {
      environmentUrl?: string;
    }
  ): Promise<CustomApiCatalogModel> {
    const api = await this.getCustomApiByUniqueName(uniqueName);

    if (!api) {
      throw new Error(`Custom API '${uniqueName}' wurde nicht gefunden.`);
    }

    const catalog: CustomApiCatalogModel = {
      schemaVersion: CUSTOM_API_SCHEMA_VERSION,
      source: {
        exportedAtUtc: new Date().toISOString(),
      },
      customApis: [api],
    };

    if (options?.environmentUrl) {
      catalog.source.environmentUrl = options.environmentUrl;
    }

    return catalog;
  }
}
