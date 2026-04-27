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
  customapirequestparameterid?: string;
  uniquename: string;
  name?: string;
  displayname?: string;
  description?: string;
  logicalentityname?: string;
  isoptional?: boolean;
  type?: number;
}

interface DataverseResponsePropertyRow {
  customapiresponsepropertyid?: string;
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

function toBindingType(value: string): number {
  switch (value) {
    case "Global":
      return 0;
    case "Entity":
      return 1;
    case "EntityCollection":
      return 2;
    default:
      throw new Error(`Unknown bindingType '${value}'.`);
  }
}

function toAllowedCustomProcessingStepType(value: string): number {
  switch (value) {
    case "None":
      return 0;
    case "AsyncOnly":
      return 1;
    case "SyncAndAsync":
      return 2;
    default:
      throw new Error(`Unknown allowedCustomProcessingStepType '${value}'.`);
  }
}

function toParameterType(value: string): number {
  switch (value) {
    case "Boolean":
      return 0;
    case "DateTime":
      return 1;
    case "Decimal":
      return 2;
    case "Entity":
      return 3;
    case "EntityCollection":
      return 4;
    case "EntityReference":
      return 5;
    case "Float":
      return 6;
    case "Integer":
      return 7;
    case "Money":
      return 8;
    case "Picklist":
      return 9;
    case "String":
      return 10;
    case "StringArray":
      return 11;
    case "Guid":
      return 12;
    default:
      throw new Error(`Unknown parameter type '${value}'.`);
  }
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function addIfDefined(
  target: Record<string, unknown>,
  field: string,
  value: unknown
): void {
  if (value !== undefined && value !== null && value !== "") {
    target[field] = value;
  }
}

function buildChildName(
  customApiUniqueName: string | undefined,
  childUniqueName: string,
  explicitName: string | undefined
): string | undefined {
  if (customApiUniqueName) {
    return `${customApiUniqueName}.${childUniqueName}`;
  }

  return explicitName;
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

function buildCustomApiPayload(
  definition: CustomApiDefinitionModel,
  changedFields?: string[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const include = (field: string): boolean => !changedFields || changedFields.includes(field);

  if (include("uniqueName")) {
    payload.uniquename = definition.uniqueName;
  }

  if (include("displayName")) {
    payload.displayname = definition.displayName;
  }

  if (include("name")) {
    payload.name = definition.name;
  }

  if (include("description")) {
    addIfDefined(payload, "description", definition.description);
  }

  if (include("bindingType")) {
    payload.bindingtype = toBindingType(definition.bindingType);
  }

  if (include("executePrivilegeName")) {
    addIfDefined(payload, "executeprivilegename", definition.executePrivilegeName);
  }

  if (include("boundEntityLogicalName")) {
    addIfDefined(payload, "boundentitylogicalname", definition.boundEntityLogicalName);
  }

  if (include("isFunction")) {
    payload.isfunction = definition.isFunction;
  }

  if (include("isPrivate")) {
    payload.isprivate = definition.isPrivate;
  }

  if (include("workflowSdkStepEnabled")) {
    payload.workflowsdkstepenabled = definition.workflowSdkStepEnabled;
  }

  if (include("allowedCustomProcessingStepType")) {
    payload.allowedcustomprocessingsteptype = toAllowedCustomProcessingStepType(
      definition.allowedCustomProcessingStepType
    );
  }

  if ((include("pluginTypeId") || include("pluginTypeName")) && definition.pluginTypeId) {
    payload["plugintypeid@odata.bind"] = `/plugintypes(${definition.pluginTypeId})`;
  }

  return payload;
}

function buildRequestParameterPayload(
  parameter: CustomApiParameterModel,
  customApiId?: string,
  changedFields?: string[],
  customApiUniqueName?: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const include = (field: string): boolean => !changedFields || changedFields.includes(field);

  if (include("uniqueName")) {
    payload.uniquename = parameter.uniqueName;
  }

  if (include("name")) {
    addIfDefined(
      payload,
      "name",
      buildChildName(customApiUniqueName, parameter.uniqueName, parameter.name)
    );
  }

  if (include("displayName")) {
    addIfDefined(payload, "displayname", parameter.displayName);
  }

  if (include("description")) {
    addIfDefined(payload, "description", parameter.description);
  }

  if (include("type")) {
    payload.type = toParameterType(parameter.type);
  }

  if (include("isOptional")) {
    payload.isoptional = parameter.isOptional;
  }

  if (include("logicalEntityName")) {
    const supportsLogicalEntityName = parameter.type === "Entity" || parameter.type === "EntityReference";
    if (supportsLogicalEntityName) {
      addIfDefined(payload, "logicalentityname", parameter.logicalEntityName);
    }
  }

  if (customApiId) {
    payload["CustomAPIId@odata.bind"] = `/customapis(${customApiId})`;
  }

  return payload;
}

function buildResponsePropertyPayload(
  property: CustomApiResponsePropertyModel,
  customApiId?: string,
  changedFields?: string[],
  customApiUniqueName?: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const include = (field: string): boolean => !changedFields || changedFields.includes(field);

  if (include("uniqueName")) {
    payload.uniquename = property.uniqueName;
  }

  if (include("name")) {
    addIfDefined(
      payload,
      "name",
      buildChildName(customApiUniqueName, property.uniqueName, property.name)
    );
  }

  if (include("displayName")) {
    addIfDefined(payload, "displayname", property.displayName);
  }

  if (include("description")) {
    addIfDefined(payload, "description", property.description);
  }

  if (include("type")) {
    payload.type = toParameterType(property.type);
  }

  if (include("logicalEntityName")) {
    const supportsLogicalEntityName = property.type === "Entity" || property.type === "EntityReference";
    if (supportsLogicalEntityName) {
      addIfDefined(payload, "logicalentityname", property.logicalEntityName);
    }
  }

  if (customApiId) {
    payload["CustomAPIId@odata.bind"] = `/customapis(${customApiId})`;
  }

  return payload;
}

export class CustomApiRepository {
  public constructor(private readonly client: DataverseClient) {}

  private async getCustomApiRowByUniqueName(
    uniqueName: string
  ): Promise<DataverseCustomApiRow | null> {
    const http = await this.client.createHttpClient();
    const escapedUniqueName = escapeODataString(uniqueName);

    const response = await http.get<{ value: DataverseCustomApiRow[] }>(
      "/customapis" +
        "?$select=customapiid,uniquename,name,displayname,description,executeprivilegename,bindingtype,boundentitylogicalname,isfunction,isprivate,workflowsdkstepenabled,allowedcustomprocessingsteptype" +
        `&$filter=uniquename eq '${escapedUniqueName}'` +
        "&$expand=" +
        "CustomAPIRequestParameters($select=customapirequestparameterid,uniquename,name,displayname,description,type,logicalentityname,isoptional)," +
        "CustomAPIResponseProperties($select=customapiresponsepropertyid,uniquename,name,displayname,description,type,logicalentityname)," +
        "PluginTypeId($select=plugintypeid,typename,assemblyname,name,version)"
    );

    return response.data.value[0] ?? null;
  }

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
    const row = await this.getCustomApiRowByUniqueName(uniqueName);
    if (!row) {
      return null;
    }

    return mapDefinition(row);
  }

  public async createCustomApi(definition: CustomApiDefinitionModel): Promise<void> {
    const http = await this.client.createHttpClient();
    await http.post("/customapis", buildCustomApiPayload(definition));
  }

  public async updateCustomApi(
    definition: CustomApiDefinitionModel,
    changedFields?: string[]
  ): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(definition.uniqueName);

    if (!row?.customapiid) {
      throw new Error(`Custom API '${definition.uniqueName}' not found for update.`);
    }

    const http = await this.client.createHttpClient();
    await http.patch(
      `/customapis(${row.customapiid})`,
      buildCustomApiPayload(definition, changedFields)
    );
  }

  public async deleteCustomApi(uniqueName: string): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(uniqueName);

    if (!row?.customapiid) {
      throw new Error(`Custom API '${uniqueName}' not found for delete.`);
    }

    const http = await this.client.createHttpClient();
    await http.delete(`/customapis(${row.customapiid})`);
  }

  public async createRequestParameter(
    customApiUniqueName: string,
    parameter: CustomApiParameterModel
  ): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(customApiUniqueName);

    if (!row?.customapiid) {
      throw new Error(
        `Custom API '${customApiUniqueName}' not found for request parameter create.`
      );
    }

    const http = await this.client.createHttpClient();
    await http.post(
      "/customapirequestparameters",
      buildRequestParameterPayload(parameter, row.customapiid, undefined, customApiUniqueName)
    );
  }

  public async updateRequestParameter(
    customApiUniqueName: string,
    parameter: CustomApiParameterModel,
    changedFields?: string[]
  ): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = row?.CustomAPIRequestParameters?.find(
      (item) => item.uniquename === parameter.uniqueName
    );

    if (!existing?.customapirequestparameterid) {
      throw new Error(
        `Request parameter '${parameter.uniqueName}' not found for update.`
      );
    }

    const http = await this.client.createHttpClient();
    await http.patch(
      `/customapirequestparameters(${existing.customapirequestparameterid})`,
      buildRequestParameterPayload(parameter, undefined, changedFields, customApiUniqueName)
    );
  }

  public async deleteRequestParameter(
    customApiUniqueName: string,
    parameterUniqueName: string
  ): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = row?.CustomAPIRequestParameters?.find(
      (item) => item.uniquename === parameterUniqueName
    );

    if (!existing?.customapirequestparameterid) {
      throw new Error(
        `Request parameter '${parameterUniqueName}' not found for delete.`
      );
    }

    const http = await this.client.createHttpClient();
    await http.delete(`/customapirequestparameters(${existing.customapirequestparameterid})`);
  }

  public async createResponseProperty(
    customApiUniqueName: string,
    property: CustomApiResponsePropertyModel
  ): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(customApiUniqueName);

    if (!row?.customapiid) {
      throw new Error(
        `Custom API '${customApiUniqueName}' not found for response property create.`
      );
    }

    const http = await this.client.createHttpClient();
    await http.post(
      "/customapiresponseproperties",
      buildResponsePropertyPayload(property, row.customapiid, undefined, customApiUniqueName)
    );
  }

  public async updateResponseProperty(
    customApiUniqueName: string,
    property: CustomApiResponsePropertyModel,
    changedFields?: string[]
  ): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = row?.CustomAPIResponseProperties?.find(
      (item) => item.uniquename === property.uniqueName
    );

    if (!existing?.customapiresponsepropertyid) {
      throw new Error(
        `Response property '${property.uniqueName}' not found for update.`
      );
    }

    const http = await this.client.createHttpClient();
    await http.patch(
      `/customapiresponseproperties(${existing.customapiresponsepropertyid})`,
      buildResponsePropertyPayload(property, undefined, changedFields, customApiUniqueName)
    );
  }

  public async deleteResponseProperty(
    customApiUniqueName: string,
    propertyUniqueName: string
  ): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = row?.CustomAPIResponseProperties?.find(
      (item) => item.uniquename === propertyUniqueName
    );

    if (!existing?.customapiresponsepropertyid) {
      throw new Error(
        `Response property '${propertyUniqueName}' not found for delete.`
      );
    }

    const http = await this.client.createHttpClient();
    await http.delete(`/customapiresponseproperties(${existing.customapiresponsepropertyid})`);
  }

  public async exportCatalog(
    uniqueName: string,
    options?: {
      environmentUrl?: string;
    }
  ): Promise<CustomApiCatalogModel> {
    const api = await this.getCustomApiByUniqueName(uniqueName);

    if (!api) {
      throw new Error(`Custom API '${uniqueName}' not found.`);
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
