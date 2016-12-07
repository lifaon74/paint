import { Canvas } from './classes/canvas.class';
import { ImageResource } from './classes/resources/imageResource.class';
import { ResourceLoader } from './classes/resources/resourceLoader.class';
import { AsyncResource } from './classes/resources/asyncResource.class';
import { AudioResource } from './classes/resources/audioResource.class';

// https://developer.mozilla.org/fr/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation

export class ReadAsType {
  static arrayBuffer   = 'arrayBuffer';
  static binaryString  = 'binaryString';
  static dataURL       = 'dataURL';
  static text          = 'text';
}

export class FileHelper {

  static openFileSelection(onFilesCallback: ((files: FileList) => any)) {
    let input: HTMLInputElement = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.addEventListener('change', (event: any) => {
      onFilesCallback(input.files);
    });
    input.click();
  }

  static readFile(file: File, readAs: ReadAsType = ReadAsType.arrayBuffer): Promise<string> {
    return new Promise((resolve:any, reject:any) => {
      let reader = new FileReader();
      reader.addEventListener('load', (event: any) => {
        resolve(reader.result);
      });
      reader.addEventListener('error', (error: any) => {
        reject(error);
      });

      switch(readAs) {
        case ReadAsType.arrayBuffer:
          reader.readAsArrayBuffer(file);
          break;
        case ReadAsType.binaryString:
          reader.readAsBinaryString(file);
          break;
        case ReadAsType.dataURL:
          reader.readAsDataURL(file);
          break;
        case ReadAsType.text:
          reader.readAsText(file);
          break;
        default:
          reject(new Error('Unknown readAs value ' + readAs));
          break;
      }
    });
  }

}


export class Renderer {

  static openImagesSelection(onImageCallback: ((images: ImageResource[]) => any)) {
    FileHelper.openFileSelection((files: FileList) => {
      let reg = new RegExp('image/.*', '');
      let promises: Promise<ImageResource>[] = [];
      let file: File;
      for(let i = 0; i < files.length; i++) {
        file = files[i];
        if(reg.test(file.type)) {
          promises.push(Renderer.readFileAsImage(file));
        }
      }
      Promise.all(promises).then(onImageCallback);
    });
  }

  static readFileAsImage(file: File): Promise<ImageResource> {
    return FileHelper.readFile(file, ReadAsType.dataURL)
    .then((imageData: string) => {
      return <Promise<ImageResource>>ImageResource.load(imageData);
    });
  }

  static buildAutoTile(canvas: Canvas, x: number, y: number): Canvas {
    x *= 64;
    y *= 96;

    let result = canvas.cut(x, y + 32, 64, 64);

    result.add(canvas.cut(x + 32, y, 16, 16), 32, 32);
    result.add(canvas.cut(x + 32 + 16, y, 16, 16), 16, 32);
    result.add(canvas.cut(x + 32, y + 16, 16, 16), 32, 16);
    result.add(canvas.cut(x + 32 + 16, y + 16, 16, 16), 16, 16);

    return result;
  };



  public canvas: Canvas;

  constructor() {
    this.canvas = new Canvas(1, 1);
  }

  append(element: Element) {
    this.canvas.append(element);
  }

}

export class ImagePart {
  constructor(
    public image: ImageResource,
    public x: number,
    public y: number
  ) {
  }
}


export class Tile extends ImagePart {
  static width: number = 32;
  static height: number = 32;

  constructor(
    image: ImageResource,
    x: number,
    y: number
  ) {
    super(image, x, y);
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.drawImage(
      this.image.resource,
      this.x, this.y, Tile.width, Tile.height,
      x *  Tile.width, y * Tile.height, Tile.width, Tile.height
    );
  }
}

export class JoinTile {
  static width: number  = Tile.width * 2;
  static height: number = Tile.height * 2;

  renderedMap: Map<Tile, ImageResource>;

  private canvas: Canvas;
  constructor(
    public alphaMap: AlphaMap,
    public interLayer: AlphaMap
  ) {
    this.renderedMap  = new Map<Tile, ImageResource>();
    this.canvas     = new Canvas(JoinTile.width, JoinTile.height);
  }


  getFor(tile: Tile): ImageResource {
    let image: ImageResource = this.renderedMap.get(tile);
    if(!image) {
      image = this.render(tile);
      this.renderedMap.set(tile, image);
    }
    return image;
  }

  clearFor(tile: Tile): this {
    this.renderedMap.delete(tile);
    return this;
  }


  render(tile: Tile): ImageResource {
    this.canvas.clear();

    tile.draw(this.canvas.ctx, 0, 0);
    tile.draw(this.canvas.ctx, 1, 0);
    tile.draw(this.canvas.ctx, 0, 1);
    tile.draw(this.canvas.ctx, 1, 1);

    this.canvas.ctx.globalCompositeOperation = 'destination-in';
    this.canvas.ctx.drawImage(this.alphaMap.image.resource, 0, 0);
    this.canvas.ctx.globalCompositeOperation = 'destination-over';
    this.canvas.ctx.drawImage(this.interLayer.image.resource, 0, 0);
    this.canvas.ctx.globalCompositeOperation = 'source-over';

    return this.canvas.toImageResourceSync();
  }

}

export class AlphaMap extends ImagePart {
  static width: number = JoinTile.width;
  static height: number = JoinTile.height;

  static fromShadesOfGrey(image: ImageResource, x: number, y: number): AlphaMap {
    let imageData: ImageData = Canvas.fromImageResource(image).getImageData(x, y, AlphaMap.width, AlphaMap.height);
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = (imageData.data[i + 0] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      imageData.data[i + 0] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
    }
    return new AlphaMap(Canvas.fromImageData(imageData).toImageResourceSync(), 0, 0);
  }

  constructor(
    image: ImageResource,
    x: number,
    y: number
  ) {
    super(image, x, y);
  }
}

export class InterLayer extends ImagePart {
  static width: number = JoinTile.width;
  static height: number = JoinTile.height;

  constructor(
    image: ImageResource,
    x: number,
    y: number
  ) {
    super(image, x, y);
  }
}







window.addEventListener('load', () => {
  const renderer = new Renderer();

  // document.body.addEventListener('click', () => Renderer.openImagesSelection((images: ImageResource[]) => {
  //   let canvas = Canvas.fromImageResource(images[0]);
  //   canvas.cut();
  // }));

  let buildAlphaMapHelper = (imageDataUnder: ImageData, imageDataOver: ImageData, imageDataResult: ImageData): ImageData => {
    let imageDataAlphaMap: ImageData = new Canvas(imageDataUnder.width, imageDataUnder.height).getImageData();

    for(let i = 0; i < imageDataResult.data.length; i += 4) {
      if(
        (imageDataResult.data[i + 0] === imageDataOver.data[i + 0]) &&
        (imageDataResult.data[i + 1] === imageDataOver.data[i + 1]) &&
        (imageDataResult.data[i + 2] === imageDataOver.data[i + 2])
      ) {
        imageDataAlphaMap.data[i + 0] = 255;
        imageDataAlphaMap.data[i + 1] = 255;
        imageDataAlphaMap.data[i + 2] = 255;
        imageDataAlphaMap.data[i + 3] = 255;
      } else  if(
        (imageDataResult.data[i + 0] === imageDataUnder.data[i + 0]) &&
        (imageDataResult.data[i + 1] === imageDataUnder.data[i + 1]) &&
        (imageDataResult.data[i + 2] === imageDataUnder.data[i + 2])
      ) {
        imageDataAlphaMap.data[i + 0] = 0;
        imageDataAlphaMap.data[i + 1] = 0;
        imageDataAlphaMap.data[i + 2] = 0;
        imageDataAlphaMap.data[i + 3] = 255;
      } else {
        let a = 255 - (
            Math.abs(imageDataResult.data[i + 0] - imageDataUnder.data[i + 0]) +
            Math.abs(imageDataResult.data[i + 1] - imageDataUnder.data[i + 1]) +
            Math.abs(imageDataResult.data[i + 2] - imageDataUnder.data[i + 2])
          ) / 3;

        let b = 255 - (
            Math.abs(imageDataResult.data[i + 0] - imageDataOver.data[i + 0]) +
            Math.abs(imageDataResult.data[i + 1] - imageDataOver.data[i + 1]) +
            Math.abs(imageDataResult.data[i + 2] - imageDataOver.data[i + 2])
          ) / 3;

        // console.log(a, b);

        let c = (a > b) ? 255 : 0;

        imageDataAlphaMap.data[i + 0] = 255;
        imageDataAlphaMap.data[i + 1] = c;
        imageDataAlphaMap.data[i + 2] = 0;
        imageDataAlphaMap.data[i + 3] = 255;

        // imageDataAlphaMap.data[i + 0] = imageDataResult.data[i + 0];
        // imageDataAlphaMap.data[i + 1] = imageDataResult.data[i + 1];
        // imageDataAlphaMap.data[i + 2] = imageDataResult.data[i + 2];
        // imageDataAlphaMap.data[i + 3] = 255;
      }
    }

    return imageDataAlphaMap;
  };

  let processAlphaMapHelper = (canvas: Canvas) => {
    let tile_0 = canvas.cut(32 * 2, 0, 32, 32);

    let tile_1 = canvas.cut(0, 0, 32, 32);
    let tile_2 = new Canvas(32, 32);
    tile_2.add(canvas.cut(32 * 2 + 32, 32 + 32, 16, 16), 0, 0);
    tile_2.add(canvas.cut(32 * 2 + 32, 32 + 16, 16, 16), 0, 16);
    tile_2.add(canvas.cut(32 * 2 + 16, 32 + 32, 16, 16), 16, 0);
    tile_2.add(canvas.cut(32 * 2 + 16, 32 + 16, 16, 16), 16, 16);

    let result = new Canvas(32, 32);
    result.putImageData(buildAlphaMapHelper(tile_2.getImageData(), tile_1.getImageData(), tile_0.getImageData()));

    tile_0.resize(64, 64).append(document.body);
    tile_1.resize(64, 64).append(document.body);
    tile_2.resize(64, 64).append(document.body);
    result.resize(64, 64).append(document.body);
  };

  let compose = (imageDataUnder: ImageData, imageDataOver: ImageData, imageDataAlphaMap: ImageData): ImageData => {
    let imageDataResult: ImageData = new Canvas(32, 32).getImageData();

    Canvas.alphaMap(imageDataOver, imageDataAlphaMap);

    return imageDataResult;
  };


  ResourceLoader.loadMany([
    './assets/images/originals/01.png',
    './assets/images/originals/02.png',
    './assets/images/originals/03.png',
    './assets/images/originals/04.png',
    './assets/images/joins/grass/grass_alpha.png',
    './assets/images/joins/grass/grass_inter_layer.png',
    // './assets/sounds/field_01.mp3'
  ], (index: number, total: number) => {
    console.log(Math.round((index + 1) / total * 100 ) + '%');
  }).then((resources: AsyncResource[]) => {
    let autoTilesCanvas = Canvas.fromImageResource(<ImageResource>resources[0]);
    let tilesCanvas = Canvas.fromImageResource(<ImageResource>resources[1]);
    let autoTile = Renderer.buildAutoTile(autoTilesCanvas, 1, 1);

    let size = 64;

    autoTile
      // .resize(size, size, 'pixelated')
      .append(document.body);


    let tileGrass = new Tile(<ImageResource>resources[1], 32 * 6, 32 * 2);
    let tileRock = new Tile(<ImageResource>resources[1], 32 * 5, 32 * 2);
    let tileSand = new Tile(<ImageResource>resources[1], 32 * 9, 32 * 2);

    let alphaMap = AlphaMap.fromShadesOfGrey(<ImageResource>resources[4], 0, 0);
    let joinGrass = new JoinTile(alphaMap, new InterLayer(<ImageResource>resources[5], 0, 0));

    Canvas.fromImageResource(joinGrass.getFor(tileGrass)).append(document.body);

    // (<AudioResource>resources[6]).play();
  });

});



