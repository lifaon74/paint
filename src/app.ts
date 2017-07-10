import { Canvas, ImageRendering } from './classes/canvas.class';
import { SortedArray } from './classes/sortedArray.class';
import { ImageResource } from './classes/resources/imageResource.class';
import { ResourceLoader, ResourceDescriptor } from './classes/resources/resourceLoader.class';
import { AsyncResource } from './classes/resources/asyncResource.class';
import { AudioResource } from './classes/resources/audioResource.class';
import { ImageDataHelper, Compositing } from './classes/imageDataHelper.class';
import { DeepMap, Memoize } from './classes/deepMap.class';

import { PromiseFactory, PromisePool } from './classes/promisePool.class';



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
    input.addEventListener('change', () => {
      onFilesCallback(input.files);
    });
    input.click();
  }

  static readFile(file: File, readAs: ReadAsType = ReadAsType.arrayBuffer): Promise<string> {
    return new Promise((resolve:any, reject:any) => {
      let reader = new FileReader();
      reader.addEventListener('load', () => {
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

  /**
   * Switch index (1, 1) with (2, 2) and (1, 2) with (2, 1)
   * @returns {ImageResource}
   */
  async invert(): Promise<ImageResource> {
    let canvas = new Canvas(Tile.width, Tile.height);
    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        await canvas.putImageResource(
          this.imagePart.image,
          this.imagePart.sx + x * Tile.halfWidth, this.imagePart.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          Tile.halfWidth - (x * Tile.halfWidth), Tile.halfHeight - (y * Tile.halfHeight)
        );
      }
    }
    return canvas.toImageResource();
  }


  // deprecated
  async draw(canvas: Canvas, dx: number, dy: number, inverted: boolean = false) {
    if(inverted) {
      for(let y = 0; y < 2; y++) {
        for(let x = 0; x < 2; x++) {
          await canvas.putImageResource(
            this.imagePart.image,
            this.imagePart.sx + x * Tile.halfWidth, this.imagePart.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
            dx + Tile.halfWidth - (x * Tile.halfWidth), dy + Tile.halfHeight - (y * Tile.halfHeight)
          );
        }
      }
    } else {
      await canvas.putImageResource(
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

  constructor(
    public alphaMap?: ImagePart,
    public underLayer?: ImagePart,
    public overLayer?: ImagePart
  ) {}

  /**
   * Build and return an AutoTile
   */
  @Memoize()
  async toAutoTile(tile: Tile): Promise<AutoTile> {
    return new AutoTile(new ImagePart(await this.buildAutoTile(tile), 0, 0));
  }

  /**
   * Build and return a JunctionAutoTile
   */
  @Memoize()
  async toJunctionAutoTile(tile: Tile, zIndex?: number): Promise<JunctionAutoTile> {
    return new JunctionAutoTile(
      new ImagePart(await this.buildAutoTile(tile), 0, 0)
    , zIndex);
  }

  /**
   * Build an AutoTile from this template
   */
  async buildAutoTile(tile: Tile): Promise<ImageResource> {
    const flattenedImage = await this.flatten(tile);

    const canvas = new Canvas(Tile.halfWidth * 20, Tile.halfHeight);
    const promises: Promise<any>[] = [];

    for(let y = 0; y < 4; y++) {
      for(let x = 0; x < 4; x++) {
        promises.push(
          canvas.putImageResource(
            flattenedImage,
            x * Tile.halfWidth, y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
            Math.floor(AutoTileTemplate.templateToAutoTileIndexes[x + y * 4] * 1.25) * Tile.halfWidth, 0
          )
        );
      }
    }

    for(let i = 0; i < 4; i++) {
      promises.push(
        canvas.putImageResource(
          tile.imagePart.image,
          tile.imagePart.sx + (i % 2) * Tile.halfWidth, tile.imagePart.sy + Math.floor(i / 2) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          (i * 5 + 4) * Tile.halfWidth, 0
        )
      );
    }

    await Promise.all(promises);

    return canvas.toImageResource();
  }

  /**
   * Flatten all layers
   */
  async flatten(tile: Tile): Promise<ImageResource> {
    const canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    const promises: Promise<any>[] = [];
    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        promises.push(canvas.putImageResource(
          tile.imagePart.image,
          tile.imagePart.sx, tile.imagePart.sy, Tile.width, Tile.width,
          x * Tile.width, y * Tile.height
        ));
      }
    }
    await Promise.all(promises);

    if(this.alphaMap) {
      canvas.ctx.globalCompositeOperation = 'destination-in';
      await canvas.drawImage(this.alphaMap.image.resource, 0, 0);
    }

    if(this.underLayer) {
      canvas.ctx.globalCompositeOperation = 'destination-over';
      await canvas.drawImage(this.underLayer.image.resource, 0, 0);
    }

    if(this.overLayer) {
      canvas.ctx.globalCompositeOperation = 'source-over';
      await canvas.drawImage(this.overLayer.image.resource, 0, 0);
    }

    return canvas.toImageResource();
  }

}


export class BorderAutoTileTemplate {
  constructor(
    public top: AutoTileTemplate,
    public bottom: AutoTileTemplate
  ) {}

  /**
   * Apply border pattern to a Tile
   */
  @Memoize()
  async buildTop(tile: Tile): Promise<AutoTile> {
    return this.top.toAutoTile(tile);
  }

  @Memoize()
  async buildBottom(tile: Tile): Promise<AutoTile> {
    return this.bottom.toAutoTile(tile);
  }

}


export class AutoTile  {
  static autoTileToTemplateIndexes: number[];
  static autoTileToTemplateInvertedIndexes: number[];
  static autoTileBuildIndexes: Uint8Array;

  /**
   * tilePosition: 0bYX, neighbors: 0bDCBA (present/not present)
   * A, B
   * C, D
   */
  static getIndex(tilePosition: number, neighbors: number, allowInvalidNeighbors: boolean = false) {
    let a = tilePosition ^ 0b11; // a is the opposite of the current half Tile
    let offset = 5 * a;
    let index;

    if(!((neighbors >> tilePosition) & 0b1)) {
      if(allowInvalidNeighbors) {
        // return null;
        return offset + 0b100;
      } else {
        throw new Error(
          'Neighbors are incorrect with tilePosition :\n' +
            'tilePosition : 0b' + tilePosition.toString(2) +
            ', neighbors : 0b' + neighbors.toString(2)
        );
      }
    }

    let b = (tilePosition & 0b10) | ((tilePosition & 0b01) ^ 0b01);
    let c = (tilePosition & 0b01) | ((tilePosition & 0b10) ^ 0b10);

    index =
      (((neighbors >> b) & 0b1) << 1) |
      (((neighbors >> c) & 0b1) << 0);

    index ^= 0b11;

    if((index === 0b00) && ((neighbors >> a) & 0b1)) {
      index = 0b100;
    }

    // console.log(
    //   tilePosition.toString(2).padStart(2, '0'),
    //   neighbors.toString(2).padStart(4, '0'),
    //   b, c, index, offset
    // );

    return offset + index;
  }

  static initConstants() {
    this.autoTileToTemplateIndexes = AutoTileTemplate.templateToAutoTileIndexes.map(
      (value: number, index: number) => AutoTileTemplate.templateToAutoTileIndexes.indexOf(index)
    );

    this.autoTileToTemplateInvertedIndexes = AutoTileTemplate.templateInvertedToAutoTileIndexes.map(
      (value: number, index: number) => AutoTileTemplate.templateInvertedToAutoTileIndexes.indexOf(index)
    );

    this.autoTileBuildIndexes = new Uint8Array(64);
    for(let i = 0; i < this.autoTileBuildIndexes.length; i++) {
      this.autoTileBuildIndexes[i] = this.getIndex(i >> 4, i & 0b1111, true);
    }
  }

  constructor(public imagePart: ImagePart) {}

  async preview(inverted: boolean = false): Promise<ImageResource> {
    const canvas: Canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);
    const promises: Promise<any>[] = [];

    for(let i = 0; i < 16; i++) {
      let j = inverted ? AutoTile.autoTileToTemplateInvertedIndexes[i] : AutoTile.autoTileToTemplateIndexes[i];
      promises.push(
        canvas.putImageResource(
          this.imagePart.image,
          this.imagePart.sx + Math.floor(i * 1.25) * Tile.halfWidth, this.imagePart.sy, Tile.halfWidth, Tile.halfHeight,
          (j % 4) * Tile.halfWidth, Math.floor(j / 4) * Tile.halfHeight
        )
      );
    }
    await Promise.all(promises);
    // canvas.append();
    return canvas.toImageResource();
  }

}
AutoTile.initConstants();

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
  static async extractAutoTileTemplate(imagePart: ImagePart): Promise<ImageResource> {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    await canvas.putImageResource(
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
        await canvas.putImageResource(
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
  static async extractAutoBorderTileTemplate(imagePart: ImagePart): Promise<ImageResource> {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoWidth * 2);

    await canvas.putImageResource(
      await AutoTileHelper.extractAutoTileTemplate(imagePart),
      0, 0, Tile.twoWidth, Tile.twoHeight
    );

    await canvas.putImageResource(
      imagePart.image,
      imagePart.sx, imagePart.sy + Tile.height * 3, Tile.twoWidth, Tile.twoHeight,
      0, Tile.twoHeight
    );

    return canvas.toImageResource();
  }


  /**
   * Convert an rgb alphaMap to a alpha chanel alphaMap
   */
  static async shadesOfGreyToAlphaMap(imagePart: ImagePart): Promise<ImageResource> {
    const canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    await canvas.putImageResource(
      imagePart.image,
      imagePart.sx, imagePart.sy, Tile.twoWidth, Tile.twoHeight
    );

    const imageData: ImageData = canvas.getImageData();
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      imageData.data[i    ] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
    }
    const imageResource: ImageResource = new ImageResource();
    imageResource.imageData = imageData;
    return imageResource;
  }



  // topLeftAutoTile: AutoTile, topRightAutoTile: AutoTile, bottomLeftAutoTile: AutoTile, bottomRightAutoTile: AutoTile
  @Memoize({ destructure: true })
  static async buildJunctionTile(autoTiles: [JunctionAutoTile, JunctionAutoTile, JunctionAutoTile, JunctionAutoTile]): Promise<ImageResource> {
    const canvas = new Canvas(Tile.width, Tile.height);

    const orderedAutoTiles: SortedArray<AutoTile> = new SortedArray<AutoTile>(JunctionAutoTile.compare);
    let autoTile: AutoTile;

    for(let i = 0; i < autoTiles.length; i++) {
      autoTile = autoTiles[i];
      if(autoTile !== null) {
        orderedAutoTiles.insertUnique(autoTile);
      }
    }

    const promises: Promise<void>[] = [];
    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        promises.push(this._drawJunctionTile(canvas, x, y, autoTiles, orderedAutoTiles));
      }
    }
    await Promise.all(promises);

    return canvas.toImageResource();
  }

    static async _drawJunctionTile(canvas: Canvas, x: number, y: number, autoTiles: AutoTile[], orderedAutoTiles: SortedArray<AutoTile>): Promise<void> {
      let tilePosition = x + y * 2; // index of the current half Tile (ltr)
      let autoTile = autoTiles[tilePosition];

      let orderedAutoTile: AutoTile;
      let index: number;

      if(autoTile !== null) {
        let j = autoTile.imagePart.hasTransparencyCached ? 0 : orderedAutoTiles.indexOf(autoTile);
        let k = (tilePosition << 4);
        for(let length = orderedAutoTiles.array.length; j < length; j++) {
          orderedAutoTile = orderedAutoTiles.array[j];

          index = AutoTile.autoTileBuildIndexes[
            k |
            ((autoTiles[0] !== orderedAutoTile) << 0) |
            ((autoTiles[1] !== orderedAutoTile) << 1) |
            ((autoTiles[2] !== orderedAutoTile) << 2) |
            ((autoTiles[3] !== orderedAutoTile) << 3)
          ];

          // if(index === null) index = ((i ^ 0b11) * 5) + 0b100;

          await canvas.drawImage(
            orderedAutoTile.imagePart.image.resource,
            orderedAutoTile.imagePart.sx + index * Tile.halfWidth, orderedAutoTile.imagePart.sy, Tile.halfWidth, Tile.halfHeight,
            x * Tile.halfWidth, y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
          );
        }
      }
    }


  // static async buildJunctionTileOld(autoTiles: [JunctionAutoTile, JunctionAutoTile, JunctionAutoTile, JunctionAutoTile]): Promise<ImageResource> {
  //   const canvas = new Canvas(Tile.width, Tile.height);
  //
  //   const ordered: SortedArray<AutoTile> = new SortedArray<AutoTile>(JunctionAutoTile.compare);
  //   let autoTile: AutoTile;
  //
  //   for(let i = 0; i < autoTiles.length; i++) {
  //     autoTile = autoTiles[i];
  //     if(autoTile !== null) {
  //       ordered.insertUnique(autoTile);
  //     }
  //   }
  //
  //   let i: number, orderedAutoTile,
  //     a: number, b: number, c: number,
  //     offset: number, index: number;
  //
  //   for(let y = 0; y < 2; y++) {
  //     for(let x = 0; x < 2; x++) {
  //       i = x + y * 2;
  //       autoTile = autoTiles[i];
  //       if(autoTile !== null) {
  //         offset = 5 * i;
  //
  //         let j = autoTile.imagePart.hasTransparencyCached ? 0 : ordered.indexOf(autoTile);
  //         for(let length = ordered.array.length; j < length; j++) {
  //           orderedAutoTile = ordered.array[j];
  //           if(orderedAutoTile === autoTile) {
  //             index = 4;
  //           } else {
  //             b = (i & 0b10) | ((i & 0b01) ^ 0b01);
  //             c = (i & 0b01) | ((i & 0b10) ^ 0b10);
  //
  //             index =
  //               ((autoTiles[a] === orderedAutoTile) ? 0b100 : 0b000) |
  //               ((autoTiles[b] === orderedAutoTile) ? 0b010 : 0b000) |
  //               ((autoTiles[c] === orderedAutoTile) ? 0b001 : 0b000);
  //
  //             if(index === 0b000) {
  //               continue;
  //             } else {
  //               index &= 0b011;
  //             }
  //           }
  //
  //           await ImageResource.awaitLoaded(orderedAutoTile.imagePart.image.resource);
  //           canvas.ctx.drawImage(
  //             orderedAutoTile.imagePart.image.resource,
  //             orderedAutoTile.imagePart.sx + (index + offset) * Tile.halfWidth, orderedAutoTile.imagePart.sy, Tile.halfWidth, Tile.halfHeight,
  //             x * Tile.halfWidth, y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
  //           );
  //         }
  //       }
  //     }
  //
  //     let imageResource: ImageResource = canvas.toImageResource();
  //
  //     return imageResource;
  //   }
  //
  // }


  @Memoize({ destructure: true })
  static async buildBorderTile(autoTiles: [AutoTile, AutoTile, AutoTile, AutoTile], merge: boolean = false): Promise<ImageResource> {
    const canvas = new Canvas(Tile.width, Tile.height);

    const promises: Promise<void>[] = [];
    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        promises.push(this._drawBorderTile(canvas, x, y, autoTiles, merge));
      }
    }
    await Promise.all(promises);

    return canvas.toImageResource();
  }

    static async _drawBorderTile(canvas: Canvas, x: number, y: number, autoTiles: AutoTile[], merge: boolean): Promise<void> {
      let tilePosition = x + y * 2; // index of the current half Tile (ltr)
      let autoTile = autoTiles[tilePosition];
      let index: number;

      if(autoTile !== null) {
        let k = (tilePosition << 4);
        if(merge) {
          index = AutoTile.autoTileBuildIndexes[
            k |
            ((autoTiles[0] !== null) << 0) |
            ((autoTiles[1] !== null) << 1) |
            ((autoTiles[2] !== null) << 2) |
            ((autoTiles[3] !== null) << 3)
          ];
        } else {
          index = AutoTile.autoTileBuildIndexes[
            k |
            ((autoTiles[0] === autoTile) << 0) |
            ((autoTiles[1] === autoTile) << 1) |
            ((autoTiles[2] === autoTile) << 2) |
            ((autoTiles[3] === autoTile) << 3)
          ];
        }

        // if(index === null) index = ((i ^ 0b11) * 5) + 0b100;

        await canvas.drawImage(
          autoTile.imagePart.image.resource,
          autoTile.imagePart.sx + index * Tile.halfWidth, autoTile.imagePart.sy, Tile.halfWidth, Tile.halfHeight,
          x * Tile.halfWidth, y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
        );
      }
    }


  @Memoize({ destructure: true })
  static async buildBlock(autoBlocks: AutoBlock[]): Promise<ImageResource> {
    // const tileImage = await AutoTileHelper.buildTile([autoBlocks[0].topJunction, autoBlocks[1].topJunction, autoBlocks[2].topJunction, autoBlocks[3].topJunction]);
    const tileImage: ImageResource = await AutoTileHelper.buildJunctionTile(<any>autoBlocks.map((autoBlock: AutoBlock) => {
      return autoBlock ? autoBlock.topJunction : null;
    }));

    // (await Canvas.fromImageResource(tileImage)).append();

    let tile: Tile = await this._invertTileImage(tileImage);

    // (await Canvas.fromImageResource(tile.imagePart.image)).append();
    // (await Canvas.fromImageResource(await autoBlocks[0].border.top.flatten(tile))).append();

    // const autoTile: JunctionAutoTile = await autoBlocks[0].border.buildTop(tile);
    // (await Canvas.fromImageResource(await autoTile.preview())).append();

    // let borderedImage = AutoTileHelper.buildJunctionTile([
    //   autoBlocks[0].border.buildTop(tile),
    //   autoBlocks[1].border.buildTop(tile),
    //   autoBlocks[2].border.buildTop(tile),
    //   autoBlocks[3].border.buildTop(tile)
    // ]);

    const borders: any = await Promise.all(
      autoBlocks.map(async function(autoBlock: AutoBlock) {
        return autoBlock ? (await autoBlock.border.buildTop(tile)) : null;
      })
    );


    // await Promise.all(borders.map(async function(b: any) {
    //   // return (await Canvas.fromImageResource(await b.preview())).append();
    //   return b ? (await Canvas.fromImageResource(b.imagePart.image)).append() : void 0;
    // }));

    // debugger;

    // console.log(borders);

    const borderedImage = await AutoTileHelper.buildBorderTile(borders, true);

    // (await Canvas.fromImageResource(borderedImage)).append();

    // document.body.appendChild(document.createElement('br'));
    // document.body.appendChild(document.createTextNode('---'));
    // document.body.appendChild(document.createElement('br'));

    return borderedImage;
  }

    @Memoize()
    static async _invertTileImage(tileImage: ImageResource): Promise<Tile> {
      return new Tile(new ImagePart(
        await new Tile(
          new ImagePart(tileImage, 0, 0)
        ).invert()
        , 0, 0));
    }

}


window.addEventListener('load', () => {
  const renderer = new Renderer();
  return;
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

  let randomBlockMapBuilder = (autoBlock: AutoBlock[], x: number = 10, y: number = 10, z: number = 1, nullBorders: boolean = true): AutoBlock[][][] => {
    if(nullBorders) {
      x += 2;
      y += 2;
    }

    let map: AutoBlock[][][] = [];
    for(let _z = 0; _z < z; _z++) {
      map[_z] = [];
      for(let _y = 0; _y < y; _y++) {
        map[_z][_y] = [];
        for(let _x = 0; _x < x; _x++) {
          if(nullBorders && ((_x === 0) || (_x === (x - 1)) || (_y === 0) || (_y === (y - 1)))) {
            map[_z][_y][_x] = null;
          } else {
            map[_z][_y][_x] = autoBlock[Math.floor(Math.random() * autoBlock.length)];
          }
        }
      }
    }
    return map;
  };

  let drawMap = async function(map: JunctionAutoTile[][]) {
    // console.log(map);

    let canvas = new Canvas((map[0].length - 1) * Tile.width, (map.length - 1) * Tile.height);

    let xMap: JunctionAutoTile[];
    let tile: ImageResource;
    for(let y = 0; y < map.length - 1; y++) {
      xMap = map[y];
      for(let x = 0; x < xMap.length - 1; x++) {
        // setTimeout(() => {
        tile = await AutoTileHelper.buildJunctionTile([
          map[y    ][x], map[y    ][x + 1],
          map[y + 1][x], map[y + 1][x + 1]
        ]);

        await canvas.putImageResource(tile, 0, 0, Tile.width, Tile.width, x * Tile.width, y * Tile.height);
        // }, Math.floor(Math.random() * map.length * xMap.length));
      }
    }

    return canvas;
  };

  let drawBlockMapSync = async function(map: AutoBlock[][][]) {
    const canvas = new Canvas((map[0][0].length - 1) * Tile.width, (map[0].length - 1) * Tile.height);

    let xMap: AutoBlock[], yMap: AutoBlock[][];
    for(let z = 0; z < map.length; z++) {
      yMap = map[z];
      for(let y = 0; y < yMap.length - 1; y++) {
        xMap = yMap[y];
        for(let x = 0; x < xMap.length - 1; x++) {
          await canvas.putImageResource(await AutoTileHelper.buildBlock([
            map[z][y    ][x], map[z][y    ][x + 1],
            map[z][y + 1][x], map[z][y + 1][x + 1]
          ]), 0, 0, Tile.width, Tile.width, x * Tile.width, y * Tile.height);
        }
      }
    }

    return canvas;
  };

  let drawBlockMap = async function(map: AutoBlock[][][]): Promise<Canvas> {
    return new Promise<any>((resolve: any, reject: any) => {
      const canvas = new Canvas((map[0][0].length - 1) * Tile.width, (map[0].length - 1) * Tile.height);
      // canvas.append();

      const pool = new PromisePool(256);

      let xMap: AutoBlock[], yMap: AutoBlock[][];
      for(let z = 0; z < map.length; z++) {
        yMap = map[z];
        for(let y = 0; y < yMap.length - 1; y++) {
          xMap = yMap[y];
          for(let x = 0; x < xMap.length - 1; x++) {
            pool.push(async function() {
              return canvas.putImageResource(await AutoTileHelper.buildBlock([
                map[z][y][x], map[z][y][x + 1],
                map[z][y + 1][x], map[z][y + 1][x + 1]
              ]), 0, 0, Tile.width, Tile.width, x * Tile.width, y * Tile.height);
            });
          }
        }
      }

      if(pool.isComplete()) {
        resolve(canvas);
      } else {
        pool.addEventListener('complete', () => {
          resolve(canvas);
        });
      }
    });
  };

  let compositionTest = async function() {
    return ResourceLoader.loadMany([
      new ResourceDescriptor('image', ['./assets/images/other/source.png']),
      new ResourceDescriptor('image', ['./assets/images/other/destination.png'])
    ]).then(async function(resources: ImageResource[]) {
      let applyFilter = async function(filterName: string, source: ImageResource, destination: ImageResource) {
        let x = 0;
        let y = 0;
        let filter = Compositing.get(filterName);
        let copy = ImageDataHelper.copy(destination.imageData);
        let canvas_0 = (await Canvas.fromImageResource(
          ImageResource.fromImageData(
            Compositing.apply(filter, source.imageData, copy, void 0, void 0, void 0, void 0, x, y)
            // Compositing.SIMDSourceOver(source.imageData, copy)
          )
        )).append(document.body);

        Compositing.initWorker(4, './classes/imageData.worker.js');
        Compositing.workerApply((sourceImageData: ImageData, destinationImageData: ImageData) => {
          Canvas.fromImageResource(
            ImageResource.fromImageData(destinationImageData)
          ).then((canvas: Canvas) => canvas.append(document.body));
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

        // let canvas_1 = new Canvas(source.width, source.height);
        // canvas_1.ctx.drawImage(destination.resource, 0, 0);
        // canvas_1.ctx.globalCompositeOperation = filterName;
        // canvas_1.ctx.drawImage(source.resource, x, y);
        // canvas_1.append(document.body);
        //
        // ImageDataHelper.distance(canvas_0.getImageData(), canvas_1.getImageData());
        //
        // canvas_1.ctx.globalCompositeOperation = filterName;
        // t1 = Date.now();
        // for(let i = 0; i < 100; i++) {
        //   canvas_1.ctx.drawImage(source.resource, 0, 0);
        // }
        // t2 = Date.now();
        // console.log('CANVAS TIME', t2 - t1);
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

  let memoryTest = () => {
    let memory1 = (<any>window.performance).memory.usedJSHeapSize;
    const images: HTMLImageElement[] = [];

    const canvas = new Canvas(200, 200);
    canvas.append();

    let promise: Promise<any> = Promise.resolve();
    for(let i = 0; i < 1000; i++) {
      promise = promise.then(() => {
        return new Promise((resolve: any, reject: any) => {
          const image = new Image();
          image.addEventListener('load', () => {
            canvas.ctx.drawImage(image, 0, 0);
            resolve();
          }, <any>{ once: true });
          image.src = '/assets/images/other/destination.png?' + Math.random();
          // document.body.appendChild(image);
          images.push(image);
        });
      });

    }

    // window.images = images;

    promise.then(() => {
      let memory2 = (<any>window.performance).memory.usedJSHeapSize;
      console.log('memory: ', memory2 - memory1);
      console.log((<any>window.performance).memory);
      // (function(){var script=document.createElement('script');script.src='https://rawgit.com/paulirish/memory-stats.js/master/bookmarklet.js';document.head.appendChild(script);})()
    });

  };

  let autoTileBuildIndexesTest = async function (autoTile: AutoTile) {
    const canvas = new Canvas(16 * 64, 16);
    for(let i = 0; i < AutoTile.autoTileBuildIndexes.length; i++) {
      let j = AutoTile.autoTileBuildIndexes[i];
      if(j !== null) {
        console.log((<any>i.toString(2)).padStart(6, '0'), j);
        await canvas.drawImage(autoTile.imagePart.image.resource, j * 16, 0, 16, 16, i * 16, 0, 16, 16);
      }
    }
    canvas.append();
  };

  let imageResourceTest = () => {
    let a = new ImageResource();
    a.src = './assets/images/originals/01.png';
    let b = new ImageResource();
    let c = new ImageResource();
    let d = new Image();
    d.src = './assets/images/originals/02.png';

    b.resource = a.resource;
    c.resource = a.resource;

    if(a.src !== b.src) throw new Error('src differs');
    b.src = 'void';
    c.resource = d;

    console.log(a.src);
    // let b = a.resource;
    // a.src = 'test';
    (<any>window).a = a;
    (<any>window).b = b;
    (<any>window).c = c;
  };

  // return memoryTest();
  // return compositionTest();
  // return imageResourceTest();



  ResourceLoader.load([
    new ResourceDescriptor('image', ['./assets/images/originals/01.png']),
    new ResourceDescriptor('image', ['./assets/images/originals/02.png']),
    new ResourceDescriptor('image', ['./assets/images/originals/03.png']),
    new ResourceDescriptor('image', ['./assets/images/originals/04.png']),

    new ResourceDescriptor('image', ['./assets/images/templates/junctions/grass/grass_alpha_map.png']),
    new ResourceDescriptor('image', ['./assets/images/templates/junctions/grass/grass_under_layer.png']),
    new ResourceDescriptor('image', ['./assets/images/templates/junctions/sand/sand_alpha_map.png']),

    new ResourceDescriptor('image', ['./assets/images/templates/borders/mountain/mountain_01_tile.png']),
    new ResourceDescriptor('image', ['./assets/images/templates/borders/mountain/mountain_01_alpha_map.png']),
    new ResourceDescriptor('image', ['./assets/images/templates/borders/mountain/mountain_01_over_layer.png']),

    new ResourceDescriptor('audio', ['./assets/sounds/sample.ogg', './assets/sounds/field_01.mp3']),
    new ResourceDescriptor('audio', ['./assets/sounds/005-Rain01.mp3']) ,

  ], (loaded: number, total: number, resource: AsyncResource) => {
    console.log(Math.round(loaded / total * 100 ) + '%', resource.resource.src);
  }).then(async function(resources: AsyncResource[]) {
    let global: any = {};
    (<any>window).glob = global;

    // (await Canvas.fromImageResource(<ImageResource>resources[1])).cut(32*5, 64, 32, 32).append();
    // (await Canvas.fromImageResource(<ImageResource>resources[1])).cut(32*6, 64, 32, 32).append();
    // (await Canvas.fromImageResource(<ImageResource>resources[1])).cut(32*8, 64, 32, 32).append();
    // (await Canvas.fromImageResource(<ImageResource>resources[1])).cut(32*9, 64, 32, 32).append();
    // (await Canvas.fromImageResource(<ImageResource>resources[1])).cut(32*10, 64, 32, 32).append();
    //
    // return;

    // let audio = new AudioResource();
    // audio.loadData('./assets/sounds/field_01.mp3');
    // return;

    // let autoTileTemplate: ImageResource = AutoTileHelper.extractAutoTileTemplate(new ImagePart(<ImageResource>resources[0], 64 * 2, 0));
    // Canvas.fromImageResource(autoTileTemplate).append(document.body);

    // let borderAutoTileTemplate: ImageResource = await AutoTileHelper.extractAutoBorderTileTemplate(new ImagePart(<ImageResource>resources[3], 64 * 7, 10 * 32));
    // (await Canvas.fromImageResource(borderAutoTileTemplate)).append();

    // (await Canvas.fromImageResource(<ImageResource>resources[13])).cut(16, 64 + 16, 32, 32).append();
    //
    // return;


    /** GET BASIC BRICKS **/
    let tiles: { [key:string]: Tile } = {
      grass_0: new Tile(new ImagePart(<ImageResource>resources[1], 32 * 6, 32 * 2).verifyTransparency()),
      rock_0: new Tile(new ImagePart(<ImageResource>resources[1], 32 * 5, 32 * 2).verifyTransparency()),
      sand_0: new Tile(new ImagePart(new ImageResource('./assets/images/templates/floors/sand_01.png'), 0, 0).verifyTransparency()),
      sand_1: new Tile(new ImagePart(<ImageResource>resources[0], 0, 96 * 2).verifyTransparency()),
      earth_0: new Tile(new ImagePart(<ImageResource>resources[1], 32 * 10, 32 * 2).verifyTransparency()),
      mountain_01: new Tile(new ImagePart(<ImageResource>resources[7], 0, 0).verifyTransparency()),
      dirt_01: new Tile(new ImagePart(new ImageResource('./assets/images/templates/floors/dirt_01.png'), 0, 0).verifyTransparency()),
    };

    let alphaMaps: { [key:string]: ImagePart } = {
      grass: new ImagePart(await AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[4], 0, 0)), 0, 0),
      sand: new ImagePart(await AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[6], 0, 0)), 0, 0),
      mountain_01_top: new ImagePart(await AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[8], 0, 0)), 0, 0),
      mountain_01_bot: new ImagePart(await AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[8], 0, 64)), 0, 0),
    };

    let underLayers: { [key:string]: ImagePart } = {
      grass: new ImagePart(<ImageResource>resources[5], 0, 0),
      sand:  new ImagePart(ImageResource.fromImageData(ImageDataHelper.changeOpacity(ImageDataHelper.copy(alphaMaps['sand'].image.imageData), 0.6)), 0, 0)
    };

    let overLayers: { [key:string]: ImagePart } = {
      mountain_01_top: new ImagePart(<ImageResource>resources[9], 0, 0),
      mountain_01_bot: new ImagePart(<ImageResource>resources[9], 0, 64),
    };


    /** GET AUTO TILES TEMPLATES **/
    let autoTileTemplates: { [key:string]: AutoTileTemplate } = {
      grass: new AutoTileTemplate(alphaMaps['grass'], underLayers['grass']),
      sand: new AutoTileTemplate(alphaMaps['sand'], underLayers['sand']),
      mountain_01_top: new AutoTileTemplate(alphaMaps['mountain_01_top'], null, overLayers['mountain_01_top']),
      mountain_01_bot: new AutoTileTemplate(alphaMaps['mountain_01_bot'], null, overLayers['mountain_01_bot']),
    };


    // return (await Canvas.fromImageResource(await (await autoTileTemplates['sand'].toJunctionAutoTile(tiles['sand_0'])).preview(true))).append();

    /** GET JUNCTION AUTO TILES **/
    let junctionAutoTiles: { [key:string]: JunctionAutoTile } = {
      sand_0: await autoTileTemplates['sand'].toJunctionAutoTile(tiles['sand_0']),
      sand_1: await autoTileTemplates['sand'].toJunctionAutoTile(tiles['sand_1']),
      grass_0: await autoTileTemplates['grass'].toJunctionAutoTile(tiles['grass_0']),
      rock_0: await autoTileTemplates['grass'].toJunctionAutoTile(tiles['rock_0']),
      earth_0: await autoTileTemplates['grass'].toJunctionAutoTile(tiles['earth_0']),
      mountain_01_bot: await autoTileTemplates['mountain_01_bot'].toJunctionAutoTile(tiles['mountain_01'])
    };

    // set zIndex for junctionAutoTiles
    [junctionAutoTiles['rock_0'], junctionAutoTiles['earth_0'], junctionAutoTiles['sand_0'], junctionAutoTiles['sand_1'], junctionAutoTiles['grass_0']]
      .forEach((autoTile: JunctionAutoTile, index: number) => { autoTile.zIndex = index; });

    // return await autoTileBuildIndexesTest(junctionAutoTiles['grass_0']);

    // (await Canvas.fromImageResource(await junctionAutoTiles['sand_0'].preview(true))).append();
    // (await Canvas.fromImageResource(junctionAutoTiles['grass_0'].imagePart.image)).append();

    /** GET BORDER AUTO TILES TEMPLATES **/
    let borderAutoTileTemplates: { [key:string]: BorderAutoTileTemplate } = {
      mountain_01: new BorderAutoTileTemplate(autoTileTemplates['mountain_01_top'], autoTileTemplates['mountain_01_bot']),
    };

    /** GET BORDER AUTO TILES **/
    let borderAutoTiles: { [key:string]: AutoTile } = {
      mountain_01: await borderAutoTileTemplates['mountain_01'].buildBottom(tiles['mountain_01']),
    };


    let autoBlocks: { [key:string]: AutoBlock } = {
      sand_01: new AutoBlock(junctionAutoTiles['sand_0'], borderAutoTileTemplates['mountain_01']),
      grass_01: new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
      rock_01: new AutoBlock(junctionAutoTiles['rock_0'], borderAutoTileTemplates['mountain_01'])
    };

    // Canvas.fromImageResource(this.imagePart.image).then((c: Canvas) => {
    //   c.append();
    // });
    // this.preview();

    // Canvas.fromImageResource((await borderAutoTileTemplates['mountain_01'].buildTop(tiles['grass_0'])).preview(false)).append();

    let map = randomBlockMapBuilder([
      autoBlocks['sand_01'],
      autoBlocks['grass_01'],
      autoBlocks['rock_01'],
      null
    ], 10, 10);

    // let map = [
    //   [
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01'])
    //   ],
    //   [
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
    //     new AutoBlock(junctionAutoTiles['sand_0'], borderAutoTileTemplates['mountain_01']),
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01'])
    //   ],
    //   [
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01']),
    //     new AutoBlock(junctionAutoTiles['grass_0'], borderAutoTileTemplates['mountain_01'])
    //   ]
    // ];


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
    // let rendered = await drawBlockMapSync(map);
    let rendered = await drawBlockMap(map);
    let t2 = performance.now();
    console.log(t2 - t1);

    rendered = rendered.resize(rendered.width * 2, rendered.height * 2, ImageRendering.PIXELATED);
    rendered.append(document.body);

    /** GENERATE MAP **/
    // let map = randomMapBuilder(
    //   [junctionAutoTiles['rock_0'], junctionAutoTiles['sand_0'], junctionAutoTiles['sand_1'], junctionAutoTiles['grass_0'], junctionAutoTiles['earth_0']],
    //   100, 100
    // );

    // let map = [
    //   [junctionAutoTiles['rock_0'], junctionAutoTiles['earth_0']],
    //   [junctionAutoTiles['sand_0'], junctionAutoTiles['grass_0']]
    // ];

    // let map = [
    //   [junctionAutoTiles['sand_0'], junctionAutoTiles['grass_0']],
    //   [junctionAutoTiles['sand_0'], junctionAutoTiles['grass_0']]
    // ];


    // let t1 = performance.now();
    // let rendered = await drawMap(<any>map);
    // let t2 = performance.now();
    // console.log(t2 - t1);
    // rendered.append(document.body);





  });

});




