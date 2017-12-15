// import { PNG } from './PNG';
import { URL }  from 'url';

let DO_NOT_INITIALIZE_IMAGE_RESOURCE: boolean = false;
export function GetUninitializedImageResource(constructor: new (...args: any[]) => ImageResource = ImageResource): ImageResource {
  DO_NOT_INITIALIZE_IMAGE_RESOURCE = true;
  const imageResource: ImageResource = new constructor();
  DO_NOT_INITIALIZE_IMAGE_RESOURCE = false;
  return imageResource;
}

export class ImageResource {

  static getMimeType(path: string): string | null {
    const parts: string[] = path.split('.');
    switch(parts[parts.length - 1].toLowerCase()) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return null;
    }
  }


  static fromURL(url: string): Promise<ImageResource> {
    return new Promise((resolve: any, reject: any) => {
      if(typeof Image === 'undefined') {
        const _url = new URL(url);
        if(_url.protocol === 'file:') {
          const $fs = require('fs');
          $fs.readFile(url, (error: any, bytes: Buffer) => {
            if(error) {
              reject(error);
            } else {
              resolve(this.fromBytes(bytes, this.getMimeType(url)));
            }
          });
        } else {
          throw new Error('TODO unsuppored protocol');
        }
      } else {
        const image = new Image();
        image.src = url;
        resolve(this.fromImage(image));
      }
    });
  }

  static fromImage(image: HTMLImageElement): Promise<ImageResource> {
    return new Promise((resolve: any, reject: any) => {
      if(image.complete) {
        resolve();
      } else {
        image.onload = resolve;
        image.onerror = () => {
          reject(new Error('Invalid image path ' + image.src));
        };
      }
    }).then(() => {
      const canvas: HTMLCanvasElement = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      return this.fromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    });
  }

  static fromBlob(blob: Blob): Promise<ImageResource> {
    return new Promise((resolve: any, reject: any) => {
      const reader: FileReader = new FileReader();
      reader.onload = () => {
        resolve(this.fromBytes(new Uint8Array(reader.result), blob.type));
      };

      reader.onerror = () => {
        reject(reader.error);
      };

      reader.readAsArrayBuffer(blob);
    });
  }

  static fromBytes(bytes: Uint8Array, mimeType: string): Promise<ImageResource> {
    switch(mimeType) {
      case 'image/png':
        return PNG.fromBytes(bytes);
      default:
        throw new Error('Unsupported mimeType : ' + mimeType);
    }
  }

  static fromImageData(imageData: ImageData): Promise<ImageResource> {
    return Promise.resolve(this.fromImageDataSync(imageData));
  }

  static fromImageDataSync(imageData: ImageData): ImageResource {
    return new ImageResource(imageData.width, imageData.height, imageData.data);
  }


  public width: number;
  public height: number;
  public data: Uint8ClampedArray;

  constructor(width: number, height: number, data: Uint8ClampedArray = new Uint8ClampedArray(width * height * 4)) {
    if(!DO_NOT_INITIALIZE_IMAGE_RESOURCE) {
      if(typeof width !== 'number') throw new TypeError('Invalid width type');
      if(typeof height !== 'number') throw new TypeError('Invalid height type');
      if(width < 0) throw new RangeError('Width must be positive');
      if(height < 0) throw new RangeError('Height must be positive');

      if(!(data instanceof Uint8ClampedArray)) throw new TypeError('Invalid data type');
      if(data.length !== width * height * 4) throw new TypeError('Invalid data size : ' + data.length + ', expected ' + width * height * 4);

      this.width = width;
      this.height = height;
      this.data = data;
    }
  }

  clone(): ImageResource {
    const copy: ImageResource = GetUninitializedImageResource();
    copy.width = this.width;
    copy.height = this.height;
    copy.data = new Uint8ClampedArray(this.data.length);
    copy.data.set(this.data);
    return copy;
  }

  equals(image: ImageResource): boolean {
    if(
      (this.data.length !== image.data.length)
      || (this.width !== image.width)
      || (this.height !== image.height)
    ) {
      return false;
    }

    for(let i = 0, l = this.data.length; i < l; i++) {
      if(this.data[i] !== image.data[i]) return false;
    }

    return true;
  }

  hasTransparency(): boolean {
    for(let i = 0, l = this.data.length; i < l; i++) {
      if(this.data[i + 3] !== 255) return true;
    }
    return false;
  }



  toImageData(): Promise<ImageData> {
    return Promise.resolve(this.toImageDataSync());
  }

  toImageDataSync(): ImageData {
    return new ImageData(this.data, this.width, this.height);
  }

  toCanvas(): Promise<HTMLCanvasElement> {
    return this.toImageData()
      .then((imageData: ImageData) => {
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      });
  }

  toImage(type: string = 'image/png', quality?: number): Promise<HTMLImageElement> {
    return this.toDataURL(type, quality)
      .then((dataURL: string) => {
        const image: HTMLImageElement = new Image();
        image.src = dataURL;
        return image;
      });
  }

  toBlob(type: string = 'image/png', quality?: number): Promise<Blob> {
    return this.toCanvas()
      .then((canvas: HTMLCanvasElement) => {
        return new Promise<Blob>((resolve: any) => {
          canvas.toBlob(resolve, type, quality)
        });
      });
  }

  toDataURL(type: string = 'image/png', quality?: number): Promise<string> {
    return this.toCanvas()
      .then((canvas: HTMLCanvasElement) => {
        return canvas.toDataURL(type, quality);
      });
  }

}

async function loadImage() {
  const path: string = require('path').resolve('../../../src/assets/images/other/red_px.png');
  const image = await ImageResource.fromURL(path);
  console.log(image);
}

// loadImage().catch(error => console.log(error));


