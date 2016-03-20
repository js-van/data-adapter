export interface NameCallback {
  (obj: Object, name: string): string;
}

export interface ValueCallback {
  (obj: Object, field: string): any;
}

export interface AdaptConfig {
  name?: string | NameCallback;
  denormalize?: any | ValueCallback;
  normalize?: any | ValueCallback;
  type?: Function;
  hide?: boolean;
}

export const Adapt = (config: AdaptConfig) => {
  return (objType, prop) => {
    const currentMetadata = metadata.get(objType.constructor) || new TypeAdapter();
    const fieldAdapter = new SerializableField(config, objType, prop);
    currentMetadata.fields.set(prop, fieldAdapter);
    metadata.set(objType.constructor, currentMetadata);
  };
};

export const denormalize = (obj: Object, objType?: Function) => {
  objType = objType || obj.constructor;
  return transformHelper(objType).denormalize(obj);
};

export const normalize = (obj: Object, objType: Function) => {
  return transformHelper(objType).normalize(obj, objType);
};

const metadata = new Map<Function, TypeAdapter>();

const basicTransformer = obj => JSON.parse(JSON.stringify(obj));
const transformHelper = (objType): ITypeAdapter => {
  const adapter = metadata.get(objType);
  if (adapter) {
    return adapter;
  } else {
    return {
      normalize: basicTransformer,
      denormalize: basicTransformer
    };
  }
};

class SerializableField {
  constructor(public config: AdaptConfig, private objType: Function, private field: string) {}
  denormalize(obj: Object, target: Object): void {
    if (this.config.hide) return;
    const targetField = this.getTargetFieldName(obj, target);
    const propValueCtr = this.config.type || obj[this.field].constructor;
    let fieldValue;
    if (!this.config.type && !metadata.get(propValueCtr)) {
      fieldValue = this.processPrimitiveField(obj, this.field, this.config.denormalize);
    } else {
      if (obj[this.field] instanceof Array) {
        fieldValue = obj[this.field].map(v => transformHelper(propValueCtr).denormalize(v));
      } else {
        fieldValue = transformHelper(propValueCtr).denormalize(obj[this.field]);
      }
    }
    target[targetField] = fieldValue;
  }
  getTargetFieldName(obj: Object, target: Object) {
    let targetField = this.field;
    let objField = this.field;
    const config = this.config;
    if (typeof config.name === 'function') {
      targetField = (<NameCallback>config.name)(obj, objField);
    } else if (config.name) {
      targetField = <string>config.name;
    }
    return targetField;
  }
  processPrimitiveField(obj: Object, objField: string, transform: ValueCallback | any): Object {
    const config = this.config;
    if (typeof transform === 'function') {
      return (<ValueCallback>transform)(obj, objField);
    } else if (transform) {
      return transform;
    } else {
      return obj[objField];
    }
  }
  processGenericField(ref, objField, value) {
    if (this.config.type) {
      value = transformHelper(this.config.type).normalize(value, this.config.type);
    } else {
      value = this.processPrimitiveField(ref, objField, this.config.normalize);
    }
    return value;
  }
}

interface ITypeAdapter {
  denormalize(obj): Object;
  normalize(obj, objType): Object;
}

class TypeAdapter implements ITypeAdapter {
  fields: Map<string, SerializableField> = new Map<string, SerializableField>();
  denormalize(obj) {
    let result = {};
    for (let name in obj) {
      const fieldAdapter = this.fields.get(name);
      if (fieldAdapter) {
        fieldAdapter.denormalize(obj, result);
      } else {
        result[name] = obj[name];
      }
    }
    return result;
  }
  // Fields of obj are either:
  // - called the same name in the original
  // - called different name in the original, computed with fields
  normalize(obj, objType) {
    let ref = new objType();
    this.fields.forEach((field, idx) => {
      let mapped = field.getTargetFieldName(ref, obj);
      let normalize = field.config.normalize;
      let value = obj[mapped];
      if (value instanceof Array) {
        value = value.map(v => field.processGenericField(obj, mapped, v));
      } else {
        value = field.processGenericField(obj, mapped, value);
      }
      ref[idx] = value;
    });
    return ref;
  }
}
