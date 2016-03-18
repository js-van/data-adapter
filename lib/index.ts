export interface NameCallback {
  (obj: Object, name: string): string;
}

export interface ValueCallback {
  (obj: Object, field: string): any;
}

export interface AdaptConfig {
  name?: string | NameCallback;
  value?: any | ValueCallback
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
  const adapter = metadata.get(objType);
  if (!adapter) {
    return JSON.parse(JSON.stringify(obj));
  }
  return adapter.denormalize(obj);
};

export const normalize = (obj: Object, objType: Function) => {
};

const metadata = new Map<Function, TypeAdapter>();
class SerializableField {
  constructor(private config: AdaptConfig, private objType: Function, private field: string) {}
  denormalize(obj: Object, target: Object): void {
    if (this.config.hide) return;
    const targetField = this.getTargetFieldName(obj, target);
    const propValueCtr = obj[this.field].constructor;
    let fieldValue;
    if (!this.config.type && !metadata.get(propValueCtr)) {
      fieldValue = this.processPrimitiveField(obj, target);
    } else {
      fieldValue = this.processComplexField(propValueCtr, obj[this.field]);
    }
    target[targetField] = fieldValue;
  }
  private getTargetFieldName(obj: Object, target: Object) {
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
  private processPrimitiveField(obj: Object, target: Object): Object {
    let objField = this.field;
    const config = this.config;
    if (typeof config.value === 'function') {
      return (<ValueCallback>config.value)(obj, objField);
    } else if (config.value) {
      return config.value;
    } else {
      return obj[objField];
    }
  }
  private processComplexField(ctr: Function, value: Object): Object {
    return metadata.get(ctr).denormalize(value);
  }
}

class TypeAdapter {
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
}
