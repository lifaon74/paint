import { ImageResource } from './resources/imageResource.class';

export class ImageRendering {
  static AUTO         = 'auto';
  static SMOOTH       = 'smooth';
  static PIXELATED    = 'pixelated';
  static CRISP_EDGES  = 'crisp-edges';
}




export class Canvas {
  static fromImageResource(image: ImageResource): Canvas {
    return new Canvas(image.width, image.height).putImageResource(image);
  }

  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.setSize(width, height);
    this.ctx = this.canvas.getContext('2d');
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    return this;
  }

  append(parent: Element = document.body): this {
    parent.appendChild(this.canvas);
    return this;
  }


  toImageResource(): ImageResource {
    // let image = new ImageResource();
    // image._width = 0;
    // image._height = 0;
    // image.resource.src = this.canvas.toDataURL();
    // return image;

    return ImageResource.fromImageData(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
  }

  putImageResource(imageResource: ImageResource, sx: number = 0, sy: number = 0, sw: number = imageResource.width, sh: number = imageResource.height, dx: number = 0, dy: number = 0): this {
    sx = Math.max(0, Math.min(imageResource.width, sx));
    sw = Math.max(0, Math.min(imageResource.width - sx, sw));
    sy = Math.max(0, Math.min(imageResource.height, sy));
    sh = Math.max(0, Math.min(imageResource.height - sy, sh));

    if(imageResource._resource) {
      this.ctx.drawImage(imageResource._resource, sx, sy, sw, sh, dx, dy, sw, sh);
    } else if(imageResource._imageData) {
      this.ctx.putImageData(imageResource._imageData, dx - sx, dy - sy, sx, sy, sw, sh);
    }
    return this;
  }



  getImageData(x: number = 0, y: number = 0, width: number = this.canvas.width, height: number = this.canvas.height): ImageData {
    return this.ctx.getImageData(x, y, width, height);
  }

  putImageData(imageData: ImageData, x: number = 0, y: number = 0): this {
    this.ctx.putImageData(imageData, x, y);
    return this;
  }


  setImageRendering(imageRendering: ImageRendering): this {
    switch(imageRendering) {
      case ImageRendering.AUTO:
      case ImageRendering.SMOOTH:
       this.imageSmoothingEnabled = true;
        break;
      case ImageRendering.PIXELATED:
      case ImageRendering.CRISP_EDGES:
        this.imageSmoothingEnabled = false;
        break;
    }

    return this;
  }


  add(canvas: Canvas, x: number = 0, y: number = 0): this {
    this.ctx.drawImage(canvas.canvas, x, y);
    return this;
  }

  cut(x: number, y: number, width: number = this.canvas.width, height: number = this.canvas.height): Canvas {
    width = Math.min(width, this.canvas.width - x);
    height = Math.min(height, this.canvas.height - y);
    let canvas = new Canvas(width, height);
    canvas.putImageData(this.getImageData(x, y, width, height));
    return canvas;
  }

  resize(width: number, height: number, imageRendering?: ImageRendering): Canvas {
    let canvas = new Canvas(width, height);
    if(typeof imageRendering !== 'undefined') {
      canvas.setImageRendering(imageRendering);
    }
    canvas.ctx.drawImage(this.canvas, 0, 0, width, height);
    return canvas;
  }

  clear(): this {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return this;
  }

  fill(color: string): this {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    return this;
  }

  get width(): number {
    return this.canvas.width;
  }

  set width(width: number) {
    this.canvas.width = width;
  }

  get height(): number {
    return this.canvas.height;
  }

  set height(height: number) {
    this.canvas.height = height;
  }

  set imageSmoothingEnabled(enable: boolean) {
    if(typeof ((<any>this.ctx).imageSmoothingEnabled) !== 'undefined') {
      (<any>this.ctx).imageSmoothingEnabled = enable;
    } else if(typeof this.ctx.mozImageSmoothingEnabled !== 'undefined') {
      this.ctx.mozImageSmoothingEnabled = enable;
    } else if(typeof this.ctx.webkitImageSmoothingEnabled !== 'undefined') {
      this.ctx.webkitImageSmoothingEnabled = enable;
    } else if(typeof this.ctx.msImageSmoothingEnabled !== 'undefined') {
      this.ctx.msImageSmoothingEnabled = enable;
    }
  }

  get imageSmoothingEnabled(): boolean {
    if(typeof ((<any>this.ctx).imageSmoothingEnabled) !== 'undefined') {
      return (<any>this.ctx).imageSmoothingEnabled;
    } else if(typeof this.ctx.mozImageSmoothingEnabled !== 'undefined') {
      return this.ctx.mozImageSmoothingEnabled;
    } else if(typeof this.ctx.webkitImageSmoothingEnabled !== 'undefined') {
      return this.ctx.webkitImageSmoothingEnabled;
    } else if(typeof this.ctx.msImageSmoothingEnabled !== 'undefined') {
      return this.ctx.msImageSmoothingEnabled;
    } else {
      return true;
    }
  }
}
