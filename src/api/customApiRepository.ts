import { DataverseClient } from "./dataverseClient.js";
import type {
    CustomApiCatalogModel,
    CustomApiDefinitionModel,
    CustomApiParameterModel,
    CustomApiResponsePropertyModel,
} from "../models/customApiModels.js";

interface DataverseCustomApiRow {
    customapiid: string;
    uniquename: string;
    name?: string;
    displayname?: string;
    description?: string;
    bindingtype?: number;
    isfunction?: boolean;
    isprivate?: boolean;
    workflowsdkstepenabled?: boolean;
    allowedcustomprocessingsteptype?: number;
    "plugintypeid@OData.Community.Display.V1.FormattedValue"?: string;
}

interface DataverseRequestParameterRow {
    uniquename: string;
    isoptional?: boolean;
    type?: number;
}

interface DataverseResponsePropertyRow {
    uniquename: string;
    type?: number;
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
            return "Guid";
        case 8:
            return "Integer";
        case 9:
            return "Money";
        case 10:
            return "Picklist";
        case 11:
            return "String";
        case 12:
            return "StringArray";
        default:
            return "Unknown";
    }
}

function escapeODataString(value: string): string {
    return value.replace(/'/g, "''");
}

export class CustomApiRepository {
    public constructor(private readonly client: DataverseClient) { }

    public async listCustomApis(): Promise<CustomApiDefinitionModel[]> {
        const http = await this.client.createHttpClient();

        const response = await http.get<{ value: DataverseCustomApiRow[] }>(
            "/customapis" +
            "?$select=customapiid,uniquename,name,displayname,description,bindingtype,isfunction,isprivate,workflowsdkstepenabled,allowedcustomprocessingsteptype" +
            "&$orderby=uniquename"
        );

        return response.data.value.map((row) => {
            const item: CustomApiDefinitionModel = {
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
                requestParameters: [],
                responseProperties: [],
            };

            if (row.description) {
                item.description = row.description;
            }

            const pluginTypeName =
                row["plugintypeid@OData.Community.Display.V1.FormattedValue"];

            if (pluginTypeName) {
                item.pluginTypeName = pluginTypeName;
            }

            return item;
        });
    }

    public async getCustomApiByUniqueName(
        uniqueName: string
    ): Promise<CustomApiDefinitionModel | null> {
        const http = await this.client.createHttpClient();
        const escapedUniqueName = escapeODataString(uniqueName);

        const apiResponse = await http.get<{ value: DataverseCustomApiRow[] }>(
            "/customapis" +
            "?$select=customapiid,uniquename,name,displayname,description,bindingtype,isfunction,isprivate,workflowsdkstepenabled,allowedcustomprocessingsteptype" +
            `&$filter=uniquename eq '${escapedUniqueName}'`
        );

        const apiRow = apiResponse.data.value[0];

        if (!apiRow) {
            return null;
        }

        const requestResponse = await http.get<{ value: DataverseRequestParameterRow[] }>(
            "/customapirequestparameters" +
            "?$select=uniquename,isoptional,type" +
            `&$filter=_customapiid_value eq '${apiRow.customapiid}'`
        );

        const responsePropertyResponse = await http.get<{
            value: DataverseResponsePropertyRow[];
        }>(
            "/customapiresponseproperties" +
            "?$select=uniquename,type" +
            `&$filter=_customapiid_value eq '${apiRow.customapiid}'`
        );

        const requestParameters: CustomApiParameterModel[] =
            requestResponse.data.value.map((row) => ({
                uniqueName: row.uniquename,
                type: mapParameterType(row.type),
                isOptional: row.isoptional ?? false,
            }));

        const responseProperties: CustomApiResponsePropertyModel[] =
            responsePropertyResponse.data.value.map((row) => ({
                uniqueName: row.uniquename,
                type: mapParameterType(row.type),
            }));

        const result: CustomApiDefinitionModel = {
            uniqueName: apiRow.uniquename,
            displayName: apiRow.displayname ?? apiRow.name ?? apiRow.uniquename,
            name: apiRow.name ?? apiRow.uniquename,
            bindingType: mapBindingType(apiRow.bindingtype),
            isFunction: apiRow.isfunction ?? false,
            isPrivate: apiRow.isprivate ?? false,
            workflowSdkStepEnabled: apiRow.workflowsdkstepenabled ?? false,
            allowedCustomProcessingStepType: mapAllowedCustomProcessingStepType(
                apiRow.allowedcustomprocessingsteptype
            ),
            requestParameters,
            responseProperties,
        };

        if (apiRow.description) {
            result.description = apiRow.description;
        }

        const pluginTypeName =
            apiRow["plugintypeid@OData.Community.Display.V1.FormattedValue"];

        if (pluginTypeName) {
            result.pluginTypeName = pluginTypeName;
        }

        return result;
    }

    public async exportCatalog(uniqueName: string): Promise<CustomApiCatalogModel> {
        const api = await this.getCustomApiByUniqueName(uniqueName);

        if (!api) {
            throw new Error(`Custom API '${uniqueName}' wurde nicht gefunden.`);
        }

        return {
            customApis: [api],
        };
    }
}