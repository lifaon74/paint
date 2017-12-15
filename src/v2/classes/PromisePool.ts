import { Emitter } from './Emitter';

export type PromiseFactory<T> = () => Promise<T>;

export class PromisePool<T = any> extends Emitter {

  public parallels: number;
  public promiseFactories: PromiseFactory<T>[] = [];
  protected _pendingPromises: Promise<T>[] = [];

  static async all<T>(promiseFactories: PromiseFactory<T>[]): Promise<T[]> {
    return new Promise<T[]>((resolve: any, reject: any) => {
      const pool: PromisePool<T> = new PromisePool<T>();
      const data: T[] = [];
      pool.addEventListener('resolve', (event: CustomEvent) => {
        data[promiseFactories.indexOf(event.detail.factory)] = event.detail.data;
      });

      pool.addEventListener('reject', (event: CustomEvent) => {
        pool.clear();
        reject(event.detail.error);
      });

      pool.addEventListener('complete', () => {
        resolve(data);
      });

      pool.push(promiseFactories);
    });
  }


  constructor(parallels: number = 4) {
    super();
    this.parallels = parallels;
    this.update();
  }

  isComplete(): boolean {
    return ((this.promiseFactories.length === 0) && (this._pendingPromises.length === 0));
  }

  push(promiseFactories: PromiseFactory<T> | PromiseFactory<T>[]) {
    if(!Array.isArray(promiseFactories)) promiseFactories = [promiseFactories];
    Array.prototype.push.apply(this.promiseFactories, promiseFactories);
    this.update();
  }

  clear() {
    this._pendingPromises = [];
    this.promiseFactories = [];
  }

  private update() {

    if(this.isComplete()) {
      this.dispatchEvent(new CustomEvent('complete'));
    }

    let promiseFactory: PromiseFactory<T>;
    let promise: Promise<T>;
    while(Math.min(this.parallels - this._pendingPromises.length, this.promiseFactories.length) > 0) {
      // console.log('push promise');
      promiseFactory  = this.promiseFactories.shift();
      promise         = promiseFactory();

      this.dispatchEvent(new CustomEvent('call', {
        detail: {
          factory: promiseFactory,
          promise: promise
        }
      }));

      this._pendingPromises.push(promise);
      promise.then((data: T) => {
        this._pendingPromises.splice(this._pendingPromises.indexOf(promise), 1);
        this.dispatchEvent(new CustomEvent('resolve', {
          detail: {
            factory: promiseFactory,
            promise: promise,
            data: data
          }
        }));
        this.update();
      },(error: any) => {
        this._pendingPromises.splice(this._pendingPromises.indexOf(promise), 1);
        this.dispatchEvent(new CustomEvent('reject', {
          detail: {
            factory: promiseFactory,
            promise: promise,
            error: error
          }
        }));
        this.update();
      });
    }
  }

}


// const pool = new PromisePool();
// const promises: PromiseFactory[] =[];
// let j = 0;
// for(let i = 0; i < 100; i++) {
//   promises.push(() => {
//     return new Promise((resolve: any, reject: any) => {
//       setTimeout(() => {
//         j++
//         (Math.random() > 0.1) ? resolve() : reject(new Error('ok'));
//       }, 100 * Math.random() + 50);
//     })
//   });
// }
//
// let resolved = 0, rejected = 0;
// pool.addEventListener('resolve', () => {
//   resolved++;
//   console.log('resolve');
// });
//
// pool.addEventListener('reject', () => {
//   rejected++;
//   console.log('reject');
// });
//
// pool.addEventListener('complete', () => {
//   console.log('complete', j, rejected, resolved);
// });
// pool.push(promises);


