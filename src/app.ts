import { Canvas } from './classes/canvas.class';
import { SortedArray } from './classes/sortedArray.class';
import { ImageResource } from './classes/resources/imageResource.class';
import { ResourceLoader } from './classes/resources/resourceLoader.class';
import { AsyncResource } from './classes/resources/asyncResource.class';
import { AudioResource } from './classes/resources/audioResource.class';
import { ImageDataHelper, Compositing } from './classes/imageDataHelper.class';
import { DeepMap } from './classes/deepMap.class';
import { EventObject, EventListener } from './classes/events.class';

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
//
//   // a += ((i & 1) === 1) ? 1 : 0; // 5133
//   // a += ((i & 1) === 1) | 0; // 5785
//   // a += +((i & 1) === 1); // 8011
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
  public hasTransparencyCached: boolean = true;

  constructor(
    public image: ImageResource,
    public sx: number,
    public sy: number
  ) {}

  hasTransparency(): boolean {
    let canvas = new Canvas(Tile.width, Tile.height);
    canvas.putImageResource(this.image, this.sx, this.sy, Tile.width, Tile.height, 0, 0);
    return ImageDataHelper.hasTransparency(canvas.getImageData());
  }

  verifyTransparency(): this {
    this.hasTransparencyCached = this.hasTransparency();
    return this;
  }

}


export class Tile {
  static width: number  = 32;
  static height: number = 32;
  static halfWidth: number  = Tile.width / 2;
  static halfHeight: number = Tile.height / 2;
  static twoWidth: number  = Tile.width * 2;
  static twoHeight: number = Tile.height * 2;

  constructor(public imagePart: ImagePart) {}

  // deprecated
  draw(canvas: Canvas, dx: number, dy: number, inverted: boolean = false) {
    if(inverted) {
      for(let y = 0; y < 2; y++) {
        for(let x = 0; x < 2; x++) {
          canvas.putImageResource(
            this.imagePart.image,
            this.imagePart.sx + x * Tile.halfWidth, this.imagePart.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
            dx + Tile.halfWidth - (x * Tile.halfWidth), dy + Tile.halfHeight - (y * Tile.halfHeight)
          );
        }
      }
    } else {
      canvas.putImageResource(
        this.imagePart.image,
        this.imagePart.sx, this.imagePart.sy, Tile.width, Tile.height,
        dx, dy
      );
    }
  }

}


/**
 * A template is a 64x64 image which contains alphaMap, overLayer and/or underLayer
 *
 * It helps to build AutoTile
 */
export class AutoTileTemplate  {

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

  public junctionAutoTileCache: Map<Tile, JunctionAutoTile> = new Map<Tile, JunctionAutoTile>();

  constructor(
    public alphaMap?: ImagePart,
    public underLayer?: ImagePart,
    public overLayer?: ImagePart
  ) {}

  /**
   * Build and return an AutoTile
   */
  toAutoTile(tile: Tile): AutoTile {
    return new AutoTile(new ImagePart(this.buildAutoTile(tile), 0, 0));
  }

  /**
   * Build and return a JunctionAutoTile
   */
  toJunctionAutoTile(tile: Tile, zIndex?: number): JunctionAutoTile {
    let junctionAutoTile: JunctionAutoTile = this.junctionAutoTileCache.get(tile);
    if(!junctionAutoTile) {
      junctionAutoTile = new JunctionAutoTile(new ImagePart(this.buildAutoTile(tile), 0, 0), zIndex);
      this.junctionAutoTileCache.set(tile, junctionAutoTile);
    }
    return junctionAutoTile;
  }

  /**
   * Build an AutoTile from this template
   */
  buildAutoTile(tile: Tile): ImageResource {
    let flattenedImage = this.flatten(tile);

    let canvas = new Canvas(Tile.halfWidth * 20, Tile.halfHeight);
    for(let y = 0; y < 4; y++) {
      for(let x = 0; x < 4; x++) {
        canvas.putImageResource(
          flattenedImage,
          x * Tile.halfWidth, y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          Math.floor(AutoTileTemplate.templateToAutoTileIndexes[x + y * 4] * 1.25) * Tile.halfWidth, 0
        );
      }
    }

    for(let i = 0; i < 4; i++) {
      canvas.putImageResource(
        tile.imagePart.image,
        tile.imagePart.sx + (i % 2) * Tile.halfWidth, tile.imagePart.sy + Math.floor(i / 2) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
        (i * 5 + 4) * Tile.halfWidth, 0
      );
    }

    return canvas.toImageResource();
  }

  /**
   * Flatten all layers
   */
  flatten(tile: Tile): ImageResource {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        canvas.putImageResource(
          tile.imagePart.image,
          tile.imagePart.sx, tile.imagePart.sy, Tile.width, Tile.width,
          x * Tile.width, y * Tile.height
        );
      }
    }

    if(this.alphaMap) {
      canvas.ctx.globalCompositeOperation = 'destination-in';
      canvas.ctx.drawImage(this.alphaMap.image.resource, 0, 0);
    }

    if(this.underLayer) {
      canvas.ctx.globalCompositeOperation = 'destination-over';
      canvas.ctx.drawImage(this.underLayer.image.resource, 0, 0);
    }

    if(this.overLayer) {
      canvas.ctx.globalCompositeOperation = 'source-over';
      canvas.ctx.drawImage(this.overLayer.image.resource, 0, 0);
    }

    return canvas.toImageResource();
  }

}


export class BorderAutoTileTemplate {
  constructor(
    public top: AutoTileTemplate,
    public bottom?: AutoTileTemplate
  ) {}

  /**
   * Apply border pattern to a Tile
   */
  buildTop(tile: Tile): JunctionAutoTile {
    return this.top.toJunctionAutoTile(tile);
  }

}


export class AutoTile  {
  static autoTileToTemplateIndexes: number[] =
    AutoTileTemplate.templateToAutoTileIndexes.map((value: number, index: number) => AutoTileTemplate.templateToAutoTileIndexes.indexOf(index));

  static autoTileToTemplateInvertedIndexes: number[] =
    AutoTileTemplate.templateInvertedToAutoTileIndexes.map((value: number, index: number) => AutoTileTemplate.templateInvertedToAutoTileIndexes.indexOf(index));

  constructor(public imagePart: ImagePart) {}

  preview(inverted: boolean = false): ImageResource {
    let canvas: Canvas = new Canvas(64, 64);
    for(let i = 0; i < 16; i++) {
      let j = inverted ? AutoTile.autoTileToTemplateInvertedIndexes[i] : AutoTile.autoTileToTemplateIndexes[i];
      canvas.putImageResource(
        this.imagePart.image,
        this.imagePart.sx + Math.floor(i * 1.25) * Tile.halfWidth, this.imagePart.sy, Tile.halfWidth, Tile.halfHeight,
        (j % 4) * Tile.halfWidth, Math.floor(j / 4) * Tile.halfHeight
      );
    }
    return canvas.toImageResource();
  }

}

export class JunctionAutoTile extends AutoTile {
  static compare(a: JunctionAutoTile, b: JunctionAutoTile) {
    if(a.zIndex < b.zIndex) return -1;
    if(a.zIndex > b.zIndex) return 1;
    return 0;
  }

  // not used
  static cachedCreate = new DeepMap<JunctionAutoTile>()
  static create(imagePart: ImagePart, zIndex: number = 0) {
    let junction: JunctionAutoTile = JunctionAutoTile.cachedCreate.get([imagePart]);
    if(!junction) {
      junction = new JunctionAutoTile(imagePart, zIndex);
      JunctionAutoTile.cachedCreate.set([imagePart], junction);
    }
    return junction;
  }

  constructor(
    imagePart: ImagePart,
    public zIndex: number = 0
  ) {
    super(imagePart);
  }
}

export class AutoBlock {

  constructor(
    public topJunction: JunctionAutoTile,
    public border: BorderAutoTileTemplate
  ) {}
}




export class AutoTileHelper {

  /**
   * Convert an  2x3 tiles autoTile into a 2x2
   */
  static extractAutoTileTemplate(imagePart: ImagePart): ImageResource {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    canvas.putImageResource(
      imagePart.image,
      imagePart.sx, imagePart.sy + Tile.width, Tile.twoWidth, Tile.twoHeight
    );
    // canvas.ctx.drawImage(
    //   imagePart.image.resource,
    //   imagePart.sx, imagePart.sy + Tile.width, Tile.twoWidth, Tile.twoHeight,
    //   0, 0, Tile.twoWidth, Tile.twoHeight
    // );

    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        canvas.putImageResource(
          imagePart.image,
          imagePart.sx + Tile.width + x * Tile.halfWidth, imagePart.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          Tile.width - (x * Tile.halfWidth), Tile.height - (y * Tile.halfHeight)
        );
        // canvas.ctx.drawImage(
        //   imagePart.image.resource,
        //   imagePart.sx + Tile.width + x * Tile.halfWidth, imagePart.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
        //   Tile.width - (x * Tile.halfWidth), Tile.height - (y * Tile.halfHeight), Tile.halfWidth, Tile.halfHeight
        // );
      }
    }

    return canvas.toImageResource();
  }

  /**
   * Convert an  2x5 tiles autoTile into a 2x4
   */
  static extractAutoBorderTileTemplate(imagePart: ImagePart): ImageResource {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoWidth * 2);

    canvas.putImageResource(
      AutoTileHelper.extractAutoTileTemplate(imagePart),
      0, 0, Tile.twoWidth, Tile.twoHeight
    );

    canvas.putImageResource(
      imagePart.image,
      imagePart.sx, imagePart.sy + Tile.height * 3, Tile.twoWidth, Tile.twoHeight,
      0, Tile.twoHeight
    );

    return canvas.toImageResource();
  }


  /**
   * Convert an rgb alphaMap to a alpha chanel alphaMap
   */
  static shadesOfGreyToAlphaMap(imagePart: ImagePart): ImageResource {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    canvas.putImageResource(
      imagePart.image,
      imagePart.sx, imagePart.sy, Tile.twoWidth, Tile.twoHeight
    );

    let imageData: ImageData = canvas.getImageData();
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = (imageData.data[i + 0] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      imageData.data[i    ] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
    }
    let imageResource: ImageResource = new ImageResource();
    imageResource.imageData = imageData;
    return imageResource;
  }


  static invertTile(tile: Tile): ImageResource {
    let canvas = new Canvas(Tile.width, Tile.height);
    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        canvas.putImageResource(
          tile.imagePart.image,
          tile.imagePart.sx + x * Tile.halfWidth, tile.imagePart.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          Tile.halfWidth - (x * Tile.halfWidth), Tile.halfHeight - (y * Tile.halfHeight)
        );
      }
    }
    return canvas.toImageResource();
  }

  // topLeftAutoTile: AutoTile, topRightAutoTile: AutoTile, bottomLeftAutoTile: AutoTile, bottomRightAutoTile: AutoTile
  static buildTileCache = new DeepMap<ImageResource>();
  static buildTile(autoTiles: [JunctionAutoTile, JunctionAutoTile, JunctionAutoTile, JunctionAutoTile]): ImageResource {
    let imageResource: ImageResource = AutoTileHelper.buildTileCache.get(autoTiles);
    if(imageResource) { return imageResource; }

    let canvas = new Canvas(Tile.width, Tile.height);

    let ordered: SortedArray<AutoTile> = new SortedArray<AutoTile>(JunctionAutoTile.compare);
    let autoTile: AutoTile;

    for(let i = 0; i < autoTiles.length; i++) {
      autoTile = autoTiles[i];
      if(autoTile !== null) {
        ordered.insertUnique(autoTile);
      }
    }

    let i: number,
      a: number, b: number, c: number,
      offset: number, index: number;
    let orderedAutoTile: AutoTile;

    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        i = x + y * 2;
        autoTile = autoTiles[i];
        if(autoTile !== null) {
          a = i ^ 0b11;
          offset = 5 * a;

          let j = autoTile.imagePart.hasTransparencyCached ? 0 : ordered.indexOf(autoTile);
          for(let length = ordered.array.length; j < length; j++) {
            orderedAutoTile = ordered.array[j];
            if(orderedAutoTile === autoTile) {
              index = 4;
            } else {
              b = (i & 0b10) | ((i & 0b01) ^ 0b01);
              c = (i & 0b01) | ((i & 0b10) ^ 0b10);

              index =
                ((autoTiles[a] === orderedAutoTile) ? 0b100 : 0b000) |
                ((autoTiles[b] === orderedAutoTile) ? 0b010 : 0b000) |
                ((autoTiles[c] === orderedAutoTile) ? 0b001 : 0b000);

              if(index === 0b000) {
                continue;
              } else {
                index &= 0b011;
              }
            }

            canvas.ctx.drawImage(
              orderedAutoTile.imagePart.image.resource,
              orderedAutoTile.imagePart.sx + (index + offset) * Tile.halfWidth, orderedAutoTile.imagePart.sy, Tile.halfWidth, Tile.halfHeight,
              x * Tile.halfWidth, y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
            );
          }
        }
      }
    }

    // let imageResource: ImageResource = new ImageResource();
    // imageResource.imageData = canvas.getImageData();
    imageResource = canvas.toImageResource();
    // debugger;

    AutoTileHelper.buildTileCache.set(autoTiles, imageResource);
    return imageResource;
  }


  static buildBlock(autoBlocks: AutoBlock[]): ImageResource {
    // let tileImage = AutoTileHelper.buildTile([autoBlocks[0].topJunction, autoBlocks[1].topJunction, autoBlocks[2].topJunction, autoBlocks[3].topJunction]);
    let tileImage = AutoTileHelper.buildTile(autoBlocks.map((autoBlock) => {
      return autoBlock ? autoBlock.topJunction : null;
    }));

    tileImage = AutoTileHelper.invertTile(new Tile(new ImagePart(tileImage, 0, 0)));
    let tile = new Tile(new ImagePart(tileImage, 0, 0));

    // let autoTile: JunctionAutoTile = autoBlocks[0].border.buildTop(tile);
    // return autoTile.preview();

    // Canvas.fromImageResource(tileImage).append();
    // Canvas.fromImageResource(autoBlocks[0].border.buildTop(tile).imagePart.image).append();
    // Canvas.fromImageResource(autoBlocks[0].border.buildTop(tile).preview()).append();

    // let borderedImage = AutoTileHelper.buildTile([
    //   autoBlocks[0].border.buildTop(tile),
    //   autoBlocks[1].border.buildTop(tile),
    //   autoBlocks[2].border.buildTop(tile),
    //   autoBlocks[3].border.buildTop(tile)
    // ]);

    let borderedImage = AutoTileHelper.buildTile(autoBlocks.map((autoBlock) => {
      return autoBlock ? autoBlock.border.buildTop(tile) : null;
    }));

    return borderedImage;
  }
}


window.addEventListener('load', () => {
  const renderer = new Renderer();

  // document.body.addEventListener('click', () => Renderer.openImagesSelection((images: ImageResource[]) => {
  //   let canvas = Canvas.fromImageResource(images[0]);
  //   canvas.cut();
  // }));


  let randomMapBuilder = (autoTiles: AutoTile[], width: number = 10, height: number = 10): AutoTile[][] => {
    let map: AutoTile[][] = [];
    for(let y = 0; y < height; y++) {
      map[y] = [];
      for(let x = 0; x < width; x++) {
        map[y][x] = autoTiles[Math.floor(Math.random() * autoTiles.length)];
      }
    }
    return map;
  };

  let randomBlockMapBuilder = (autoBlock: AutoBlock[], width: number = 10, height: number = 10): AutoBlock[][] => {
    let map: AutoBlock[][] = [];
    for(let y = 0; y < height; y++) {
      map[y] = [];
      for(let x = 0; x < width; x++) {
        map[y][x] = autoBlock[Math.floor(Math.random() * autoBlock.length)];
      }
    }
    return map;
  };

  let drawMap = (map: JunctionAutoTile[][]) => {
    // console.log(map);

    let canvas = new Canvas((map[0].length - 1) * Tile.width, (map.length - 1) * Tile.height);

    let xMap: JunctionAutoTile[];
    for(let y = 0; y < map.length - 1; y++) {
      xMap = map[y];
      for(let x = 0; x < xMap.length - 1; x++) {
        // setTimeout(() => {
          canvas.putImageResource(AutoTileHelper.buildTile([
            map[y    ][x], map[y    ][x + 1],
            map[y + 1][x], map[y + 1][x + 1]
          ]), 0, 0, Tile.width, Tile.width, x * Tile.width, y * Tile.height);
        // }, Math.floor(Math.random() * map.length * xMap.length));
      }
    }

    return canvas;
  };

  let drawBlockMap = (map: AutoBlock[][]) => {
    let canvas = new Canvas((map[0].length - 1) * Tile.width, (map.length - 1) * Tile.height);

    let xMap: AutoBlock[];
    for(let y = 0; y < map.length - 1; y++) {
      xMap = map[y];
      for(let x = 0; x < xMap.length - 1; x++) {
        // setTimeout(() => {
        canvas.putImageResource(AutoTileHelper.buildBlock([
          map[y    ][x], map[y    ][x + 1],
          map[y + 1][x], map[y + 1][x + 1]
        ]), 0, 0, Tile.width, Tile.width, x * Tile.width, y * Tile.height);
        // }, Math.floor(Math.random() * map.length * xMap.length));
      }
    }

    return canvas;
  };

  let compositionTest = () => {
    ResourceLoader.loadMany([
      ['./assets/images/other/source.png'],
      ['./assets/images/other/destination.png']
    ]).then((resources: ImageResource[]) => {
      let applyFilter = (filterName: string, source: ImageResource, destination: ImageResource) => {
        let x = 0;
        let y = 0;
        let filter = Compositing.get(filterName);
        let copy = ImageDataHelper.copy(destination.imageData);
        let canvas_0 = Canvas.fromImageResource(
          ImageResource.fromImageData(
            Compositing.apply(filter, source.imageData, copy, void 0, void 0, void 0, void 0, x, y)
            // Compositing.SIMDSourceOver(source.imageData, copy)
          )
        ).append(document.body);

        Compositing.initWorker(4, './classes/imageData.worker.js');
        Compositing.workerApply((sourceImageData: ImageData, destinationImageData: ImageData) => {
          Canvas.fromImageResource(
            ImageResource.fromImageData(destinationImageData)
          ).append(document.body);
        }, filterName, ImageDataHelper.copy(source.imageData), ImageDataHelper.copy(copy), void 0, void 0, void 0, void 0, x, y);


        let promises: Promise<any>[] = [];
        let t1 = Date.now();
        for(let i = 0; i < 100; i++) {
          // Compositing.apply(filter, source.imageData, copy);
          // Compositing.SIMDSourceOver(source.imageData, copy);

          promises.push(new Promise((resolve:any, reject:any) => {
            Compositing.workerApply((sourceImageData: ImageData, destinationImageData: ImageData) => {
              resolve();
            }, filterName, ImageDataHelper.copy(source.imageData), ImageDataHelper.copy(copy), void 0, void 0, void 0, void 0, x, y);
          }));
        }
        Promise.all(promises).then(() => {
          let t2 = Date.now();
          console.log('IMAGEDATA TIME', t2 - t1);
        });
        let t2 = Date.now();
        console.log('IMAGEDATA TIME', t2 - t1);
        return;

        let canvas_1 = new Canvas(source.width, source.height);
        canvas_1.ctx.drawImage(destination.resource, 0, 0);
        canvas_1.ctx.globalCompositeOperation = filterName;
        canvas_1.ctx.drawImage(source.resource, x, y);
        canvas_1.append(document.body);

        ImageDataHelper.distance(canvas_0.getImageData(), canvas_1.getImageData());

        canvas_1.ctx.globalCompositeOperation = filterName;
        t1 = Date.now();
        for(let i = 0; i < 100; i++) {
          canvas_1.ctx.drawImage(source.resource, 0, 0);
        }
        t2 = Date.now();
        console.log('CANVAS TIME', t2 - t1);
      };

      [
        'source-over',
        // 'destination-over',
        // 'source-in',
        // 'destination-in',
        // 'source-out',
        // 'destination-out',
        // 'source-atop',
        // 'destination-atop',
        // 'xor',
        // 'lighter',
      ].forEach((filterName: string) => {
        console.log(filterName);
        applyFilter(filterName, resources[1], resources[0]);
        // applyFilter(filterName, resources[0], resources[1]);
        // applyFilter(filterName, resources[0], resources[0]);
      });
    });
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

  // return compositionTest();

  ResourceLoader.loadMany([
    ['./assets/images/originals/01.png'],
    ['./assets/images/originals/02.png'],
    ['./assets/images/originals/03.png'],
    ['./assets/images/originals/04.png'],
    ['./assets/images/templates/junctions/grass/grass_alpha_map.png'],
    ['./assets/images/templates/junctions/grass/grass_under_layer.png'],
    ['./assets/images/templates/junctions/sand/sand_alpha_map.png'],
    ['./assets/images/templates/borders/mountain/mountain_alpha_map.png'],
    ['./assets/images/templates/borders/mountain/mountain_over_layer.png'],
    ['./assets/sounds/sample.ogg', './assets/sounds/field_01.mp3'],
    ['./assets/sounds/005-Rain01.mp3'],
    ['./assets/images/templates/borders/mountain/mountain_01_alpha_map.png'],
    ['./assets/images/templates/borders/mountain/mountain_01_over_layer.png']
  ], (index: number, total: number, resource: AsyncResource) => {
    console.log(Math.round((index + 1) / total * 100 ) + '%', resource.resource.src);
  }).then((resources: AsyncResource[]) => {
    let global: any = {};
    (<any>window).glob = global;

    // let audio = new AudioResource();
    // audio.loadData('./assets/sounds/field_01.mp3');
    // return;

    // let autoTileTemplate: ImageResource = AutoTileHelper.extractAutoTileTemplate(new ImagePart(<ImageResource>resources[0], 64 * 2, 0));
    // Canvas.fromImageResource(autoTileTemplate).append(document.body);

    // let borderAutoTileTemplate: ImageResource = AutoTileHelper.extractAutoBorderTileTemplate(new ImagePart(<ImageResource>resources[3], 64, 10 * 32));
    // Canvas.fromImageResource(borderAutoTileTemplate).append(document.body);


    /** GET BASIC BRICKS **/
    let tiles: { [key:string]: Tile } = {
      grass_0: new Tile(new ImagePart(<ImageResource>resources[1], 32 * 6, 32 * 2).verifyTransparency()),
      rock_0: new Tile(new ImagePart(<ImageResource>resources[1], 32 * 5, 32 * 2).verifyTransparency()),
      sand_0: new Tile(new ImagePart(<ImageResource>resources[1], 32 * 9, 32 * 2).verifyTransparency()),
      sand_1: new Tile(new ImagePart(<ImageResource>resources[0], 0, 96 * 2).verifyTransparency()),
      earth_0: new Tile(new ImagePart(<ImageResource>resources[1], 32 * 10, 32 * 2).verifyTransparency())
    };

    let alphaMaps: { [key:string]: ImagePart } = {
      grass: new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[4], 0, 0)), 0, 0),
      sand: new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[6], 0, 0)), 0, 0),
      mountain_01: new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[11], 0, 0)), 0, 0),
      mountain_02: new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[7], 0, 0)), 0, 0)
    };

    let underLayers: { [key:string]: ImagePart } = {
      grass: new ImagePart(<ImageResource>resources[5], 0, 0),
      sand:  new ImagePart(ImageResource.fromImageData(ImageDataHelper.changeOpacity(ImageDataHelper.copy(alphaMaps['sand'].image.imageData), 0.6)), 0, 0)
    };

    let overLayers: { [key:string]: ImagePart } = {
      mountain_01_top: new ImagePart(<ImageResource>resources[12], 0, 0),
      mountain_01_bot: new ImagePart(<ImageResource>resources[12], 0, 64),
    };


    /** GET AUTO TILES TEMPLATES **/
    let autoTileTemplates: { [key:string]: AutoTileTemplate } = {
      grass: new AutoTileTemplate(alphaMaps['grass'], underLayers['grass']),
      sand: new AutoTileTemplate(alphaMaps['sand'], underLayers['sand']),
      mountain_01_top: new AutoTileTemplate(alphaMaps['mountain_01'], null, overLayers['mountain_01_top']),
      mountain_02_top: new AutoTileTemplate(alphaMaps['mountain_01'], null, overLayers['mountain_01_top']),
    };


    /** GET JUNCTION AUTO TILES **/
    let junctionAutoTiles: { [key:string]: JunctionAutoTile } = {
      sand_0: autoTileTemplates['sand'].toJunctionAutoTile(tiles['sand_0']),
      sand_1: autoTileTemplates['sand'].toJunctionAutoTile(tiles['sand_1']),
      grass_0: autoTileTemplates['grass'].toJunctionAutoTile(tiles['grass_0']),
      rock_0: autoTileTemplates['grass'].toJunctionAutoTile(tiles['rock_0']),
      earth_0: autoTileTemplates['grass'].toJunctionAutoTile(tiles['earth_0'])
    };

    [junctionAutoTiles['rock_0'], junctionAutoTiles['earth_0'], junctionAutoTiles['sand_0'], junctionAutoTiles['sand_1'], junctionAutoTiles['grass_0']]
      .forEach((autoTile: JunctionAutoTile, index: number) => { autoTile.zIndex = index; });


    // Canvas.fromImageResource(junctionAutoTiles['grass_0'].preview(true)).append();

    let borderAutoTileTemplates: { [key:string]: BorderAutoTileTemplate } = {
      mountain_01: new BorderAutoTileTemplate(autoTileTemplates['mountain_01_top']),
      mountain_02: new BorderAutoTileTemplate(autoTileTemplates['mountain_02_top'])
    };

    let autoBlocks: { [key:string]: AutoBlock } = {
      sand_01: new AutoBlock(junctionAutoTiles['sand_0'], borderAutoTileTemplates['mountain_01']),
      grass_01: new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01'])
    };


    Canvas.fromImageResource(borderAutoTileTemplates['mountain_01'].buildTop(tiles['grass_0']).preview(false)).append();

    // let map = randomBlockMapBuilder([autoBlocks['sand_01'], autoBlocks['grass_01'], null], 10, 10);
    // console.log(map);

    let map = [
      [
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01'])
      ],
      [
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
        new AutoBlock(junctionAutoTiles['sand_0'], borderAutoTileTemplates['mountain_01']),
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01'])
      ],
      [
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
        new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01'])
      ]
    ];

    // let map = [
    //   [
    //     null, null, null
    //   ],
    //   [
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_02']),
    //     new AutoBlock(junctionAutoTiles['sand_0'], borderAutoTileTemplates['mountain_01']),
    //     null
    //   ],
    //   [
    //     null, null, null
    //   ]
    // ];

    let t1 = performance.now();
    let rendered = drawBlockMap(map);
    let t2 = performance.now();
    console.log(t2 - t1);
    rendered.append(document.body);

    return;


    /** GENERATE MAP **/
    let map = randomMapBuilder(
      [junctionAutoTiles['rock_0'], junctionAutoTiles['sand_0'], junctionAutoTiles['sand_1'], junctionAutoTiles['grass_0'], junctionAutoTiles['earth_0']],
      100, 100
    );


    let t1 = performance.now();
    let rendered = drawMap(map);
    let t2 = performance.now();
    console.log(t2 - t1);
    rendered.append(document.body);





  });

});




