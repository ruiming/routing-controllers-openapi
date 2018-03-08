import 'reflect-metadata'
import { MetadataArgsStorage } from 'routing-controllers'
import * as fs from 'fs'
import * as path from 'path'
import * as TJS from 'typescript-json-schema'
import * as glob from 'glob'

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm
const ARGUMENT_NAMES = /([^\s,]+)/g
function getParamNames(func: Function): string[] {
  const fnStr = func.toString().replace(STRIP_COMMENTS, '')
  let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES)
  if (result === null) {
    result = []
  }
  return result
}

export * from './helper'

export class DefaultSuccessResponse {
  success: true
}

interface IAny {
  [key: string]: any
}

export interface DocConfig {
  title: string;
  description: string;
  version: string;
  server: string;
  defaultSuccessResponse?: Function
}

export default function docGenerator(storage: MetadataArgsStorage, config: DocConfig) {
  const program = TJS.getProgramFromFiles(glob.sync('src/**/*.ts'), {
    ...JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'tsconfig.json'), { encoding: 'utf8' }))
      .compilerOptions,
    strictNullChecks: false
  }, process.cwd())

  const generator = TJS.buildGenerator(program, { required: true })!

  const doc: IAny = {
    openapi: '3.0.0',
    info: {
      title: config.title,
      description: config.description,
      version: config.version
    },
    servers: [
      {
        url: `${config.server}`,
        description: '测试'
      }
    ],
    paths: {} as any,
    tags: [] as any[],
    components: {
      schemas: {} as any
    }
  }
  
  const swaggerParametersMap: { [index: string]: string } = {
    param: 'path',
    queries: 'query',
    body: 'body'
  }
  
  doc.tags = storage.controllers.map(c => ({
    name: c.route.substr(1)
  }))
  
  storage.actions.forEach(action => {
    const target = Reflect.construct(action.target, [])
    const controller = storage.controllers.find(c => c.target === action.target)!
    if (action.route instanceof RegExp) {
      throw new Error('TODO RegExp 文档未支持')
    }
    const route = controller.route + action.route.replace(/:(\w+)/g, '{$1}')
    const params = storage.filterParamsWithTargetAndMethod(action.target, action.method)
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, action.method)
    const paramNames = getParamNames(target[action.method])
    let returnType = Reflect.getMetadata('design:returntype2', target, action.method)
    let IS_RETURN_TYPE_IS_ARRAY = false
    const IS_RETURN_TYPE_IS_JS_TYPE = ['number', 'string', 'boolean'].includes(returnType && returnType.toLowerCase())
  
    if (!returnType) {
      returnType = DefaultSuccessResponse.name
    }
  
    if (!IS_RETURN_TYPE_IS_JS_TYPE && returnType && /\[\]$/.test(returnType)) {
      IS_RETURN_TYPE_IS_ARRAY = true
      returnType = returnType.replace('[]', '')
    }
  
    if (!IS_RETURN_TYPE_IS_JS_TYPE && !doc.components.schemas[returnType]) {
      const definitions = JSON.stringify(generator.getSchemaForSymbol(returnType))
      const regex = /#\/definitions\/(\w+)/g
      for (;;) {
        const definitionMatchGroup = regex.exec(definitions)
        if (definitionMatchGroup === null) {
          break
        } else {
          if (!doc.components.schemas[definitionMatchGroup[1]]) {
            doc.components.schemas[definitionMatchGroup[1]] = JSON.parse(
              JSON.stringify(generator.getSchemaForSymbol(definitionMatchGroup[1])).replace(
                /#\/definitions\//g,
                '#/components/schemas/'
              )
            )
          }
        }
      }
      doc.components.schemas[returnType] = JSON.parse(definitions.replace(/#\/definitions\//g, '#/components/schemas/'))
    }
  
    const operation: IAny = {
      summary: Reflect.getMetadata('summary', target, action.method),
      description: Reflect.getMetadata('design:description', target, action.method),
      tags: [controller.route.substr(1)],
      parameters: [] as any[],
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
    }
  
    params.forEach(param => {
      switch (param.type) {
        case 'param':
          const paramType: string = paramTypes[paramNames.findIndex(name => name === param.name)].name
          operation.parameters.push({
            in: 'path',
            name: param.name!,
            required: param.required,
            schema: {
              type: paramType.toLowerCase()
            }
          })
          return
        case 'queries':
          const queryType = paramTypes[paramNames.findIndex(name => name === swaggerParametersMap[param.type])].name
          const definitions = generator.getSchemaForSymbol(queryType)
          // tslint:disable-next-line:no-any
          Object.entries(definitions.properties!).forEach(([key, val]: [string, any]) => {
            operation.parameters.push({
              in: 'query',
              name: key,
              schema: {
                type: val.type,
                default: val.default
              }
            })
          })
          return
        case 'body':
          const bodyType = paramTypes[paramNames.findIndex(name => name === (param.name || param.type))].name
          if (bodyType !== undefined && doc.components.schemas[bodyType] === undefined) {
            const definition = generator.getSchemaForSymbol(bodyType)
            Reflect.deleteProperty(definition, '$schema')
            doc.components.schemas[bodyType] = definition as {}
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
          }
          return
        default:
          return
      }
    })
  
    Object.entries(doc.components.schemas).forEach(([key, value]) => {
      Reflect.deleteProperty(value, 'definitions')
      Reflect.deleteProperty(value, '$schema')
    })
  
    if (doc.paths[route] === undefined) {
      doc.paths[route] = {
        [action.type]: operation
      }
    } else {
      Object.assign(doc.paths[route], {
        [action.type]: operation
      })
    }
  })
  
  fs.writeFileSync('doc.json', JSON.stringify(doc, null, 4), { encoding: 'utf-8' })
}








