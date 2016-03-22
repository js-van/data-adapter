export interface NameCallback {
  (obj: Object, name: string): string;
}

export interface ValueCallback {
  (obj: Object, propName: string): any;
}

const METADATA_KEY: string = '$$$data-adapter$$$';

export interface AdaptConfig {
  name?: string | NameCallback;
  denormalize?: any | ValueCallback;
  normalize?: any | ValueCallback;
  type?: Function;
  hide?: boolean;
}

export const Adapt = (config: AdaptConfig) => {
  return (objType, prop) => {
    const currentMetadata = Reflect.getMetadata(METADATA_KEY, objType.constructor) || new TypeAdapter();
    const propertyAdapter = new PropertyAdapter(config, objType);
    currentMetadata.propertyAdapters.set(prop, propertyAdapter);
    Reflect.defineMetadata(METADATA_KEY, currentMetadata, objType.constructor);
  };
};

export const AdaptClass = (config: AdaptConfig) => {
  return (objType) => {
    const currentMetadata = Reflect.getMetadata(METADATA_KEY, objType) || new TypeAdapter();
    currentMetadata.genericPropertyAdapter = new PropertyAdapter(config, objType);
    Reflect.defineMetadata(METADATA_KEY, currentMetadata, objType);
  };
};

export const denormalize = (obj: Object, objType?: Function) => {
  objType = objType || obj.constructor;
  return transformHelper(objType).denormalize(obj);
};

export const normalize = (obj: Object, objType: Function) => {
  return transformHelper(objType).normalize(obj, objType);
};

const basicTransformer = obj => JSON.parse(JSON.stringify(obj));
const transformHelper = (objType): ITypeAdapter => {
  const adapter = Reflect.getMetadata(METADATA_KEY, objType);
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
  constructor(public config: AdaptConfig, private objType: Function) {}
  private getTargetPropName(original: Object, result: Object, propName: string) {
    let targetPropName = propName;
    let originalPropName = propName;
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
  denormalize(original, current, propName) {
    if (this.config.hide) return;
    const oldPropName = propName;
    const oldValue = original[oldPropName];
    let result = null;
    if (this.config.type) {
      result = transformHelper(this.config.type).denormalize(oldValue);
    } else {
      result = this.processPrimitiveProperty(original, oldPropName, this.config.denormalize);
    }
    current[this.getTargetPropName(original, current, propName)] = result;
  }
  normalize(original, current, propName) {
    const oldPropName = this.getTargetPropName(original, current, propName);
    const oldValue = original[oldPropName];
    let result = null;
    if (this.config.type) {
      result = transformHelper(this.config.type).normalize(oldValue, this.config.type);
    } else {
      result = this.processPrimitiveProperty(original, oldPropName, this.config.normalize);
    }
    current[propName] = result;
  }
}

interface ITypeAdapter {
  denormalize(obj): Object;
  normalize(obj, objType): Object;
}

class TypeAdapter implements ITypeAdapter {
  propertyAdapters: Map<string, PropertyAdapter> = new Map<string, PropertyAdapter>();
  genericPropertyAdapter: PropertyAdapter;
  denormalize(obj) {
    let result;
    if (obj instanceof Array) {
      result = obj.map(obj => this.denormalize(obj));
    } else {
      result = {};
      Object.keys(obj).forEach(key => {
        const propertyAdapter = this.propertyAdapters.get(key) || this.genericPropertyAdapter;
        if (propertyAdapter) {
          propertyAdapter.denormalize(obj, result, key);
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
      if (this.genericPropertyAdapter) {
        Object.keys(result).forEach(key => this.genericPropertyAdapter.normalize(obj, result, key));
      }
      this.propertyAdapters.forEach((propertyAdapter, key) => {
        propertyAdapter.normalize(obj, result, key);
      });
    }
    return result;
  }
}

