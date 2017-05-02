import { EventObject } from '../events.class';

export abstract class AsyncResource extends EventObject {

  abstract resource: (HTMLImageElement | HTMLAudioElement);
  abstract async load(sources: string | ArrayLike<string>): Promise<this>;

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