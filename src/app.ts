import { Canvas } from './classes/canvas.class';
import { SortedArray } from './classes/sortedArray.class';
import { ImageResource } from './classes/resources/imageResource.class';
import { ResourceLoader } from './classes/resources/resourceLoader.class';
import { AsyncResource } from './classes/resources/asyncResource.class';
import { AudioResource } from './classes/resources/audioResource.class';

// https://developer.mozilla.org/fr/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation

/***
 * Math.floor(i / 2) * 2 : 3420
 * (i >> 1) << 1 : 1568
 *
 * i % 2 : 1538
 * i & 1 : 1282
 */

// let a = 0;
// let t1 = new Date().getTime();
// for(let i = 0; i < 1000000000; i++) {
//   // a += Math.floor(i / 2) * 2; // 3420ms
//   // a += (i >> 1) << 1; // 1568ms
//   // a += i % 2; // 1538
//   // a += i & 1; // 1282
// }
// let t2 = new Date().getTime();
// console.log(a, t2 - t1);


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

  constructor() {
  }
}


export class ImagePart {
  constructor(
    public image: ImageResource,
    public sx: number,
    public sy: number
  ) {}
}


export class Tile extends ImagePart {
  static width: number  = 32;
  static height: number = 32;
  static halfWidth: number  = Tile.width / 2;
  static halfHeight: number = Tile.height / 2;
  static twoWidth: number  = Tile.width * 2;
  static twoHeight: number = Tile.height * 2;

  constructor(
    image: ImageResource,
    sx: number,
    sy: number
  ) {
    super(image, sx, sy);
  }

  draw(ctx: CanvasRenderingContext2D, dx: number, dy: number) {
    ctx.drawImage(
      this.image.resource,
      this.sx, this.sy, Tile.width, Tile.height,
      dx *  Tile.width, dy * Tile.height, Tile.width, Tile.height
    );
  }
}


export class AutoTile extends ImagePart {
  static sections: number = 20;

  static templateToAutoTileIndexes: number[] = [
     3,  5,  1,  7,
    10, 12,  8, 14,
     2,  4,  0,  6,
    11, 13,  9, 15
  ];

  static templateInvertedToAutoTileIndexes: number[] = [
    12,  9, 13,  8,
     6,  3,  7,  2,
    14, 11, 15, 10,
     4,  1,  5,  0
  ];


  static autoTileToTemplateIndexes: number[] =
    AutoTile.templateToAutoTileIndexes.map((value: number, index: number) => AutoTile.templateToAutoTileIndexes.indexOf(index));

  static autoTileToTemplateInvertedIndexes: number[] =
    AutoTile.templateInvertedToAutoTileIndexes.map((value: number, index: number) => AutoTile.templateInvertedToAutoTileIndexes.indexOf(index));


  static fromTemplate(tile: Tile, template: ImagePart): AutoTile {
    let canvas = new Canvas(Tile.halfWidth * 20, Tile.halfHeight);

    for(let y = 0; y < 4; y++) {
      for(let x = 0; x < 4; x++) {
        canvas.ctx.drawImage(
          template.image.resource,
          template.sx + x * Tile.halfWidth, template.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          Math.floor(AutoTile.templateToAutoTileIndexes[x + y * 4] * 1.25) * Tile.halfWidth, 0, Tile.halfWidth, Tile.halfHeight
        );
      }
    }

    for(let i = 0; i < 4; i++) {
      canvas.ctx.drawImage(
        tile.image.resource,
        tile.sx + (i % 2) * Tile.halfWidth, tile.sy + Math.floor(i / 2) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
        (i * 5 + 4) * Tile.halfWidth, 0, Tile.halfWidth, Tile.halfHeight
      );
    }

    // for(let y = 0; y < 4; y++) {
    //   for(let x = 0; x < 4; x++) {
    //     let i = AutoTile.templateToAutoTileIndexes[x + y * 4];
    //     canvas.ctx.drawImage(
    //       template.image.resource,
    //       template.sx + x * Tile.halfWidth, template.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
    //       (i % 4) * Tile.halfWidth, Math.floor(i / 4) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
    //     );
    //   }
    // }
    //
    // for(let i = 0; i < 4; i++) {
    //   canvas.ctx.drawImage(
    //     tile.image.resource,
    //     tile.sx + (i % 2) * Tile.halfWidth, tile.sy + Math.floor(i / 2) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
    //     4 * Tile.halfWidth, i * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
    //   );
    // }

    return new AutoTile(canvas.toImageResourceSync(), 0, 0);
  }

  constructor(
    image: ImageResource,
    sx: number,
    sy: number,
    public zIndex: number = 0
  ) {
    super(image, sx, sy);
  }

  draw(ctx: CanvasRenderingContext2D, index: number, dx: number, dy: number) {
    ctx.drawImage(
      this.image.resource,
      this.sx + index * Tile.halfWidth, this.sy, Tile.halfWidth, Tile.halfHeight,
      dx *  Tile.halfWidth, dy * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
    );
  }

  toTemplate(inverted: boolean = false): ImageResource {
    let canvas: Canvas = new Canvas(64, 64);
    for(let i = 0; i < 16; i++) {
      let j = inverted ? AutoTile.autoTileToTemplateInvertedIndexes[i] : AutoTile.autoTileToTemplateIndexes[i];
      canvas.ctx.drawImage(
        this.image.resource,
        this.sx + Math.floor(i * 1.25) * Tile.halfWidth, this.sy, Tile.halfWidth, Tile.halfHeight,
        (j % 4) * Tile.halfWidth, Math.floor(j / 4) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
      );
    }
    return canvas.toImageResourceSync();
  }

}


export class AutoTileHelper {

  private static canvas: Canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

  static extractAutoTileTemplate(imagePart: ImagePart): ImageResource {
    let canvas: Canvas = AutoTileHelper.canvas;
    canvas.resize(Tile.twoWidth, Tile.twoHeight);
    canvas.clear();

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx, imagePart.sy + Tile.width, Tile.twoWidth, Tile.twoHeight,
      0, 0, Tile.twoWidth, Tile.twoHeight
    );

    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        canvas.ctx.drawImage(
          imagePart.image.resource,
          imagePart.sx + Tile.width + x * Tile.halfWidth, imagePart.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          Tile.width - (x * Tile.halfWidth), Tile.height - (y * Tile.halfHeight), Tile.halfWidth, Tile.halfHeight
        );
      }
    }

    return canvas.toImageResourceSync();
  }

  static shadesOfGreyToAlphaMap(imagePart: ImagePart): ImageResource {
    let canvas: Canvas = AutoTileHelper.canvas;
    canvas.resize(Tile.twoWidth, Tile.twoHeight);
    canvas.clear();

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx, imagePart.sy, Tile.twoWidth, Tile.twoHeight,
      0, 0, Tile.twoWidth, Tile.twoHeight
    );

    let imageData: ImageData = canvas.getImageData(0, 0, Tile.twoWidth, Tile.twoHeight);
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = (imageData.data[i + 0] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      imageData.data[i + 0] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
    }
    return canvas.putImageData(imageData).toImageResourceSync();
  }

  static generateAutoTileFromJunctionTemplates(tile: Tile, alphaMap: ImagePart, underLayer: ImagePart): AutoTile {
    let canvas: Canvas = AutoTileHelper.canvas;
    canvas.resize(Tile.twoWidth, Tile.twoHeight);
    canvas.clear();

    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        canvas.ctx.drawImage(
          tile.image.resource,
          tile.sx, tile.sy, Tile.width, Tile.height,
          x * Tile.width, y * Tile.height, Tile.width, Tile.height,
        );
      }
    }

    canvas.ctx.globalCompositeOperation = 'destination-in';
    canvas.ctx.drawImage(alphaMap.image.resource, 0, 0);
    canvas.ctx.globalCompositeOperation = 'destination-over';
    canvas.ctx.drawImage(underLayer.image.resource, 0, 0);
    canvas.ctx.globalCompositeOperation = 'source-over';

    return AutoTile.fromTemplate(tile, new ImagePart(canvas.toImageResourceSync(), 0, 0));
  }

  // topLeftAutoTile: AutoTile, topRightAutoTile: AutoTile, bottomLeftAutoTile: AutoTile, bottomRightAutoTile: AutoTile
  static buildTile(autoTiles: [AutoTile, AutoTile, AutoTile, AutoTile]): ImageResource {
    let canvas = new Canvas(Tile.width, Tile.height);

    let ordered: SortedArray<AutoTile> = new SortedArray<AutoTile>((a: AutoTile, b: AutoTile) => {
      if(a.zIndex < b.zIndex) return -1;
      if(a.zIndex > b.zIndex) return 1;
      return 0;
    });

    for(let i = 0; i < autoTiles.length; i++) {
      ordered.putUnique(autoTiles[i]);
    }


    let i: number;
    let autoTile;
    let orderedAutoTile;
    let index: number;

    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        console.log('--');
        i = x + y * 2;
        let k = i ^ 0b11;
        let l = i | ((i & 0b01) ^ 0b01);
        let m = i | ((i & 0b10) ^ 0b10);

        console.log(i, k, l, m);
        autoTile = autoTiles[i];

        for(let j = 0; j < ordered.array.length; j++) {
          orderedAutoTile = ordered.array[j];
          index = -1;

          if(orderedAutoTile === autoTile) {
            index = 5 * k + 4;
          } else {
            let a = ((autoTiles[k] === orderedAutoTile) << 2) | ((autoTiles[l] === orderedAutoTile) << 1) | (autoTiles[m] === orderedAutoTile);
            console.log(a.toString(2));

            if((a === 0b111) || (a === 0b000)) {
              continue;
            } else {
              a &= 0b011;
            }

            index = 5 * k + a;
          }

          // console.log(index);

          if(index >= 0) {
            canvas.ctx.drawImage(
              orderedAutoTile.image.resource,
              orderedAutoTile.sx + index * Tile.halfWidth, orderedAutoTile.sy, Tile.halfWidth, Tile.halfHeight,
              x * Tile.halfWidth, y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
            );
          }
        }
      }
    }

    // for(let j = 0; j < ordered.array.length; j++) {
    //   orderedAutoTile = ordered.array[j];
    //   if(orderedAutoTile === autoTile) {
    //     index = 5 * 2 + 4;
    //   } else {
    //     let a = ((autoTiles[3] === orderedAutoTile) << 2) | ((autoTiles[2] === orderedAutoTile) << 1) | (autoTiles[1] === orderedAutoTile); // i = 0
    //     // let a = ((autoTiles[2] === orderedAutoTile) << 2) | ((autoTiles[0] === orderedAutoTile) << 1) | (autoTiles[3] === orderedAutoTile); // i = 1
    //     if((a === 0b111) || (a === 0b000)) {
    //       continue;
    //     } else {
    //       a &= 0b011;
    //     }
    //     index = 5 * 2 + a;
    //   }
    //
    //   canvas.ctx.drawImage(
    //     orderedAutoTile.image.resource,
    //     orderedAutoTile.sx + index * Tile.halfWidth, orderedAutoTile.sy, Tile.halfWidth, Tile.halfHeight,
    //     (i % 2) * Tile.halfWidth, Math.floor(i / 2) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
    //   );
    // }


    console.log(ordered);

    return canvas.toImageResourceSync();
  }

}



/***
 * OLD
 */
export class AutoTileOld extends ImagePart {
  static width: number  = Tile.width * 2;
  static height: number = Tile.height * 2;
  static partWidth: number  = Tile.halfWidth;
  static partHeight: number  = Tile.halfHeight;

  static fromShadesOfGrey(image: ImageResource, sx: number, sy: number): AutoTile {
    let imageData: ImageData = Canvas.fromImageResource(image).getImageData(sx, sy, AutoTileOld.width, AutoTileOld.height);
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = (imageData.data[i + 0] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      imageData.data[i + 0] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
    }
    return new AutoTile(Canvas.fromImageData(imageData).toImageResourceSync(), 0, 0);
  }

  constructor(
    image: ImageResource,
    sx: number,
    sy: number
  ) {
    super(image, sx, sy);
  }

  draw(ctx: CanvasRenderingContext2D, sx: number, sy: number, dx: number, dy: number) {
    ctx.drawImage(
      this.image.resource,
      this.sx + sx * AutoTileOld.partWidth, this.sy + sy * AutoTileOld.partHeight, AutoTileOld.partWidth, AutoTileOld.partHeight,
      dx *  AutoTileOld.partWidth, dy * AutoTileOld.partHeight, AutoTileOld.partWidth, AutoTileOld.partHeight
    );
  }

  reverse(): AutoTile {
    let canvas = new Canvas(AutoTileOld.width, AutoTileOld.height);

    this.draw(canvas.ctx, 0, 0, 1, 1);
    this.draw(canvas.ctx, 1, 1, 0, 0);
    this.draw(canvas.ctx, 2, 1, 3, 0);
    this.draw(canvas.ctx, 3, 0, 2, 1);

    this.draw(canvas.ctx, 0, 3, 1, 2);
    this.draw(canvas.ctx, 1, 2, 0, 3);
    this.draw(canvas.ctx, 2, 2, 3, 3);
    this.draw(canvas.ctx, 3, 3, 2, 2);

    this.draw(canvas.ctx, 0, 1, 3, 2);
    this.draw(canvas.ctx, 1, 0, 2, 3);
    this.draw(canvas.ctx, 2, 0, 1, 3);
    this.draw(canvas.ctx, 3, 1, 0, 2);

    this.draw(canvas.ctx, 0, 2, 3, 1);
    this.draw(canvas.ctx, 1, 3, 2, 0);
    this.draw(canvas.ctx, 2, 3, 1, 0);
    this.draw(canvas.ctx, 3, 2, 0, 1);

    return new AutoTile(canvas.toImageResourceSync(), 0, 0);
  }

}


export class AutoTilBuilder {

  autoTilesMap: Map<Tile, AutoTile>;

  private canvas: Canvas;

  constructor(
    public alphaMap: AutoTile,
    public interLayer: AutoTile
  ) {
    this.autoTilesMap = new Map<Tile, AutoTile>();
    this.canvas       = new Canvas(Tile.twoWidth, Tile.twoHeight);
  }

  /**
   * Generate and cache an AutoTile from an Tile
   */
  buildAutoTile(tile: Tile): AutoTile {
    let autoTile: AutoTile = this.autoTilesMap.get(tile);
    if(!autoTile) {
      autoTile = this.generateAutoTile(tile);
      this.autoTilesMap.set(tile, autoTile);
    }
    return autoTile;
  }

  /**
   * Uncache the AutoTile associated to a Tile
   */
  unBuildAutoTile(tile: Tile): this {
    this.autoTilesMap.delete(tile);
    return this;
  }

  /**
   * Generate an AutoTile from a Tile applying alphaMap and interLayer
   */
  generateAutoTile(tile: Tile): AutoTile {
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

    return new AutoTile(this.canvas.toImageResourceSync(), 0, 0);
  }

}


export class Block {
  constructor(
    public topLayers: (AutoTile|Tile)[],
    public frontLayers?: (AutoTile|Tile)[]
  ) {

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

  let randomMapBuilder = () => {
    let map = [];
  };

  let setExponentialPannerConfig = (panner: PannerNode, maxDistance: number) => {
    let listenerHeight = 100;
    let maxDistanceVolume = 0.01;
    let maxDistance2D = Math.sqrt(maxDistance * maxDistance + listenerHeight * listenerHeight);

    panner.panningModel = 'HRTF';
    panner.distanceModel = 'exponential'; // linear, inverse, exponential
    panner.refDistance = listenerHeight;
    panner.maxDistance = maxDistance2D * 2;
    panner.rolloffFactor = -Math.log(maxDistanceVolume) / Math.log(maxDistance2D / listenerHeight);
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
  };

  let audioTest = (audio: AudioResource) => {
    let div = document.createElement('div');
    div.classList.add('circle');
    document.body.appendChild(div);
    let audioContext = new AudioContext();
    let source = audioContext.createMediaElementSource(audio.resource);

    audio.resource.loop = true;
    // let gainNode = audioContext.createGain();
    //
    // window.gainNode = gainNode;
    // gainNode.gain.value = 0.5;
    //
    // source.connect(gainNode);
    // gainNode.connect(audioContext.destination);


    let panner = audioContext.createPanner();
    let panner2 = audioContext.createPanner();
    let listener = audioContext.listener;

    panner.setPosition(0, 0, 0);
    panner2.setPosition(640, 0, 0);

    setExponentialPannerConfig(panner, 320 * 4);
    setExponentialPannerConfig(panner2, 320 * 4);

    window.addEventListener('mousemove', (event: MouseEvent) => {
      let x = event.clientX - (window.innerWidth / 2);
      let y = event.clientY - (window.innerHeight / 2);
      // console.log(x, y);
      listener.setPosition(x, y, 100);
    });


    source.connect(panner);
    source.connect(panner2);
    panner.connect(audioContext.destination);
    panner2.connect(audioContext.destination);

    audio.play();

  };

  ResourceLoader.loadMany([
    './assets/images/originals/01.png',
    './assets/images/originals/02.png',
    './assets/images/originals/03.png',
    './assets/images/originals/04.png',
    './assets/images/templates/junctions/grass/grass_alpha.png',
    './assets/images/templates/junctions/grass/grass_inter_layer.png',
    // './assets/sounds/field_01.mp3',
    // './assets/sounds/005-Rain01.mp3'
  ], (index: number, total: number) => {
    console.log(Math.round((index + 1) / total * 100 ) + '%');
  }).then((resources: AsyncResource[]) => {

    let tileGrass = new Tile(<ImageResource>resources[1], 32 * 6, 32 * 2);
    let tileRock = new Tile(<ImageResource>resources[1], 32 * 5, 32 * 2);
    let tileSand = new Tile(<ImageResource>resources[1], 32 * 9, 32 * 2);

    let autoTileTemplate: ImageResource = AutoTileHelper.extractAutoTileTemplate(new ImagePart(<ImageResource>resources[0], 64 * 2, 0));
    // Canvas.fromImageResource(autoTileTemplate).append(document.body);


    let grassAlphaMapJunction = new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[4], 0, 0)), 0, 0);
    let grassUnderLayerJunction = new ImagePart(<ImageResource>resources[5], 0, 0);


    let autoTileGrass = AutoTileHelper.generateAutoTileFromJunctionTemplates(
      tileGrass, grassAlphaMapJunction, grassUnderLayerJunction
    );

    let autoTileRock = AutoTileHelper.generateAutoTileFromJunctionTemplates(
      tileRock, grassAlphaMapJunction, grassUnderLayerJunction
    );

    let autoTileSand = AutoTileHelper.generateAutoTileFromJunctionTemplates(
      tileSand, grassAlphaMapJunction, grassUnderLayerJunction
    );

    [autoTileRock, autoTileGrass, autoTileSand].forEach((autoTile: AutoTile, index: number) => { autoTile.zIndex = index; });

    Canvas.fromImageResource(autoTileGrass.image).append(document.body);
    // Canvas.fromImageResource(autoTileGrass.toTemplate()).append(document.body);
    // Canvas.fromImageResource(autoTileRock.toTemplate()).append(document.body);
    // Canvas.fromImageResource(autoTileSand.toTemplate()).append(document.body);
    // Canvas.fromImageResource(autoTileGrass.toTemplate(true)).append(document.body);


    Canvas.fromImageResource(AutoTileHelper.buildTile([
      autoTileGrass, autoTileRock,
      autoTileSand, autoTileGrass
    ])).append(document.body);


    // audioTest(<AudioResource>resources[7]);
  });

});




