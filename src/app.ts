import { ImageResource } from 'image-resource';
import { Canvas } from './canvas.class';

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

export class Paint {

  static openImagesSelection(onImageCallback: ((images: ImageResource[]) => any)) {
    FileHelper.openFileSelection((files: FileList) => {
      let reg = new RegExp('image/.*', '');
      let promises: Promise<ImageResource>[] = [];
      let file: File;
      for(let i = 0; i < files.length; i++) {
        file = files[i];
        if(reg.test(file.type)) {
          promises.push(Paint.readFileAsImage(file));
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


  public canvas: Canvas;

  constructor() {
    this.canvas = new Canvas(1, 1);
  }

  append(element: Element) {
    this.canvas.append(element);
  }

}

window.addEventListener('load', () => {
  const paint = new Paint();

  // document.body.addEventListener('click', () => Paint.openImagesSelection((images: ImageResource[]) => {
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


  let buildAutoTile = (canvas: Canvas, x: number, y: number): Canvas => {
    x *= 64;
    y *= 96;

    let result = canvas.cut(x, y + 32, 64, 64);

    result.add(canvas.cut(x + 32, y, 16, 16), 32, 32);
    result.add(canvas.cut(x + 32 + 16, y, 16, 16), 16, 32);
    result.add(canvas.cut(x + 32, y + 16, 16, 16), 32, 16);
    result.add(canvas.cut(x + 32 + 16, y + 16, 16, 16), 16, 16);

    return result;
  };

  Promise.all([
    ImageResource.load('./assets/originals/01.png'),
    ImageResource.load('./assets/originals/02.png'),
    ImageResource.load('./assets/originals/03.png'),
    ImageResource.load('./assets/originals/04.png'),
    ImageResource.load('./assets/alpha_maps/grass.png'),
  ]).then((images: ImageResource[]) => {
    let autoTilesCanvas = Canvas.fromImageResource(images[0]);
    let tilesCanvas = Canvas.fromImageResource(images[1]);

    let autoTile = buildAutoTile(autoTilesCanvas, 2, 0);

    let grass = tilesCanvas.cut(32 * 6, 32 * 2, 32, 32);
    let rock = tilesCanvas.cut(32 * 5, 32 * 2, 32, 32);

    let grass_64 = new Canvas(64, 64).add(grass, 0, 0).add(grass, 32, 0).add(grass, 0, 32).add(grass, 32, 32);
    let rock_64 = new Canvas(64, 64).add(rock, 0, 0).add(rock, 32, 0).add(rock, 0, 32).add(rock, 32, 32);
    grass_64.putImageData(Canvas.offsetImageData(grass_64.getImageData(), 16, 16));
    rock_64.putImageData(Canvas.offsetImageData(rock_64.getImageData(), 16, 16));

    let imageData = buildAlphaMapHelper(rock_64.getImageData(), grass_64.getImageData(), autoTile.getImageData());

    autoTile.append(document.body);
    grass_64.append(document.body);
    rock_64.append(document.body);

    new Canvas(64, 64).putImageData(imageData).append(document.body).toImageResource().then((image) => {
      //window.open(image.src, '_blank');
    });


    imageData = Canvas.alphaMap(grass_64.getImageData(), Canvas.fromImageResource(images[4]).getImageData());
    new Canvas(64, 64).add(rock_64).add(Canvas.fromImageData(imageData)).resize(256, 256, 'pixelated').append(document.body);

  });



  // ImageResource.load('./assets/tiles.png').then((image: ImageResource) => {
  //   let canvas = Canvas.fromImageResource(image);
  //
  //   let tile_1 = canvas.cut(0, 0, 32, 32);
  //   let tile_2 = canvas.cut(32 * 2, 0, 32, 32);
  //
  //   let imageData_1: ImageData = tile_1.getImageData();
  //   let imageData_2: ImageData = tile_2.getImageData();
  //
  //   let result = new Canvas(32, 32);
  //   let imageDataResult: ImageData = result.getImageData();
  //
  //   for(let i = 0; i < imageDataResult.data.length; i += 4) {
  //     imageData_2.data[i + 3] = Math.floor(Math.random() * 255);
  //   }
  //
  //   tile_2.putImageData(imageData_2);
  //   Canvas.mergeImageData(imageData_1, imageData_2);
  //   result.putImageData(imageData_1);
  //
  //   tile_1.resize(64, 64).append(document.body);
  //   tile_2.resize(64, 64).append(document.body);
  //   result.resize(64, 64).append(document.body);
  //
  // });
});



