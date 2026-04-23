import { DataverseClient } from "./dataverseClient.js";
import type {
  CustomApiCatalogModel,
  CustomApiDefinitionModel,
  CustomApiParameterModel,
  CustomApiResponsePropertyModel,
  CustomApiSummaryModel,
} from "../models/customApiModels.js";
import { CUSTOM_API_SCHEMA_VERSION } from "../models/customApiModels.js";

interface PluginTypeRow { plugintypeid?: string; typename?: string; assemblyname?: string; name?: string; version?: string; }
interface DataverseRequestParameterRow { customapirequestparameterid?: string; uniquename: string; name?: string; displayname?: string; description?: string; logicalentityname?: string; isoptional?: boolean; type?: number; }
interface DataverseResponsePropertyRow { customapiresponsepropertyid?: string; uniquename: string; name?: string; displayname?: string; description?: string; logicalentityname?: string; type?: number; }
interface DataverseCustomApiRow {
  customapiid: string; uniquename: string; name?: string; displayname?: string; description?: string;
  executeprivilegename?: string; bindingtype?: number; boundentitylogicalname?: string;
  isfunction?: boolean; isprivate?: boolean; workflowsdkstepenabled?: boolean; allowedcustomprocessingsteptype?: number;
  PluginTypeId?: PluginTypeRow; CustomAPIRequestParameters?: DataverseRequestParameterRow[]; CustomAPIResponseProperties?: DataverseResponsePropertyRow[];
}

const mapBindingType = (v?: number) => v === 0 ? "Global" : v === 1 ? "Entity" : v === 2 ? "EntityCollection" : "Unknown";
const mapAllowed = (v?: number) => v === 0 ? "None" : v === 1 ? "AsyncOnly" : v === 2 ? "SyncAndAsync" : "Unknown";
const mapType = (v?: number) => ({ 0: "Boolean", 1: "DateTime", 2: "Decimal", 3: "Entity", 4: "EntityCollection", 5: "EntityReference", 6: "Float", 7: "Integer", 8: "Money", 9: "Picklist", 10: "String", 11: "StringArray", 12: "Guid" } as Record<number, string>)[v ?? -1] ?? "Unknown";
const revBinding = (v: string) => v === "Global" ? 0 : v === "Entity" ? 1 : v === "EntityCollection" ? 2 : (() => { throw new Error(`Unbekannter bindingType-Wert '${v}'.`); })();
const revAllowed = (v: string) => v === "None" ? 0 : v === "AsyncOnly" ? 1 : v === "SyncAndAsync" ? 2 : (() => { throw new Error(`Unbekannter allowedCustomProcessingStepType-Wert '${v}'.`); })();
const revType = (v: string) => ({ Boolean: 0, DateTime: 1, Decimal: 2, Entity: 3, EntityCollection: 4, EntityReference: 5, Float: 6, Integer: 7, Money: 8, Picklist: 9, String: 10, StringArray: 11, Guid: 12 } as Record<string, number>)[v] ?? (() => { throw new Error(`Unbekannter Parameter-Typ '${v}'.`); })();
const escapeODataString = (value: string) => value.replace(/'/g, "''");
function addIfDefined(
  target: Record<string, unknown>,
  field: string,
  value: unknown
): void {
  if (value !== undefined && value !== null && value !== "") {
    target[field] = value;
  }
}
function mapRequestParameter(row: DataverseRequestParameterRow): CustomApiParameterModel {
  const parameter: CustomApiParameterModel = { uniqueName: row.uniquename, type: mapType(row.type), isOptional: row.isoptional ?? false };
  if (row.name) parameter.name = row.name;
  if (row.displayname) parameter.displayName = row.displayname;
  if (row.description) parameter.description = row.description;
  if (row.logicalentityname) parameter.logicalEntityName = row.logicalentityname;
  return parameter;
}
function mapResponseProperty(row: DataverseResponsePropertyRow): CustomApiResponsePropertyModel {
  const property: CustomApiResponsePropertyModel = { uniqueName: row.uniquename, type: mapType(row.type) };
  if (row.name) property.name = row.name;
  if (row.displayname) property.displayName = row.displayname;
  if (row.description) property.description = row.description;
  if (row.logicalentityname) property.logicalEntityName = row.logicalentityname;
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
    allowedCustomProcessingStepType: mapAllowed(row.allowedcustomprocessingsteptype),
  };
  if (row.description) summary.description = row.description;
  if (row.boundentitylogicalname) summary.boundEntityLogicalName = row.boundentitylogicalname;
  if (row.executeprivilegename) summary.executePrivilegeName = row.executeprivilegename;
  if (row.PluginTypeId?.typename) summary.pluginTypeName = row.PluginTypeId.typename;
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
    allowedCustomProcessingStepType: mapAllowed(row.allowedcustomprocessingsteptype),
    requestParameters: (row.CustomAPIRequestParameters ?? []).map(mapRequestParameter),
    responseProperties: (row.CustomAPIResponseProperties ?? []).map(mapResponseProperty),
  };
  if (row.description) definition.description = row.description;
  if (row.executeprivilegename) definition.executePrivilegeName = row.executeprivilegename;
  if (row.boundentitylogicalname) definition.boundEntityLogicalName = row.boundentitylogicalname;
  if (row.PluginTypeId?.typename) definition.pluginTypeName = row.PluginTypeId.typename;
  if (row.PluginTypeId?.plugintypeid) definition.pluginTypeId = row.PluginTypeId.plugintypeid;
  if (row.PluginTypeId?.assemblyname) definition.pluginAssemblyName = row.PluginTypeId.assemblyname;
  if (row.PluginTypeId?.name) definition.pluginTypeFriendlyName = row.PluginTypeId.name;
  if (row.PluginTypeId?.version) definition.pluginAssemblyVersion = row.PluginTypeId.version;
  return definition;
}
function buildCustomApiPayload(definition: CustomApiDefinitionModel, changedFields?: string[]): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const include = (field: string): boolean => !changedFields || changedFields.includes(field);
  if (include("uniqueName")) p.uniquename = definition.uniqueName;
  if (include("displayName")) p.displayname = definition.displayName;
  if (include("name")) p.name = definition.name;
  if (include("description")) addIfDefined(p, "description", definition.description);
  if (include("bindingType")) p.bindingtype = revBinding(definition.bindingType);
  if (include("executePrivilegeName")) addIfDefined(p, "executeprivilegename", definition.executePrivilegeName);
  if (include("boundEntityLogicalName")) addIfDefined(p, "boundentitylogicalname", definition.boundEntityLogicalName);
  if (include("isFunction")) p.isfunction = definition.isFunction;
  if (include("isPrivate")) p.isprivate = definition.isPrivate;
  if (include("workflowSdkStepEnabled")) p.workflowsdkstepenabled = definition.workflowSdkStepEnabled;
  if (include("allowedCustomProcessingStepType")) p.allowedcustomprocessingsteptype = revAllowed(definition.allowedCustomProcessingStepType);
  if ((include("pluginTypeId") || include("pluginTypeName")) && definition.pluginTypeId) p["plugintypeid@odata.bind"] = `/plugintypes(${definition.pluginTypeId})`;
  return p;
}
function buildRequestPayload(parameter: CustomApiParameterModel, customApiId?: string, changedFields?: string[]): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const include = (field: string): boolean => !changedFields || changedFields.includes(field);
  if (include("uniqueName")) p.uniquename = parameter.uniqueName;
  if (include("name")) addIfDefined(p, "name", parameter.name);
  if (include("displayName")) addIfDefined(p, "displayname", parameter.displayName);
  if (include("description")) addIfDefined(p, "description", parameter.description);
  if (include("type")) p.type = revType(parameter.type);
  if (include("isOptional")) p.isoptional = parameter.isOptional;
  if (include("logicalEntityName")) addIfDefined(p, "logicalentityname", parameter.logicalEntityName);
  if (customApiId) p["CustomAPIId@odata.bind"] = `/customapis(${customApiId})`;
  return p;
}
function buildResponsePayload(property: CustomApiResponsePropertyModel, customApiId?: string, changedFields?: string[]): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const include = (field: string): boolean => !changedFields || changedFields.includes(field);
  if (include("uniqueName")) p.uniquename = property.uniqueName;
  if (include("name")) addIfDefined(p, "name", property.name);
  if (include("displayName")) addIfDefined(p, "displayname", property.displayName);
  if (include("description")) addIfDefined(p, "description", property.description);
  if (include("type")) p.type = revType(property.type);
  if (include("logicalEntityName")) addIfDefined(p, "logicalentityname", property.logicalEntityName);
  if (customApiId) p["CustomAPIId@odata.bind"] = `/customapis(${customApiId})`;
  return p;
}

export class CustomApiRepository {
  public constructor(private readonly client: DataverseClient) { }

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

  private async getCustomApiRowByUniqueName(uniqueName: string): Promise<DataverseCustomApiRow | null> {
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

  public async getCustomApiByUniqueName(uniqueName: string): Promise<CustomApiDefinitionModel | null> {
    const row = await this.getCustomApiRowByUniqueName(uniqueName);
    return row ? mapDefinition(row) : null;
  }

  public async createCustomApi(definition: CustomApiDefinitionModel): Promise<void> {
    const http = await this.client.createHttpClient();
    await http.post("/customapis", buildCustomApiPayload(definition));
  }

  public async updateCustomApi(definition: CustomApiDefinitionModel, changedFields?: string[]): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(definition.uniqueName);
    if (!row?.customapiid) throw new Error(`Custom API '${definition.uniqueName}' wurde für Update nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.patch(`/customapis(${row.customapiid})`, buildCustomApiPayload(definition, changedFields));
  }

  public async deleteCustomApi(uniqueName: string): Promise<void> {
    const row = await this.getCustomApiRowByUniqueName(uniqueName);
    if (!row?.customapiid) throw new Error(`Custom API '${uniqueName}' wurde für Delete nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.delete(`/customapis(${row.customapiid})`);
  }

  public async createRequestParameter(customApiUniqueName: string, parameter: CustomApiParameterModel): Promise<void> {
    const customApi = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    if (!customApi?.customapiid) throw new Error(`Custom API '${customApiUniqueName}' wurde für Request-Parameter-Create nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.post("/customapirequestparameters", buildRequestPayload(parameter, customApi.customapiid));
  }

  public async updateRequestParameter(customApiUniqueName: string, parameter: CustomApiParameterModel, changedFields?: string[]): Promise<void> {
    const customApi = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = customApi?.CustomAPIRequestParameters?.find((i) => i.uniquename === parameter.uniqueName);
    if (!existing?.customapirequestparameterid) throw new Error(`Request-Parameter '${parameter.uniqueName}' wurde für Update nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.patch(`/customapirequestparameters(${existing.customapirequestparameterid})`, buildRequestPayload(parameter, undefined, changedFields));
  }

  public async deleteRequestParameter(customApiUniqueName: string, parameterUniqueName: string): Promise<void> {
    const customApi = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = customApi?.CustomAPIRequestParameters?.find((i) => i.uniquename === parameterUniqueName);
    if (!existing?.customapirequestparameterid) throw new Error(`Request-Parameter '${parameterUniqueName}' wurde für Delete nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.delete(`/customapirequestparameters(${existing.customapirequestparameterid})`);
  }

  public async createResponseProperty(customApiUniqueName: string, property: CustomApiResponsePropertyModel): Promise<void> {
    const customApi = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    if (!customApi?.customapiid) throw new Error(`Custom API '${customApiUniqueName}' wurde für Response-Property-Create nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.post("/customapiresponseproperties", buildResponsePayload(property, customApi.customapiid));
  }

  public async updateResponseProperty(customApiUniqueName: string, property: CustomApiResponsePropertyModel, changedFields?: string[]): Promise<void> {
    const customApi = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = customApi?.CustomAPIResponseProperties?.find((i) => i.uniquename === property.uniqueName);
    if (!existing?.customapiresponsepropertyid) throw new Error(`Response-Property '${property.uniqueName}' wurde für Update nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.patch(`/customapiresponseproperties(${existing.customapiresponsepropertyid})`, buildResponsePayload(property, undefined, changedFields));
  }

  public async deleteResponseProperty(customApiUniqueName: string, propertyUniqueName: string): Promise<void> {
    const customApi = await this.getCustomApiRowByUniqueName(customApiUniqueName);
    const existing = customApi?.CustomAPIResponseProperties?.find((i) => i.uniquename === propertyUniqueName);
    if (!existing?.customapiresponsepropertyid) throw new Error(`Response-Property '${propertyUniqueName}' wurde für Delete nicht gefunden.`);
    const http = await this.client.createHttpClient();
    await http.delete(`/customapiresponseproperties(${existing.customapiresponsepropertyid})`);
  }

  public async exportCatalog(uniqueName: string, options?: { environmentUrl?: string }): Promise<CustomApiCatalogModel> {
    const api = await this.getCustomApiByUniqueName(uniqueName);
    if (!api) throw new Error(`Custom API '${uniqueName}' wurde nicht gefunden.`);
    const catalog: CustomApiCatalogModel = {
      schemaVersion: CUSTOM_API_SCHEMA_VERSION,
      source: { exportedAtUtc: new Date().toISOString() },
      customApis: [api],
    };
    if (options?.environmentUrl) catalog.source.environmentUrl = options.environmentUrl;
    return catalog;
  }
}
