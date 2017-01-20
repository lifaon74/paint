import { EventObject } from '../events.class';

export abstract class AsyncResource extends EventObject {

  abstract resource: (HTMLImageElement | HTMLAudioElement);

  load(source: string, onLoadEventName: string = 'load'): Promise<AsyncResource> {
    return new Promise<AsyncResource>((resolve: any, reject: any) => {
      this.addEventListener(onLoadEventName, () => {
        resolve(this);
      }, { once: true });
      this.addEventListener('error', () => {
        reject(new Error('Invalid resource path ' + source));
      }, { once: true });
      this.src = source;
    });
  }

  get _eventTarget(): Element {
    return this.resource;
  }

  set _eventTarget(value: Element) {
    this.resource = <(HTMLImageElement | HTMLAudioElement)>value;
  }

  get src(): string {
    return this.resource.src;
  }

  set src(source: string) {
    this.resource.src = source;
  }
}