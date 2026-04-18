export type CustomApiBindingType = "Global" | "Entity" | "EntityCollection";

export type CustomApiAllowedProcessingStepType = "None" | "AsyncOnly" | "SyncAndAsync";

export type CustomApiParameterType =
    | "Boolean"
    | "DateTime"
    | "Decimal"
    | "Entity"
    | "EntityCollection"
    | "EntityReference"
    | "Float"
    | "Guid"
    | "Integer"
    | "Money"
    | "Picklist"
    | "String"
    | "StringArray";

export interface CustomApiParameterModel {
    uniqueName: string;
    type: CustomApiParameterType | string;
    isOptional?: boolean;
}

export interface CustomApiResponsePropertyModel {
    uniqueName: string;
    type: CustomApiParameterType | string;
}

export interface CustomApiDefinitionModel {
    uniqueName: string;
    displayName: string;
    name: string;
    description?: string;
    bindingType: CustomApiBindingType | string;
    pluginTypeName?: string;
    isFunction: boolean;
    isPrivate: boolean;
    workflowSdkStepEnabled: boolean;
    allowedCustomProcessingStepType: CustomApiAllowedProcessingStepType | string;
    requestParameters: CustomApiParameterModel[];
    responseProperties: CustomApiResponsePropertyModel[];
}

export interface CustomApiCatalogModel {
    solutionUniqueName?: string;
    pluginAssemblyName?: string;
    customApis: CustomApiDefinitionModel[];
}