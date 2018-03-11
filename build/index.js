"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const util_1 = require("util");
const fs = require("fs");
const path = require("path");
const TJS = require("typescript-json-schema");
const glob = require("glob");
/**
 * IMPORTANT
 * WIP WIP WIP
 *
 * TO MAKE THIS DOCGENERATOR WORK, YOU SHOULD FOLLOW BELOW LIMITATION:
 *
 * 1. the param name be decorated by `@QueryParams` should always be query
 * 2. the param name be decorated by `@Body` should always be body
 * 3. always use class or inherit type as params type, don't use type operator
 * 4. every controller should have a base path, which will be used as a tag
 * 5. route path should be a string, regex is not supported now
 * 6, set `emitDecoratorMetadata` to `true` in `tsconfig.json`
 */
// Get param name of function
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
const ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    return fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES) || [];
}
__export(require("./helper"));
// Default success response type if don't use @ResType
class DefaultSuccessResponse {
}
exports.DefaultSuccessResponse = DefaultSuccessResponse;
/**
 * walk through json-schema and find sub ref
 */
function definitionParse(doc, generator, definitions) {
    const regex = /#\/definitions\/(\w+)/g;
    for (;;) {
        const definitionMatchGroup = regex.exec(definitions);
        if (definitionMatchGroup === null) {
            break;
        }
        else {
            if (!doc.components.schemas[definitionMatchGroup[1]]) {
                doc.components.schemas[definitionMatchGroup[1]] = JSON.parse(JSON.stringify(generator.getSchemaForSymbol(definitionMatchGroup[1])).replace(/#\/definitions\//g, '#/components/schemas/'));
            }
        }
    }
}
function docGenerator(storage, docConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // if no version specifiy, the version of package.json will be used
        docConfig.info.version = docConfig.info.version || JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), { encoding: 'utf8' })).version;
        docConfig.openapi = docConfig.openapi || '3.0.0';
        docConfig.outputFile = docConfig.outputFile || 'doc.json';
        docConfig.defaultSuccessResponse = docConfig.defaultSuccessResponse || DefaultSuccessResponse;
        docConfig.source = docConfig.source || 'src/**/*.ts';
        // TODO: when strictNullChecks were set to true, typescript-json-schema will generator wrong json-schema.
        const program = TJS.getProgramFromFiles(glob.sync(docConfig.source), Object.assign({}, JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'tsconfig.json'), { encoding: 'utf8' }))
            .compilerOptions, { strictNullChecks: false }), process.cwd());
        const generator = TJS.buildGenerator(program, { required: true });
        const doc = {
            openapi: docConfig.openapi,
            info: {
                title: docConfig.info.title,
                description: docConfig.info.description,
                version: docConfig.info.version
            },
            servers: docConfig.servers,
            paths: {},
            tags: [],
            components: {
                schemas: {}
            }
        };
        // controller should always has a base path
        doc.tags = storage.controllers.map(c => ({
            name: c.route.substr(1)
        }));
        storage.actions.forEach(action => {
            const target = Reflect.construct(action.target, []);
            const controller = storage.controllers.find(c => c.target === action.target);
            // Regex route is no supported for now
            if (action.route instanceof RegExp) {
                throw new Error('TODO RegExp 文档未支持');
            }
            const route = controller.route + action.route.replace(/:(\w+)/g, '{$1}');
            const params = storage.filterParamsWithTargetAndMethod(action.target, action.method);
            const paramTypes = Reflect.getMetadata('design:paramtypes', target, action.method);
            const paramNames = getParamNames(target[action.method]);
            let returnType = Reflect.getMetadata('design:returntype2', target, action.method);
            let IS_RETURN_TYPE_IS_ARRAY = false;
            const IS_RETURN_TYPE_IS_JS_TYPE = ['number', 'string', 'boolean'].includes(returnType && returnType.toLowerCase());
            if (!returnType) {
                returnType = docConfig.defaultSuccessResponse.name;
            }
            /**
             * @ResType(Article) -> response type is Article
             * @ResType([Article]) -> response type is Article[]
             */
            if (!IS_RETURN_TYPE_IS_JS_TYPE && returnType && /\[\]$/.test(returnType)) {
                IS_RETURN_TYPE_IS_ARRAY = true;
                returnType = returnType.replace('[]', '');
            }
            if (IS_RETURN_TYPE_IS_JS_TYPE) {
                returnType = returnType.toLowerCase();
            }
            if (!IS_RETURN_TYPE_IS_JS_TYPE && !doc.components.schemas[returnType]) {
                const definitions = JSON.stringify(generator.getSchemaForSymbol(returnType));
                definitionParse(doc, generator, definitions);
                doc.components.schemas[returnType] = JSON.parse(definitions.replace(/#\/definitions\//g, '#/components/schemas/'));
            }
            const operation = {
                /**
                 * To add summary or description to every action,
                 * use @Summary and @Description
                 */
                summary: Reflect.getMetadata('design:summary', target, action.method),
                description: Reflect.getMetadata('design:description', target, action.method),
                tags: [controller.route.substr(1)],
                parameters: [],
                // TODO: support other content type
                responses: {
                    200: {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: IS_RETURN_TYPE_IS_JS_TYPE
                                    ? {
                                        type: returnType
                                    }
                                    : IS_RETURN_TYPE_IS_ARRAY
                                        ? {
                                            type: 'array',
                                            items: {
                                                $ref: `#/components/schemas/${returnType}`
                                            }
                                        }
                                        : {
                                            $ref: `#/components/schemas/${returnType}`
                                        }
                            }
                        }
                    }
                }
            };
            // TODO: supporte other param type such as file
            params.forEach(param => {
                switch (param.type) {
                    case 'param':
                        const paramType = paramTypes[paramNames.findIndex(name => name === param.name)].name;
                        operation.parameters.push({
                            in: 'path',
                            name: param.name,
                            required: param.required,
                            schema: {
                                type: paramType.toLowerCase()
                            }
                        });
                        return;
                    case 'queries':
                        const queryType = paramTypes[paramNames.findIndex(name => name === 'query')].name;
                        const definitions = generator.getSchemaForSymbol(queryType);
                        Object.entries(definitions.properties).forEach(([key, val]) => {
                            operation.parameters.push({
                                in: 'query',
                                name: key,
                                schema: {
                                    type: val.type,
                                    default: val.default
                                }
                            });
                        });
                        return;
                    case 'body':
                        const bodyType = paramTypes[paramNames.findIndex(name => name === (param.name || param.type))].name;
                        if (bodyType !== undefined && doc.components.schemas[bodyType] === undefined) {
                            const definition = JSON.stringify(generator.getSchemaForSymbol(bodyType));
                            definitionParse(doc, generator, definition);
                            doc.components.schemas[bodyType] = JSON.parse(definition.replace(/#\/definitions\//g, '#/components/schemas/'));
                            Reflect.deleteProperty(doc.components.schemas[bodyType], '$schema');
                        }
                        operation.requestBody = {
                            required: true,
                            content: {
                                'applicaton/json': {
                                    schema: {
                                        $ref: `#/components/schemas/${bodyType}`
                                    }
                                }
                            }
                        };
                        return;
                    default:
                        return;
                }
            });
            // delete unnecessary part of json-schema generated by typescript-json-schema
            Object.entries(doc.components.schemas).forEach(([key, value]) => {
                Reflect.deleteProperty(value, 'definitions');
                Reflect.deleteProperty(value, '$schema');
            });
            if (doc.paths[route] === undefined) {
                doc.paths[route] = {
                    [action.type]: operation
                };
            }
            else {
                Object.assign(doc.paths[route], {
                    [action.type]: operation
                });
            }
        });
        // output 
        yield util_1.promisify(fs.writeFile)(docConfig.outputFile, JSON.stringify(doc, null, 4), { encoding: 'utf-8' });
    });
}
exports.default = docGenerator;
//# sourceMappingURL=index.js.map