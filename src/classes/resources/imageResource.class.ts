import { AsyncResource } from './asyncResource.class';

export class ImageResource extends AsyncResource {
  static load(source: string): Promise<ImageResource> {
    return new ImageResource().load(source);
  }

  static create(width: number, height: number) {
    return ImageResource.fromImageData(new ImageData(width, height));
  }

  static fromImageData(imageData: ImageData): ImageResource {
    let imageResource = new ImageResource();
    imageResource.imageData = imageData;
    return imageResource;
  }

  //public resource: HTMLImageElement;

  public _width: number;
  public _height: number;

  public _imageData: ImageData;
  public _resource: HTMLImageElement;

  public _hasTransparency: boolean;


  constructor() {
    super();
    this._width  = 0;
    this._height = 0;
    this._imageData       = null;
    this._resource        = null;
    this._hasTransparency = null;
  }

  get width(): number {
    if(!this._width) {
      if(this._resource) {
        if(this._resource.naturalWidth) {
          this._width = this._resource.naturalWidth;
        } else {
          document.body.appendChild(this._resource);
          this._width = this._resource.offsetWidth;
          document.body.removeChild(this._resource);
        }
      } else if(this._imageData) {
        this._width = this._imageData.width;
      }
    }
    return this._width;
  }

  get height(): number {
    if(!this._height) {
      if(this._resource) {
        if(this._resource.naturalHeight) {
          this._height = this._resource.naturalHeight;
        } else {
          document.body.appendChild(this._resource);
          this._height = this._resource.offsetHeight;
          document.body.removeChild(this._resource);
        }
      } else if(this._imageData) {
        this._height = this._imageData.height;
      }
    }
    return this._height;
  }


  get src(): string {
    return this.resource.src;
  }

  set src(source: string) {
    this._width       = 0;
    this._height      = 0;
    this._imageData   = null;
    this.resource.src = source;
    this._hasTransparency = null;
  }


  get resource(): HTMLImageElement {
    if(!this._resource) {
      this._resource = new Image();
      if(this._imageData) {
        let canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width  = this._imageData.width;
        canvas.height = this._imageData.height;
        let ctx: CanvasRenderingContext2D = canvas.getContext('2d');
        ctx.putImageData(this._imageData, 0, 0);
        this._resource.src = canvas.toDataURL();
      }
    }
    return this._resource;
  }

  set resource(resource: HTMLImageElement) {
    this._width     = 0;
    this._height    = 0;
    this._imageData = null;
    this._resource  = resource;
    this._hasTransparency = null;
  }


  get imageData(): ImageData {
    if(!this._imageData) {
      if(this._resource) {
        let canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width  = this.width;
        canvas.height = this.height;
        let ctx: CanvasRenderingContext2D = canvas.getContext('2d');
        ctx.drawImage(this._resource, 0, 0);
        this._imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }
    return this._imageData;
  }

  set imageData(imageData: ImageData) {
    this._width     = imageData.width;
    this._height    = imageData.height;
    this._imageData = imageData;
    this._resource  = null;
    this._hasTransparency = null;
  }


  hasTransparency(): boolean {
    if(this._hasTransparency === null) {
      this._hasTransparency = this._checkIfHasTransparency();
    }
    return this._hasTransparency;
  }

  private _checkIfHasTransparency() {
    let imageData: ImageData = this.imageData;
    if(imageData) {
      for(let i = 0; i < imageData.data.length; i += 4) {
        if(imageData.data[i + 3] !== 255) {
          return true;
        }
      }
    }
    return false;
  }

}