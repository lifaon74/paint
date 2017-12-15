export class Emitter {
  protected _element: DocumentFragment;

  constructor() {
    this._element = document.createDocumentFragment();
  }

  addEventListener(type: string, callback: EventListener, options: (AddEventListenerOptions | boolean) = {}): void {
    return this._element.addEventListener(type, callback, options)
  }

  removeEventListener(type: string, callback: EventListener, options: (EventListenerOptions | boolean) = {}): void {
    return this._element.removeEventListener(type, callback, options)
  }

  dispatchEvent(event: Event): boolean {
    return this._element.dispatchEvent(event);
  }

}