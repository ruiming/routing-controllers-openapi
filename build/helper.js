"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:typedef
require("reflect-metadata");
function Description(desc) {
    return (target, propertyName, descriptor) => {
        Reflect.defineMetadata('design:description', desc, target, propertyName);
    };
}
exports.Description = Description;
function Summary(summary) {
    return (target, propertyName, descriptor) => {
        Reflect.defineMetadata('design:summary', summary, target, propertyName);
    };
}
exports.Summary = Summary;
function ResType(type) {
    return (target, propertyName, descriptor) => {
        const typename = Array.isArray(type) ? `${type[0].name}[]` : type.name;
        Reflect.defineMetadata('design:returntype2', typename, target, propertyName);
    };
}
exports.ResType = ResType;
//# sourceMappingURL=helper.js.map