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

  static async awaitLoaded(image: HTMLImageElement): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve: any, reject: any) => {
      if(image.complete) {
        resolve(image);
      } else {
        let load: any, error: any, clear: any;

        load = () => {
          clear();
          resolve(image);
        };

        error = () => {
          clear();
          reject(new Error('Invalid resource path ' + image.src));
        };

        clear = () => {
          image.removeEventListener('load', load, false);
          image.removeEventListener('error', error, false);
        };

        image.addEventListener('load', load, false);
        image.addEventListener('error', error, false);
      }
    })
      // .then((image: HTMLImageElement) => {
      //   return new Promise((resolve: any, reject: any) => {
      //     setTimeout(() => resolve(image), Math.random() * 100);
      //   });
      // })
      ;
  }


  public useProxy: boolean = true;

  public _width: number;
  public _height: number;

  public _src: string;
  public _resource: HTMLImageElement;
  public _imageData: ImageData;


  public _hasTransparency: boolean;


  constructor() {
    super();
    this.reset();
  }

  async load(sources: (string | ArrayLike<string>) = this.src): Promise<this> {
    if(!(sources instanceof Array)) {
      sources = [sources] as Array<string>;
    }

    let i = 0, loaded: boolean = false;
    while((i < sources.length) && !loaded) {
      try {
        this.src = sources[i];
        await ImageResource.awaitLoaded(this.resource);
        loaded = true;
      } catch(error) {
        i++;
      }
    }
    if(!loaded) throw new Error('Invalid resource path ' + JSON.stringify(sources));
    return this;
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

  set width(width: number) {
    this._width           = width;
    this._src             = null;
    this._resource        = null;
    this._imageData       = null;
    this._hasTransparency = null;
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

  set height(height: number) {
    this._height          = height;
    this._src             = null;
    this._resource        = null;
    this._imageData       = null;
    this._hasTransparency = null;
  }


  get src(): string {
    if(!this._src) {
      this._src = '';
      if(this._resource) {
        this._src = this._resource.src;
      } else if(this._imageData) {
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width  = this._imageData.width;
        canvas.height = this._imageData.height;
        const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
        ctx.putImageData(this._imageData, 0, 0);
        this._src = canvas.toDataURL();
      }
    }
    return this._src;
  }

  set src(source: string) {
    if(source !== this._src) {
      this.reset();
      this._src = source;
    }
  }


  get resource(): HTMLImageElement {
    if(!this._resource) {
      this._resource = new Image();
      this._resource.src = this.src;
      this.proxyResource(this._resource);
    }
    return this._resource;
  }

  set resource(resource: HTMLImageElement) {
    if(resource !== this._resource) {
      this.reset();
      this._resource = resource;
      this.proxyResource(resource);
    }
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
      } else {
        this._imageData = new ImageData(this.width, this.height);
        // throw new Error('Cannot get ImageData if ImageResource is not loaded');
      }
    }
    return this._imageData;
  }

  set imageData(imageData: ImageData) {
    this.reset();
    this._width     = imageData.width;
    this._height    = imageData.height;
    this._imageData = imageData;
  }


  reset() {
    this._width  = 0;
    this._height = 0;
    this._src             = null;
    this._resource        = null;
    this._imageData       = null;
    this._hasTransparency = null;
  }


  isFullyTransparent(): boolean {
    let imageData: ImageData = this.imageData;
    if(imageData) {
      for(let i = 0; i < imageData.data.length; i += 4) {
        if(imageData.data[i + 3] !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  hasTransparency(): boolean {
    if(this._hasTransparency === null) {
      this._hasTransparency = this._checkIfHasTransparency();
    }
    return this._hasTransparency;
  }


  private proxyResource(resource: HTMLImageElement) {
    if(this.useProxy) {
      let descriptor = Object.getOwnPropertyDescriptor(this._resource, 'src');
      if(!descriptor) {
        descriptor = {
          set: function(source: string) {
            this.setAttribute('src', source);
          },
          get: function() {
            return this.getAttribute('src');
          },
          configurable: true,
          enumerable: true
        };
      }

      Object.defineProperty(resource, 'src', {
        set: (source: string) => {
          if(resource === this._resource) {
            this.reset();
            this._src = source;
            this._resource = resource;
          } else {
            // console.log('unlink');
            Object.defineProperty(resource, 'src', descriptor);
          }
          descriptor.set.call(resource, source);
        },
        get: (): string => {
          if(resource !== this._resource) {
            // console.log('unlink');
            Object.defineProperty(resource, 'src', descriptor);
          }
          return descriptor.get.call(resource);
        },
        configurable: true,
      });
    }
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