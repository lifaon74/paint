import { EventObject } from 'dom-event-object';

export type PromiseFactory = () => Promise<any>;

export class PromisePool extends EventObject {

  public promiseFactories: PromiseFactory[] = [];
  protected promises: Promise<any>[] = [];

  static async all<T>(promiseFactories: PromiseFactory[]): Promise<any[]> {
    return new Promise<T[]>((resolve: any, reject: any) => {
      const pool = new PromisePool();
      const data: any[] = [];
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


  constructor(public parallels: number = 4) {
    super();

    this.update();
  }

  isComplete(): boolean {
    return ((this.promiseFactories.length === 0) && (this.promises.length === 0));
  }

  push(promiseFactories: PromiseFactory | PromiseFactory[]) {
    if(!(promiseFactories instanceof Array)) {
      promiseFactories = [promiseFactories as PromiseFactory];
    }

    Array.prototype.push.apply(this.promiseFactories, promiseFactories);
    this.update();
  }

  clear() {
    this.promises = [];
    this.promiseFactories = [];
  }

  private update() {

    if(this.isComplete()) {
      this.dispatchEvent(new CustomEvent('complete'));
    }

    let promiseFactory: PromiseFactory;
    let promise: Promise<any>;
    while(Math.min(this.parallels - this.promises.length, this.promiseFactories.length) > 0) {
      // console.log('push promise');
      promiseFactory  = this.promiseFactories.shift();
      promise         = promiseFactory();

      this.dispatchEvent(new CustomEvent('call', {
        detail: {
          factory: promiseFactory,
          promise: promise
        }
      }));

      this.promises.push(promise);
      promise.then((data: any) => {
        this.promises.splice(this.promises.indexOf(promise), 1);
        this.dispatchEvent(new CustomEvent('resolve', {
          detail: {
            factory: promiseFactory,
            promise: promise,
            data: data
          }
        }));
        this.update();
      }).catch((error: any) => {
        this.promises.splice(this.promises.indexOf(promise), 1);
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


