import { Canvas } from './classes/canvas.class';
import { SortedArray } from './classes/sortedArray.class';
import { ImageResource } from './classes/resources/imageResource.class';
import { ResourceLoader } from './classes/resources/resourceLoader.class';
import { AsyncResource } from './classes/resources/asyncResource.class';
import { AudioResource } from './classes/resources/audioResource.class';
import { ImageDataHelper } from './classes/imageDataHelper.class';

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

  // deprecated
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
        canvas.putImageResource(
          template.image,
          template.sx + x * Tile.halfWidth, template.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
          Math.floor(AutoTile.templateToAutoTileIndexes[x + y * 4] * 1.25) * Tile.halfWidth, 0
        );
        // canvas.ctx.drawImage(
        //   template.image.resource,
        //   template.sx + x * Tile.halfWidth, template.sy + y * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
        //   Math.floor(AutoTile.templateToAutoTileIndexes[x + y * 4] * 1.25) * Tile.halfWidth, 0, Tile.halfWidth, Tile.halfHeight
        // );
      }
    }

    for(let i = 0; i < 4; i++) {
      canvas.putImageResource(
        tile.image,
        tile.sx + (i % 2) * Tile.halfWidth, tile.sy + Math.floor(i / 2) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
        (i * 5 + 4) * Tile.halfWidth, 0
      );
      // canvas.ctx.drawImage(
      //   tile.image.resource,
      //   tile.sx + (i % 2) * Tile.halfWidth, tile.sy + Math.floor(i / 2) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight,
      //   (i * 5 + 4) * Tile.halfWidth, 0, Tile.halfWidth, Tile.halfHeight
      // );
    }

    let autoTile = new AutoTile(canvas.toImageResource(), 0, 0);
    autoTile.hasTransparencyCached = tile.hasTransparencyCached;
    return autoTile;
  }

  constructor(
    image: ImageResource,
    sx: number,
    sy: number,
    public zIndex: number = 0
  ) {
    super(image, sx, sy);
  }

  // deprecated
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
      canvas.putImageResource(
        this.image,
        this.sx + Math.floor(i * 1.25) * Tile.halfWidth, this.sy, Tile.halfWidth, Tile.halfHeight,
        (j % 4) * Tile.halfWidth, Math.floor(j / 4) * Tile.halfHeight
      );
      // canvas.ctx.drawImage(
      //   this.image.resource,
      //   this.sx + Math.floor(i * 1.25) * Tile.halfWidth, this.sy, Tile.halfWidth, Tile.halfHeight,
      //   (j % 4) * Tile.halfWidth, Math.floor(j / 4) * Tile.halfHeight, Tile.halfWidth, Tile.halfHeight
      // );
    }
    return canvas.toImageResource();
  }

}


export class AutoTileHelper {

  static autoTileComparisonFunction(a: AutoTile, b: AutoTile) {
    // if(a === b) return 0;
    // if(a === null) return -1;
    // if(b === null) return 1;
    if(a.zIndex < b.zIndex) return -1;
    if(a.zIndex > b.zIndex) return 1;
    return 0;
  }

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

  static shadesOfGreyToAlphaMap(imagePart: ImagePart): ImageResource {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    canvas.putImageResource(
      imagePart.image,
      imagePart.sx, imagePart.sy, Tile.twoWidth, Tile.twoHeight
    );

    let imageData: ImageData = canvas.getImageData();
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = (imageData.data[i + 0] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      imageData.data[i + 0] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
    }
    let imageResource: ImageResource = new ImageResource();
    imageResource.imageData = imageData;
    return imageResource;
  }

  static generateAutoTileFromJunctionTemplates(tile: Tile, alphaMap: ImagePart, underLayer: ImagePart): AutoTile {
    let canvas = new Canvas(Tile.twoWidth, Tile.twoHeight);

    for(let y = 0; y < 2; y++) {
      for(let x = 0; x < 2; x++) {
        canvas.putImageResource(
          tile.image,
          tile.sx, tile.sy, Tile.width, Tile.width,
          x * Tile.width, y * Tile.height
        );
      }
    }

    canvas.ctx.globalCompositeOperation = 'destination-in';
    canvas.ctx.drawImage(alphaMap.image.resource, 0, 0);
    canvas.ctx.globalCompositeOperation = 'destination-over';
    canvas.ctx.drawImage(underLayer.image.resource, 0, 0);
    canvas.ctx.globalCompositeOperation = 'source-over';

    return AutoTile.fromTemplate(tile, new ImagePart(canvas.toImageResource(), 0, 0));
  }


  // topLeftAutoTile: AutoTile, topRightAutoTile: AutoTile, bottomLeftAutoTile: AutoTile, bottomRightAutoTile: AutoTile
  static buildTile(autoTiles: [AutoTile, AutoTile, AutoTile, AutoTile]): ImageResource {
    let imageData = new ImageData(Tile.width, Tile.height);

    let ordered: SortedArray<AutoTile> = new SortedArray<AutoTile>(AutoTileHelper.autoTileComparisonFunction);
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

          let j = autoTile.hasTransparencyCached ? 0 : ordered.indexOf(autoTile);
          for(; j < ordered.array.length; j++) {
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

            ImageDataHelper.mergeImageData(
              ImageDataHelper.sourceOverFunction, orderedAutoTile.image.imageData, imageData,
              orderedAutoTile.sx + (index + offset) * Tile.halfWidth, orderedAutoTile.sy, Tile.halfWidth, Tile.halfHeight,
              x * Tile.halfWidth, y * Tile.halfHeight
            );
          }
        }
      }
    }

    let imageResource: ImageResource = new ImageResource();
    imageResource.imageData = imageData;
    return imageResource;
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

  let drawMap = (map: AutoTile[][]) => {
    // console.log(map);

    let canvas = new Canvas((map[0].length - 1) * Tile.width, (map.length - 1) * Tile.height);

    let xMap: AutoTile[];
    for(let y = 0; y < map.length - 1; y++) {
      xMap = map[y];
      for(let x = 0; x < xMap.length - 1; x++) {
        // setTimeout(() => {
          canvas.putImageResource(AutoTileHelper.buildTile([
            map[y + 0][x + 0], map[y + 0][x + 1],
            map[y + 1][x + 0], map[y + 1][x + 1]
          ]), 0, 0, Tile.width, Tile.width, x * Tile.width, y * Tile.height);
        // }, Math.floor(Math.random() * map.length * xMap.length));
      }
    }

    return canvas;
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
    './assets/images/templates/junctions/grass/grass_alpha_map.png',
    './assets/images/templates/junctions/grass/grass_under_layer.png',
    './assets/images/templates/junctions/sand/sand_alpha_map.png',
    // './assets/sounds/field_01.mp3',
    // './assets/sounds/005-Rain01.mp3'
  ], (index: number, total: number) => {
    console.log(Math.round((index + 1) / total * 100 ) + '%');
  }).then((resources: AsyncResource[]) => {

    let tiles: any = {
      grass_0: new Tile(<ImageResource>resources[1], 32 * 6, 32 * 2).verifyTransparency(),
      rock_0: new Tile(<ImageResource>resources[1], 32 * 5, 32 * 2).verifyTransparency(),
      sand_0: new Tile(<ImageResource>resources[1], 32 * 9, 32 * 2).verifyTransparency(),
      sand_1: new Tile(<ImageResource>resources[0], 0, 96 * 2).verifyTransparency(),
      earth_0: new Tile(<ImageResource>resources[1], 32 * 10, 32 * 2).verifyTransparency(),
    };

    let autoTileTemplate: ImageResource = AutoTileHelper.extractAutoTileTemplate(new ImagePart(<ImageResource>resources[0], 64 * 2, 0));
    // Canvas.fromImageResource(autoTileTemplate).append(document.body);

    let alphaMaps: any = {
      grass: new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[4], 0, 0)), 0, 0),
      sand: new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[6], 0, 0)), 0, 0)
    };

    let grassUnderLayerJunction = new ImagePart(<ImageResource>resources[5], 0, 0);
    let sandUnderLayerJunction: ImagePart = new ImagePart(
      ImageResource.fromImageData(ImageDataHelper.changeOpacity(ImageDataHelper.copy(alphaMaps.sand.image.imageData), 0.5)),
    0, 0);

    let autoTiles: any = {
      sand_0: AutoTileHelper.generateAutoTileFromJunctionTemplates(
        tiles.sand_0, alphaMaps.sand, sandUnderLayerJunction
      ),
      sand_1: AutoTileHelper.generateAutoTileFromJunctionTemplates(
        tiles.sand_1, alphaMaps.sand, sandUnderLayerJunction
      ),
      grass_0: AutoTileHelper.generateAutoTileFromJunctionTemplates(
        tiles.grass_0, alphaMaps.grass, grassUnderLayerJunction
      ),
      rock_0: AutoTileHelper.generateAutoTileFromJunctionTemplates(
        tiles.rock_0, alphaMaps.grass, grassUnderLayerJunction
      ),
    };

    [autoTiles.rock_0, autoTiles.sand_0, autoTiles.sand_1, autoTiles.grass_0]
      .forEach((autoTile: AutoTile, index: number) => { autoTile.zIndex = index; });

    // let autoTile: AutoTile = autoTiles.sand_1;
    // Canvas.fromImageResource(autoTile.image).append(document.body);
    // Canvas.fromImageResource(autoTile.toTemplate()).append(document.body);
    // Canvas.fromImageResource(autoTile.toTemplate(true)).append(document.body);

    let map = randomMapBuilder(
      [autoTiles.rock_0, autoTiles.sand_0, autoTiles.sand_1, autoTiles.grass_0],
      100, 100
      // Math.floor(window.innerWidth / Tile.width) + 1,
      // Math.floor(window.innerHeight / Tile.height) + 1
    );
    let t1 = Date.now();
    let rendered = drawMap(map);
    let t2 = Date.now();
    console.log(t2 - t1);
    rendered.append(document.body);

    // Canvas.fromImageResource(AutoTileHelper.buildTile([
    //   null, autoTileRock,
    //   autoTileSand, null
    // ]))
    // // .resize(256, 256, 'pixelated')
    // .append(document.body);


    // Canvas.fromImageData(Canvas.mergeImageData(
    //   Canvas.fromImageResource(<ImageResource>resources[0]).getImageData(32 * 8, 0, 64, 64),
    //   Canvas.fromImageResource(<ImageResource>resources[0]).getImageData(32 * 10, 0, 32, 32),
    //   0, 0, 64, 64, 16, 0
    // )).append(document.body);

    // audioTest(<AudioResource>resources[7]);
  });

});




