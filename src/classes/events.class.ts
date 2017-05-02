export type EventListenerCallback = (event: Event) => any;

export interface EventListenerOptions {
  once?: boolean;
  passive?: boolean;
  capture?: boolean;
}


export class EventListener {

  public eventNames: any[] = [];
  public listeners: (() => void)[] = [];

  static createListener(target: any, type: string, callback: EventListenerCallback, options?: EventListenerOptions): (() => void) {
    target.addEventListener(type, callback, options);
    return () => {
      target.removeEventListener(type, callback, options);
    };
  }

  static getTrustedEvent(callback: EventListenerCallback): EventListener {
    let listener = new EventListener(window, ['mousedown', 'mouseup', 'keydown', 'keyup'], (event: Event) => {
      if(typeof event.isTrusted === 'boolean') {
        if(!event.isTrusted) {
          console.warn('not trusted', event);
        }
      }
      listener.mute();
      callback.call(listener, event);
    });

    return listener;
  }

  constructor(
    public target: EventTarget | EventObject,
    eventNames: (string | string[]),
    public callback: EventListenerCallback,
    public options?: EventListenerOptions
  ) {
    if(typeof eventNames === 'string') {
      this.eventNames = [eventNames];
    } else if(eventNames instanceof Array) {
      this.eventNames = eventNames;
    } else {
      throw new Error('Invalid eventNames');
    }

    this.listen();
  }


  listen(): this {
    this.mute();
    this.eventNames.forEach((eventName: string) => {
      this.listeners.push(EventListener.createListener(this.target, eventName, this.callback, this.options));
    });
    return this;
  }

  mute(): this {
    this.listeners.forEach(listener => listener());
    return this;
  }
}


export class EventObject {
  protected _eventTarget: EventTarget;

  static createEvent(eventName: string, data: any): CustomEvent {
    return new CustomEvent(eventName, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
  }

  constructor(target?: EventTarget) {
    this._eventTarget = target || document.createDocumentFragment();
  }

  addEventListener(type: string, callback: EventListenerCallback, options?: EventListenerOptions): void {
    this._eventTarget.addEventListener(type, callback, <any>options);
  }

  dispatchEvent(event: Event): boolean {
    return this._eventTarget.dispatchEvent(event);
  };

  removeEventListener(type: string, callback: EventListenerCallback, options?: EventListenerOptions): void {
    this._eventTarget.removeEventListener(type, callback, <any>options);
  }

  createListener(eventName: string, callback: EventListenerCallback, options?: EventListenerOptions): EventListener {
    return new EventListener(this, eventName, callback, options);
  }
}

