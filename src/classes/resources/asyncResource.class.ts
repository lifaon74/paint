
export abstract class AsyncResource {

  abstract resource: (HTMLImageElement|HTMLAudioElement);

  load(source: string, onLoadEventName: string = 'load'): Promise<AsyncResource> {
    return new Promise((resolve: any, reject: any) => {
      this.addEventListenerOnce(onLoadEventName, () => {
        resolve(this);
      });
      this.addEventListenerOnce('error', () => {
        reject(new Error('Invalid resource path ' + source));
      });
      this.src = source;
    });
  }

  addEventListenerOnce(type: string, listener: any, useCapture?: boolean): void {
    let cb = (event: Event) => {
      this.removeEventListener(type, cb, useCapture);
      listener(event);
    };
    this.addEventListener(type, cb, useCapture);
  }

  addEventListener(type: string, listener: any, useCapture?: boolean): void {
    (<EventTarget>this.resource).addEventListener(type, listener, useCapture);
  }

  dispatchEvent(event: Event): boolean {
    return (<EventTarget>this.resource).dispatchEvent(event);
  }

  removeEventListener(type: string, listener?: any, useCapture?: boolean): void {
    (<EventTarget>this.resource).removeEventListener(type, listener, useCapture);
  }

  get src(): string {
    return this.resource.src;
  }

  set src(source: string) {
    this.resource.src = source;
  }

}