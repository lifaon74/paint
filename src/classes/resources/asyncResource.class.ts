
export abstract class AsyncResource {

  abstract resource: (HTMLImageElement|HTMLAudioElement);

  load(source: string): Promise<AsyncResource> {
    return new Promise((resolve: any, reject: any) => {
      let onload = () => {
        this.removeEventListener('load', onload);
        resolve(this);
      };

      let onerror = () => {
        this.removeEventListener('error', onerror);
        reject(new Error('Invalid image  path ' + source));
      };

      this.addEventListener('load', onload);
      this.addEventListener('error', onerror);
      this.src = source;
    });
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