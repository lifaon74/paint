export class DeepMap<T> {
  public map: any;

  constructor() {
    this.map = new Map();
  }

  set(args: any[], value: T): this {
    let map: Map = this.map;
    let childMap: Map;
    let arg: any;

    for(let i = 0; i < args.length - 1; i++) {
      arg = args[i];
      childMap = map.get(arg);
      if(childMap === void 0) {
        childMap = new Map();
        map.set(arg, childMap);
      }
      map = childMap;
    }

    map.set(args[args.length - 1], value);
    return this;
  }

  get(args: any[]): T {
    let map: Map = this.map;
    let childMap: Map;
    let arg: any;

    for(let i = 0; i < args.length - 1; i++) {
      arg = args[i];
      childMap = map.get(arg);
      if(childMap === void 0) {
        return undefined;
      }
      map = childMap;
    }

    return map.get(args[args.length - 1]);
  }

  has(args: any[]): boolean {
    let map: Map = this.map;
    let childMap: Map;
    let arg: any;

    for(let i = 0; i < args.length - 1; i++) {
      arg = args[i];
      childMap = map.get(arg);
      if(childMap === void 0) {
        return false;
      }
      map = childMap;
    }

    return map.get(args[args.length - 1]) !== void 0;
  }

  delete(args: any[]): boolean {
    let map: Map = this.map;
    let childMap: Map;
    let arg: any;

    for(let i = 0; i < args.length - 1; i++) {
      arg = args[i];
      childMap = map.get(arg);
      if(childMap === void 0) {
        return false;
      }
      map = childMap;
    }

    return map.delete(args[args.length - 1]);
  }

  clear() {
    this.map.clear();
  }

}


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