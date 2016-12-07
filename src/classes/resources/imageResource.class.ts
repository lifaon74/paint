import { AsyncResource } from './asyncResource.class';

export class ImageResource extends AsyncResource {
  static load(source: string): Promise<ImageResource> {
    return new ImageResource().load(source);
  }

  resource: HTMLImageElement;

  private _naturalWidth: number;
  private _naturalHeight: number;

  constructor() {
    super();
    this._naturalWidth = 0;
    this._naturalHeight = 0;
    this.resource = new Image();
  }


  set src(source: string) {
    this._naturalWidth = 0;
    this._naturalHeight = 0;
    this.resource.src = source;
  }

  get naturalWidth(): number {
    if(!this._naturalWidth) {
      if(this.resource.naturalWidth) {
        this._naturalWidth = this.resource.naturalWidth;
      }
      else {
        document.body.appendChild(this.resource);
        this._naturalWidth = this.resource.offsetWidth;
        document.body.removeChild(this.resource);
      }
    }
    return this._naturalWidth;
  }

  get naturalHeight(): number {
    if(!this._naturalHeight) {
      if(this.resource.naturalHeight) {
        this._naturalHeight = this.resource.naturalHeight;
      }
      else {
        document.body.appendChild(this.resource);
        this._naturalHeight = this.resource.offsetHeight;
        document.body.removeChild(this.resource);
      }
    }
    return this._naturalHeight;
  }

}