import { DeferredPromise } from '../DeferredPromise';
import { ImageResource } from '../../bricks/image/Image';
import { PromisePool } from '../PromisePool';

// export type WorkerCallback = ((source: ImageData, destination: ImageData) => any);
export type WorkerApplyReturn = [ImageData, ImageData];
export type WorkerDeferredPromise = DeferredPromise<WorkerApplyReturn>;


// export interface WorkerOptions {
//   type?: string;
//   credentials?: string;
//   name?: string;
// }

export class CompositingWorker {

  static workers: CompositingWorker[] = [];
  static workersIndex: number = 0;

  static get optimalThreadCount(): number {
    return (navigator.hardwareConcurrency || 4);
  }

  static init(threads: number = this.optimalThreadCount, workerPath?: string): void {
    for(let i = 0; i < threads; i++) {
      this.workers.push(new CompositingWorker(workerPath));
    }
  }

  static apply(
    filterFunctionName: string,
    source: ImageData, destination?: ImageData,
    sx?: number, sy?: number, sw?: number, sh?: number,
    dx?: number, dy?: number
  ): Promise<WorkerApplyReturn> {
    this.workersIndex = (this.workersIndex + 1) % this.workers.length;
    return this.workers[this.workersIndex].apply(filterFunctionName, source, destination, sx, sy, sw, sh, dx, dy);
  }

  static terminate(): void {
    for(let i = 0; i < this.workers.length; i++) {
      this.workers[i].terminate();
    }
  }

  public worker: Worker;

  protected _messageID: number = 0;
  protected _workerPromises: Map<number, WorkerDeferredPromise>;

  constructor(workerPath: string = 'compositing.worker.js') {
    this.worker = new Worker(workerPath);
    this.worker.addEventListener('message', (event: MessageEvent) => {
      const promise: WorkerDeferredPromise = this._workerPromises.get(event.data[0]);
      if(promise) {
        promise.resolve([event.data[2], event.data[3]]);
        this._workerPromises.delete(event.data[0]);
      }
    }, false);

    this._workerPromises = new Map<number, WorkerDeferredPromise>();
  }

  apply(
    filterFunctionName: string,
    source: ImageData, destination?: ImageData,
    sx?: number, sy?: number, sw?: number, sh?: number,
    dx?: number, dy?: number
  ): Promise<WorkerApplyReturn> {
    const promise: WorkerDeferredPromise = new DeferredPromise<WorkerApplyReturn>();
    this._workerPromises.set(this._messageID, promise);

    this.worker.postMessage(
      [this._messageID, filterFunctionName, source, destination, sx, sy, sw, sh, dx, dy],
      [source.data.buffer, destination.data.buffer]
    );

    this._messageID++;

    return promise.promise;
  }

  terminate(): void {
    this.worker.terminate();
    for(const promise of this._workerPromises.values()) {
      promise.reject(new Error('Worker terminated'));
    }
  }
}


async function test() {
  const threads: number = CompositingWorker.optimalThreadCount;
  CompositingWorker.init(threads, '/classes/compositing.worker.js');
  // const images: ImageResource[] = [];

  let source: ImageResource       = await ImageResource.fromURL('./source.png');
  let destination: ImageResource  = await ImageResource.fromURL('./destination.png');

  // await source.toCanvas().then((canvas) => document.body.appendChild(canvas));
  // await destination.toCanvas().then((canvas) => document.body.appendChild(canvas));

  const promisePool: PromisePool = new PromisePool(threads);

  let _source: ImageData;
  let _destination: ImageData;

  promisePool.addEventListener('complete', async () => {
    console.timeEnd('timer');
    await ImageResource.fromImageDataSync(_destination).toCanvas().then((canvas) => document.body.appendChild(canvas));
  });

  console.time('timer');
  let i = 0;
  for(; i < 1e4; i++) {
    // [_source, _destination] = await CompositingWorker.apply('sourceOver', await source.toImageData(), await destination.toImageData());
    // [_source, _destination] = await CompositingWorker.apply('sourceOver', source, destination);
    // source = ImageResource.fromImageDataSync(_source);
    // destination = ImageResource.fromImageDataSync(_destination);

    promisePool.push(() => {
      return CompositingWorker.apply('source-over', source.clone(), destination.clone())
        .then(([source, destination]) => {
          _source = source;
          _destination = destination;
        });
    });
  }

}

// window.addEventListener('load', () => {
//   test().catch(_ => console.error(_));
// });

