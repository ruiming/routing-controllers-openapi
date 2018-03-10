// tslint:disable:typedef
import 'reflect-metadata'

export function Description(desc: string) {
  return (target: Object, propertyName: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('design:description', desc, target, propertyName)
  }
}

export function Summary(summary: string) {
  return (target: Object, propertyName: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('design:summary', summary, target, propertyName)
  }
}

export function ResType(type: Function | [Function]) {
  return (target: Object, propertyName: string, descriptor: PropertyDescriptor) => {
    const typename = Array.isArray(type) ? `${type[0].name}[]` : type.name
    Reflect.defineMetadata('design:returntype2', typename, target, propertyName)
  }
}
