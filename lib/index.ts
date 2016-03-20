export interface NameCallback {
  (obj: Object, name: string): string;
}

export interface ValueCallback {
  (obj: Object, propName: string): any;
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
    const propertyAdapter = new PropertyAdapter(config, objType, prop);
    currentMetadata.props.set(prop, propertyAdapter);
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

class PropertyAdapter {
  constructor(public config: AdaptConfig, private objType: Function, private propName: string) {}
  private getTargetPropName(original: Object, result: Object) {
    let targetPropName = this.propName;
    let originalPropName = this.propName;
    const config = this.config;
    if (typeof config.name === 'function') {
      targetPropName = (<NameCallback>config.name)(original, originalPropName);
    } else if (config.name) {
      targetPropName = <string>config.name;
    }
    return targetPropName;
  }
  private processPrimitiveProperty(obj: Object, propName: string, transform: ValueCallback | any): Object {
    const config = this.config;
    if (typeof transform === 'function') {
      return (<ValueCallback>transform)(obj, propName);
    } else if (transform) {
      return transform;
    } else {
      return obj[propName];
    }
  }
  denormalize(original, current) {
    if (this.config.hide) return;
    const oldPropName = this.propName;
    const oldValue = original[oldPropName];
    let result = null;
    if (this.config.type) {
      result = transformHelper(this.config.type).denormalize(oldValue);
    } else {
      result = this.processPrimitiveProperty(original, oldPropName, this.config.denormalize);
    }
    current[this.getTargetPropName(original, current)] = result;
  }
  normalize(original, current) {
    const oldPropName = this.getTargetPropName(original, current);
    const oldValue = original[oldPropName];
    let result = null;
    if (this.config.type) {
      result = transformHelper(this.config.type).normalize(oldValue, this.config.type);
    } else {
      result = this.processPrimitiveProperty(original, oldPropName, this.config.normalize);
    }
    current[this.propName] = result;
  }
}

interface ITypeAdapter {
  denormalize(obj): Object;
  normalize(obj, objType): Object;
}

class TypeAdapter implements ITypeAdapter {
  props: Map<string, PropertyAdapter> = new Map<string, PropertyAdapter>();
  denormalize(obj) {
    let result;
    if (obj instanceof Array) {
      result = obj.map(obj => this.denormalize(obj));
    } else {
      result = {};
      Object.keys(obj).forEach(key => {
        const propertyAdapter = this.props.get(key);
        if (propertyAdapter) {
          propertyAdapter.denormalize(obj, result);
        } else {
          result[key] = obj[key];
        }
      });
    }
    return result;
  }
  // Properties of obj are either:
  // - called the same name in the original
  // - called different name in the original, computed with properties
  normalize(obj, objType) {
    let result;
    if (obj instanceof Array) {
      result = obj.map(obj => this.normalize(obj, objType));
    } else {
      result = new objType();
      this.props.forEach(propertyAdapter => propertyAdapter.normalize(obj, result));
    }
    return result;
  }
}

