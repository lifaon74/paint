
export class DeepMap<T> {
  public map: any;
  public value: T;

  constructor() {
    this.map = new Map<any, any>();
    this.value = void 0;
  }

  set(args: any[], value: T): this {
    if(args.length === 0) {
      this.value = value;
    } else {
      let map: Map<any, any> = this.map;
      let childMap: Map<any, any>;
      let arg: any;
      const length: number = args.length - 1;

      for(let i = 0; i < length; i++) {
        arg = args[i];
        childMap = map.get(arg);
        if(childMap === void 0) {
          childMap = new Map();
          map.set(arg, childMap);
        }
        map = childMap;
      }

      map.set(args[length], value);
    }
    return this;
  }

  get(args: any[]): T {
    if(args.length === 0) {
      return this.value;
    } else {
      const map: Map<any, any> = this.findDeepestMap(args);
      if(map === null) return void 0;
      return map.get(args[args.length - 1]);
    }
  }

  has(args: any[]): boolean {
    return (this.get(args) !== void 0);
  }

  delete(args: any[]): boolean {
    if(args.length === 0) {
      this.value = void 0;
      return true;
    } else {
      const map: Map<any, any> = this.findDeepestMap(args);
      if(map === null) return false;
      return map.delete(args[args.length - 1]);
    }
  }

  clear() {
    this.map.clear();
    this.value = void 0;
  }

  private findDeepestMap(args: any[]): Map<any, any>  {
    let map: Map<any, any> = this.map;
    let childMap: Map<any, any>;
    const length: number = args.length - 1;
    for(let i = 0; i < length; i++) {
      childMap = map.get(args[i]);
      if(childMap === void 0) return null;
      map = childMap;
    }
    return map;
  }

}

// TODO remove
(<any>window).cached = 0;

export const MemoizeFunction = (fnc: any, options: any = {}) => {
  const map: DeepMap<any> = new DeepMap<any>();

  options.args = options.args || [];
  options.destructure = options.destructure || false;

  return function() {
    let cachedArguments: any[] = Array.prototype.slice.call(options.destructure ? arguments[0] : <any>arguments, 0);
    if(options.args.length > 0) cachedArguments = cachedArguments.filter((value: boolean, index: number) => options.args[index]);
    Array.prototype.unshift.call(cachedArguments, this);
    let cachedResult = map.get(cachedArguments);

    if(cachedResult === void 0) {
      (<any>window).cached++; // TODO remove
      cachedResult = fnc.apply(this, arguments);
      map.set(cachedArguments, cachedResult);
    }
    return cachedResult;
  };
};



// decorator
export const Memoize = (options: any = {}) => {
  return (_class: any, property: string, descriptor: any) => {
    if(descriptor.value) {
      descriptor.value = MemoizeFunction(descriptor.value, options);
    } else if(descriptor.get) {
      descriptor.get = MemoizeFunction(descriptor.get, options);
    }
  };
};


export const PerfTestFunction = (fnc: any, options: any = {}) => {
  const t1 = performance.now();
  for(let i = 0; i < options.iterations; i++) {
    fnc.apply(fnc, arguments);
  }
  const t2 = performance.now();
  console.log('PerfTest : ' + options.name + ' (x' + options.iterations + ')=> ' + (t2 - t1) + 'ms');
};

// decorator
export const PerfTest = (options: any = {}) => {
  return (_class: any, property: string, descriptor: any) => {
    if(typeof options.name !== 'string') options.name = property;
    if(typeof options.iterations !== 'number') options.iterations = 10000;

    if(descriptor.value) {
      PerfTestFunction(descriptor.value, options);
    }

    if(descriptor.get) {
      let name = options.name;
      options.name = 'get ' + options.name;
      PerfTestFunction(descriptor.get, options);
      options.name = name;
    }

    if(descriptor.set) {
      let name = options.name;
      options.name = 'set ' + options.name;
      PerfTestFunction(descriptor.set, options);
      options.name = name;
    }
  };
};

// @PerfTest({iterations: 20})
// @Memoize()

// let map = new DeepMap();
// let j = 0;
// let t1 = Date.now();
// for(let i = 0; i < 1000000; i++) {
//   map.set([i, i, i, i], Math.random());
// }
// let t2 = Date.now();
// console.log(j, t2 - t1); // ~3825ms
//
// t1 = Date.now();
// for(let i = 0; i < 1000000; i++) {
//   j += map.get([i, i, i, i]); // ~502ms
// }
// t2 = Date.now();
//
// console.log(j, t2 - t1);
// (<any>window).map = map;