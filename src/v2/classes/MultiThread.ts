export type Transferable = ArrayBuffer | SharedArrayBuffer | MessagePort;

interface PendingPromise<T> {
  resolve?: (value?: T) => any;
  reject?: (reason?: any) => any;
  promise?: Promise<T>;
}

export class Program {

  static createWorker(script: string): Worker {
    console.log(script);
    return new Worker('data:text/javascript;base64,' + btoa(script));
  }


  public worker: Worker;

  private _uuid: number;
  private _pendingPromises: Map<number, PendingPromise<any>>;

  constructor(callback: Function) {
    if(!callback.name) throw new Error('Callback must have a name');

    const script: string = `
      self.addEventListener('message', function(event) {
        var data = event.data;
        
        var context = {
          transfer: []
        };
        
        function resolve(returnedData) {
          self.postMessage({
            uuid: data.uuid,
            data: returnedData
          }, context.transfer);
        }
        
        function reject(reason) {
          self.postMessage({
            uuid: data.uuid,
            error: (reason instanceof Error) ? reason.message : reason
          });
        }
          
        try {
          Promise.resolve(${callback.name}.apply(context, data.data))
          .then(resolve, reject)
        } catch(error) {
          reject(error);
        }
      }, false);
      
    ` + callback.toString();

    this._uuid = -1;
    this._pendingPromises = new Map<number, PendingPromise<any>>();
    this.worker = Program.createWorker(script);

    this.worker.addEventListener('message', (event: MessageEvent) => {
      const data: any = event.data;
      const pendingPromise: PendingPromise<any> = this._pendingPromises.get(data.uuid);
      if(pendingPromise) {
        if(data.error) {
          pendingPromise.reject(data.error);
        } else {
          pendingPromise.resolve(data.data);
        }
      } else {
        throw new Error('Received unknown result uuid');
      }
    }, false);
  }

  execute(data: any, transfer?: Transferable[]): Promise<any> {
    const pendingPromise: PendingPromise<any> = {};
    pendingPromise.promise = new Promise((resolve: any, reject: any) => {
      pendingPromise.resolve = resolve;
      pendingPromise.reject = reject;

      this._uuid++;
      this._pendingPromises.set(this._uuid, pendingPromise);

      this.worker.postMessage({
        uuid: this._uuid,
        data: data
      }, transfer);
    });

    return pendingPromise.promise;
  }

  terminate(): void {
    this.worker.terminate();
  }
}

export class MultiThread {

  static createProgram(callback: () => void) {
    const worker = this.createWorker(callback.toString());
    console.log(worker);
  }

  static createWorker(script: string): Worker {
    console.log(script);
    return new Worker('data:text/javascript;base64,' + btoa(script));
  }
}

function webWorkerSourceOver(source: ImageData,
              sx: number = 0, sy: number = 0, sw: number = source.width, sh: number = source.height,
              dx: number = 0, dy: number = 0): ImageData {

  function sourceOver(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    let alpha_source: number      = source.data[sourceIndex + 3] / 255;
    let alpha_destination: number = (destination.data[destinationIndex + 3] / 255) * (1 - alpha_source);
    let alpha: number             = alpha_source + alpha_destination;
    alpha_source /= alpha;
    alpha_destination /= alpha;
    destination.data[destinationIndex    ] = source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination;
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination;
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  const destination: ImageData = source;

  const sx_start: number  = Math.max(0, -dx, Math.min(source.width, sx)); // sx_start in [max(0, -dx), width]
  const sx_end: number    = Math.max(sx, Math.min(source.width, sx + Math.min(sw, destination.width - dx))); // sx_end in [sx, min(source_width, destination_width - dx)]

  const sy_start: number  = Math.max(0, -dy, Math.min(source.height, sy));
  const sy_end: number    = Math.max(sy, Math.min(source.height, sy + Math.min(sh, destination.height - dy)));

  const x_offset: number  = dx - sx;
  const y_offset: number  = dy - sy;

  for(let y = sy_start; y < sy_end; y++) {
    for(let x = sx_start; x < sx_end; x++) {
      sourceOver(source, (x + y * source.width) * 4, destination, ((x + x_offset) + ((y + y_offset) * destination.width)) * 4);
    }
  }

  this.transfer.push(destination.data.buffer);

  return destination;
}

const programs = new Array(16).fill(null).map(() => new Program(webWorkerSourceOver));

const images = programs.map(() => new ImageData(1e4, 1e3));

function webWorkerDraw() {
  console.time('execute');

  Promise.all(
    programs.map((program: Program, index: number) => {
      return program.execute([images[index]], [images[index].data.buffer]);
    })
  ).then((results: ImageData[]) => {
    console.timeEnd('execute');
    console.log('finished', results);
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = results[0].width;
    canvas.height = results[0].height;
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    ctx.putImageData(results[0], 0, 0);
    // document.body.appendChild(canvas);
  })
    .catch((error: string) => {
      console.error(error);
    });
}



function defaultDrawCanvas() {
  let j = 0;
  console.time('execute');
  for(let i = 0; i < images.length; i++) {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = images[i].width;
    canvas.height = images[i].height;
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    ctx.putImageData(images[i], 0, 0);

    const newImage = new Image();
    newImage.src = canvas.toDataURL();

    ctx.drawImage(newImage, 0, 0);

    j += ctx.getImageData(0, 0, canvas.width, canvas.height).data.length;
    // document.body.appendChild(canvas);
  }

  console.timeEnd('execute');
  console.log(j);
}


window.addEventListener('load', () => {
  // webWorkerDraw();
  defaultDrawCanvas();
});
