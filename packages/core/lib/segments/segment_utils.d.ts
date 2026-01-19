import * as http from 'http';

export const streamingThreshold: number;

export function getCurrentTime(): number;

export function setOrigin(origin: string): void;

export function setPluginData(pluginData: object): void;

export function setSDKData(sdkData: object): void;

export function setServiceData(serviceData: any): void;

export function setStreamingThreshold(threshold: number): void;

export function getStreamingThreshold(): number;

export function getHttpResponseData(res: http.ServerResponse): object;

export function getJsonStringifyReplacer(): (key: string, value: any) => any;
