import { ImageResource } from 'image-resource';

export class ImageRendering {
  static AUTO         = 'auto';
  static SMOOTH       = 'smooth';
  static PIXELATED    = 'pixelated';
  static CRISP_EDGES  = 'crisp-edges';
}

export class Canvas {

  static fromImageResource(image: ImageResource, width: number = -1, height: number = -1): Canvas {
    if(width < 0) {
      width = image.naturalWidth;
    }
    if(height < 0) {
      height = image.naturalHeight;
    }

    let canvas = new Canvas(width, height);

    canvas.ctx.drawImage(
      image.image,
      0, 0, image.naturalWidth, image.naturalHeight,
      0, 0, width, height
    );
    return canvas;
  }

  static fromImageData(imageData: ImageData): Canvas {
    let canvas = new Canvas(imageData.width, imageData.height);
    canvas.putImageData(imageData);
    return canvas;
  }

  static forEachPixels(imageData: ImageData, fnc: (r: number, g: number, b: number, a: number, x: number, y: number) => any[]) {
    for(let i = 0; i < imageData.data.length; i += 4) {
      let result: any[] = fnc(
        imageData.data[i + 0],
        imageData.data[i + 1],
        imageData.data[i + 2],
        imageData.data[i + 3],
        (i / 4) % imageData.width,
        Math.floor((i / 4) / imageData.width)
      );

      if(result) {
        let resultIndex = (imageData.width * result[5] + result[4]) * 4;
        imageData.data[resultIndex + 0] = result[0];
        imageData.data[resultIndex + 1] = result[1];
        imageData.data[resultIndex + 2] = result[2];
        imageData.data[resultIndex + 3] = result[3];
      }
    }

    return imageData;
  }

  static mergeImageData(imageDataUnder: ImageData, imageDataOver: ImageData): ImageData {
    let alpha1: number, alpha2: number, alpha3: number;
    for(let i = 0; i < imageDataUnder.data.length; i += 4) {
      alpha1 = imageDataOver.data[i + 3] / 255;
      alpha2 = (imageDataUnder.data[i + 3] / 255) * (1 - alpha1);
      alpha3 = alpha1 + alpha2;

      imageDataUnder.data[i + 0] = (imageDataOver.data[i + 0] * alpha1 + imageDataUnder.data[i + 0] * alpha2) / alpha3;
      imageDataUnder.data[i + 1] = (imageDataOver.data[i + 1] * alpha1 + imageDataUnder.data[i + 1] * alpha2) / alpha3;
      imageDataUnder.data[i + 2] = (imageDataOver.data[i + 2] * alpha1 + imageDataUnder.data[i + 2] * alpha2) / alpha3;
      imageDataUnder.data[i + 3] = alpha3 * 255;
    }
    return imageDataUnder;
  }

  static offsetImageData(imageDataSource: ImageData, x: number, y: number): ImageData {
    let imageDataDestination: ImageData = new ImageData(imageDataSource.width, imageDataSource.height);

    let j: number;
    let k: number = (x + y * imageDataSource.width) * 4;
    for(let i = 0; i < imageDataSource.data.length; i += 4) {
      j = (i + k) % imageDataSource.data.length;
      imageDataDestination.data[j + 0] = imageDataSource.data[i + 0];
      imageDataDestination.data[j + 1] = imageDataSource.data[i + 1];
      imageDataDestination.data[j + 2] = imageDataSource.data[i + 2];
      imageDataDestination.data[j + 3] = imageDataSource.data[i + 3];
    }

    return imageDataDestination;
  }

  static alphaMap(imageData: ImageData, alphaMap: ImageData): ImageData {
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = alphaMap.data[i];
    }
    return imageData;
  }


  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

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

  append(parent: Element): this {
    parent.appendChild(this.canvas);
    return this;
  }

  toImageResource(): Promise<ImageResource> {
    return ImageResource.load(this.canvas.toDataURL());
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
        this.ctx.mozImageSmoothingEnabled = true;
        this.ctx.webkitImageSmoothingEnabled = true;
        this.ctx.msImageSmoothingEnabled = true;
        (<any>this.ctx).imageSmoothingEnabled = true;
        break;
      case ImageRendering.PIXELATED:
      case ImageRendering.CRISP_EDGES:
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        (<any>this.ctx).imageSmoothingEnabled = false;
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
}
