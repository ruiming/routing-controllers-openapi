import 'reflect-metadata';
export declare function Description(desc: string): (target: Object, propertyName: string, descriptor: PropertyDescriptor) => void;
export declare function Summary(summary: string): (target: Object, propertyName: string, descriptor: PropertyDescriptor) => void;
export declare function ResType(type: Function | [Function]): (target: Object, propertyName: string, descriptor: PropertyDescriptor) => void;
