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
  static width: number = 32;
  static height: number = 32;

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
  static width: number  = Tile.width / 2;
  static height: number = Tile.height / 2;
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
    let canvas = new Canvas(AutoTile.width * AutoTile.sections, AutoTile.height);

    for(let y = 0; y < 4; y++) {
      for(let x = 0; x < 4; x++) {
        canvas.ctx.drawImage(
          template.image.resource,
          template.sx + x * AutoTile.width, template.sy + y * AutoTile.height, AutoTile.width, AutoTile.height,
          Math.floor(AutoTile.templateToAutoTileIndexes[x + y * 4] * 1.25) * AutoTile.width, 0, AutoTile.width, AutoTile.height
        );
      }
    }

    for(let i = 0; i < 4; i++) {
      canvas.ctx.drawImage(
        tile.image.resource,
        tile.sx + (i % 2) * AutoTile.width, tile.sy + Math.floor(i / 2) * AutoTile.height, AutoTile.width, AutoTile.height,
        (i * 5 + 4) * AutoTile.width, 0, AutoTile.width, AutoTile.height
      );
    }

    return new AutoTile(canvas.toImageResourceSync(), 0, 0);
  }

  constructor(
    image: ImageResource,
    sx: number,
    sy: number
  ) {
    super(image, sx, sy);
  }

  draw(ctx: CanvasRenderingContext2D, index: number, dx: number, dy: number) {
    ctx.drawImage(
      this.image.resource,
      this.sx + index * AutoTile.width, this.sy, AutoTile.width, AutoTile.height,
      dx *  AutoTile.width, dy * AutoTile.height, AutoTile.width, AutoTile.height
    );
  }

  toTemplate(inverted: boolean = false): ImageResource {
    let canvas: Canvas = new Canvas(64, 64);
    for(let i = 0; i < 16; i++) {
      let j = inverted ? AutoTile.autoTileToTemplateInvertedIndexes[i] : AutoTile.autoTileToTemplateIndexes[i];
      canvas.ctx.drawImage(
        this.image.resource,
        this.sx + Math.floor(i * 1.25) * AutoTile.width, this.sy, AutoTile.width, AutoTile.height,
        (j % 4) * AutoTile.width, Math.floor(j / 4) * AutoTile.height, AutoTile.width, AutoTile.height
      );
    }
    return canvas.toImageResourceSync();
  }

}


export class AutoTileHelper {

  private static canvas: Canvas = new Canvas(64, 64);

  static extractAutoTileTemplate(imagePart: ImagePart): ImageResource {
    let canvas: Canvas = AutoTileHelper.canvas;
    canvas.resize(64, 64);
    canvas.clear();

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx, imagePart.sy + 32, 64, 64,
      0, 0, 64, 64
    );

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx + 32, imagePart.sy, 16, 16,
      32, 32, 16, 16
    );

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx + 48, imagePart.sy, 16, 16,
      16, 32, 16, 16
    );

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx + 32, imagePart.sy + 16, 16, 16,
      32, 16, 16, 16
    );

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx + 48, imagePart.sy + 16, 16, 16,
      16, 16, 16, 16
    );

    return canvas.toImageResourceSync();
  }

  static shadesOfGreyToAlphaMap(imagePart: ImagePart): ImageResource {
    let canvas: Canvas = AutoTileHelper.canvas;
    canvas.resize(64, 64);
    canvas.clear();

    canvas.ctx.drawImage(
      imagePart.image.resource,
      imagePart.sx, imagePart.sy, 64, 64,
      0, 0, 64, 64
    );

    let imageData: ImageData = canvas.getImageData(0, 0, 64, 64);
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
    canvas.resize(64, 64);
    canvas.clear();

    tile.draw(canvas.ctx, 0, 0);
    tile.draw(canvas.ctx, 1, 0);
    tile.draw(canvas.ctx, 0, 1);
    tile.draw(canvas.ctx, 1, 1);

    canvas.ctx.globalCompositeOperation = 'destination-in';
    canvas.ctx.drawImage(alphaMap.image.resource, 0, 0);
    canvas.ctx.globalCompositeOperation = 'destination-over';
    canvas.ctx.drawImage(underLayer.image.resource, 0, 0);
    canvas.ctx.globalCompositeOperation = 'source-over';

    return AutoTile.fromTemplate(tile, new ImagePart(canvas.toImageResourceSync(), 0, 0));
  }

}



/***
 * OLD
 */
export class AutoTileOld extends ImagePart {
  static width: number  = Tile.width * 2;
  static height: number = Tile.height * 2;
  static partWidth: number  = AutoTile.width / 4;
  static partHeight: number  = AutoTile.height / 4;

  static fromShadesOfGrey(image: ImageResource, sx: number, sy: number): AutoTile {
    let imageData: ImageData = Canvas.fromImageResource(image).getImageData(sx, sy, AutoTile.width, AutoTile.height);
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
    let canvas = new Canvas(AutoTile.width, AutoTile.height);

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
    this.canvas       = new Canvas(AutoTile.width, AutoTile.height);
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

    let autoTileTemplate: ImageResource = AutoTileHelper.extractAutoTileTemplate(new ImagePart(<ImageResource>resources[0], 64 * 1, 96 * 1));
    Canvas.fromImageResource(autoTileTemplate).append(document.body);


    let autoTile = AutoTileHelper.generateAutoTileFromJunctionTemplates(
      tileGrass,
      new ImagePart(AutoTileHelper.shadesOfGreyToAlphaMap(new ImagePart(<ImageResource>resources[4], 0, 0)), 0, 0),
      new ImagePart(<ImageResource>resources[5], 0, 0)
    );

    Canvas.fromImageResource(autoTile.image).append(document.body);
    Canvas.fromImageResource(autoTile.toTemplate()).append(document.body);
    Canvas.fromImageResource(autoTile.toTemplate(true)).append(document.body);

    // audioTest(<AudioResource>resources[7]);

    // let autoTilesCanvas = Canvas.fromImageResource(<ImageResource>resources[0]);
    // let tilesCanvas = Canvas.fromImageResource(<ImageResource>resources[1]);
    // let autoTileRaw = Renderer.buildAutoTile(autoTilesCanvas, 1, 1);
    //
    // let size = 64;
    //
    // autoTileRaw
    //   // .resize(size, size, 'pixelated')
    //   .append(document.body);
    //
    //
    // let tileGrass = new Tile(<ImageResource>resources[1], 32 * 6, 32 * 2);
    // let tileRock = new Tile(<ImageResource>resources[1], 32 * 5, 32 * 2);
    // let tileSand = new Tile(<ImageResource>resources[1], 32 * 9, 32 * 2);
    //
    // let alphaMap = AutoTile.fromShadesOfGrey(<ImageResource>resources[4], 0, 0);
    // let joinGrass = new AutoTileBuilder(alphaMap, new AutoTile(<ImageResource>resources[5], 0, 0));
    //
    // let autoTile = joinGrass.buildAutoTile(tileGrass);
    // Canvas.fromImageResource(autoTile.image).append(document.body);
    // Canvas.fromImageResource(autoTile.reverse().image).resize(256, 256, 'pixelated').append(document.body);

    // (<AudioResource>resources[6]).play();
  });

});



