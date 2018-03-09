import 'reflect-metadata';
import { ServerObject, InfoObject } from '@loopback/openapi-v3-types';
import { MetadataArgsStorage } from 'routing-controllers';
export * from './helper';
export declare class DefaultSuccessResponse {
    success: true;
}
export interface DocConfig {
    openapi?: string;
    info: InfoObject;
    servers?: ServerObject[];
    /**
     * this is required by typescript-json-schema,
     * tell typescript-json-schema where to parse json-schema
     * according to specifiy class name
     */
    source?: string;
    defaultSuccessResponse?: Function;
    outputFile?: string;
}
export default function docGenerator(storage: MetadataArgsStorage, docConfig: DocConfig): Promise<void>;
