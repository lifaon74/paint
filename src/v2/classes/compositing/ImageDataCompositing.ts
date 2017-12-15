export type CompositingFunction = (source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) => void;
// export type CompositingFunctionName = 'sourceOver' | 'destinationOver' | 'sourceIn' | 'destinationIn' | 'sourceOut';

export enum CompositingFunctionName {
  sourceOver = 'source-over',
}

declare const SIMD: any;

export class Compositing {

  /**
   * OFFICIALS
   *
   * https://www.w3.org/TR/compositing-1/#porterduffcompositingoperators_srcover
   */
  static sourceOver(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    let alpha_source: number      = source.data[sourceIndex + 3] / 255;
    let alpha_destination: number = (destination.data[destinationIndex + 3] / 255) * (1 - alpha_source);
    const alpha: number           = alpha_source + alpha_destination;
    alpha_source /= alpha;
    alpha_destination /= alpha;
    destination.data[destinationIndex    ] = source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination;
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination;
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  static destinationOver(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    let alpha_destination: number = destination.data[destinationIndex + 3] / 255;
    let alpha_source: number      = (source.data[sourceIndex + 3] / 255) * (1 - alpha_destination);
    const alpha: number           = alpha_source + alpha_destination;
    alpha_source /= alpha;
    alpha_destination /= alpha;
    destination.data[destinationIndex    ] = source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination;
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination;
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  static sourceIn(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    destination.data[destinationIndex    ] = source.data[sourceIndex    ];
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1];
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2];
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3] * destination.data[destinationIndex + 3] / 255;
  }

  static destinationIn(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3] * destination.data[destinationIndex + 3] / 255;
  }

  static sourceOut(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    destination.data[destinationIndex    ] = source.data[sourceIndex    ];
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1];
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2];
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3] * (1 - (destination.data[destinationIndex + 3] / 255));
  }

  static destinationOut(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    destination.data[destinationIndex + 3] = (1 - (source.data[sourceIndex + 3] / 255)) * destination.data[destinationIndex + 3];
  }

  static sourceAtop(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    let alpha_source: number      = source.data[sourceIndex + 3] * destination.data[destinationIndex + 3] / 65025;
    let alpha_destination: number = (destination.data[destinationIndex + 3] / 255) - alpha_source;
    const alpha: number           = alpha_source + alpha_destination;
    alpha_source /= alpha;
    alpha_destination /= alpha;
    destination.data[destinationIndex    ] = source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination;
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination;
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  static destinationAtop(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    let alpha_destination: number = source.data[sourceIndex + 3] * destination.data[destinationIndex + 3] / 65025;
    let alpha_source: number      = (source.data[sourceIndex + 3] / 255) - alpha_destination;
    const alpha: number           = alpha_source + alpha_destination;
    alpha_source /= alpha;
    alpha_destination /= alpha;
    destination.data[destinationIndex    ] = source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination;
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination;
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  static xor(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    const as: number              = source.data[sourceIndex + 3] / 255;
    const ad: number              = destination.data[destinationIndex + 3] / 255;
    const a: number               = as * ad;
    let alpha_source: number      = as - a;
    let alpha_destination: number = ad - a;
    const alpha: number           = alpha_source + alpha_destination;
    alpha_source /= alpha;
    alpha_destination /= alpha;
    destination.data[destinationIndex    ] = source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination;
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination;
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  static lighter(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    const alpha_source: number      = source.data[sourceIndex + 3] / 255;
    const alpha_destination: number = destination.data[destinationIndex + 3] / 255;
    const alpha: number             = alpha_source + alpha_destination;
    destination.data[destinationIndex    ] = source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination;
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination;
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  static copy(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    destination.data[destinationIndex + 0] = source.data[sourceIndex + 0];
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1];
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2];
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }


  /**
   * EXTENDED
   */
  static alphaMap(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    destination.data[destinationIndex + 3] = source.data[sourceIndex];
  }

  static grayScaleAverage(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    const gray: number = (source.data[sourceIndex] + source.data[sourceIndex + 1] + source.data[sourceIndex + 2]) / 3;
    destination.data[destinationIndex    ] = gray;
    destination.data[destinationIndex + 1] = gray;
    destination.data[destinationIndex + 2] = gray;
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }

  static grayScaleLuma(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    const gray: number = source.data[sourceIndex] * 0.3 + source.data[sourceIndex + 1] * 0.59 + source.data[sourceIndex + 2] * 0.11;
    destination.data[destinationIndex    ] = gray;
    destination.data[destinationIndex + 1] = gray;
    destination.data[destinationIndex + 2] = gray;
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }

  static grayScaleDesaturation(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    const gray: number = (Math.max(source.data[sourceIndex], source.data[sourceIndex + 1], source.data[sourceIndex + 2]) +
      Math.min(source.data[sourceIndex], source.data[sourceIndex + 1], source.data[sourceIndex + 2])) / 2;
    destination.data[destinationIndex    ] = gray;
    destination.data[destinationIndex + 1] = gray;
    destination.data[destinationIndex + 2] = gray;
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }

  static invert(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number): void {
    destination.data[destinationIndex    ] = 255 - source.data[sourceIndex    ];
    destination.data[destinationIndex + 1] = 255 - source.data[sourceIndex + 1];
    destination.data[destinationIndex + 2] = 255 - source.data[sourceIndex + 2];
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }





  static get(name: string): CompositingFunction  {
    switch(name) {
      case 'source-over':
        return Compositing.sourceOver;
      case 'destination-over':
        return Compositing.destinationOver;
      case 'source-in':
        return Compositing.sourceIn;
      case 'destination-in':
        return Compositing.destinationIn;
      case 'source-out':
        return Compositing.sourceOut;
      case 'destination-out':
        return Compositing.destinationOut;
      case 'source-atop':
        return Compositing.sourceAtop;
      case 'destination-atop':
        return Compositing.destinationAtop;
      case 'xor':
        return Compositing.xor;
      case 'lighter':
        return Compositing.lighter;

      // extended
      case 'alpha-map':
        return Compositing.alphaMap;
      case 'grayscale-average':
        return Compositing.grayScaleAverage;
      case 'grayscale-luma':
        return Compositing.grayScaleLuma;
      case 'grayscale-desaturation':
        return Compositing.grayScaleDesaturation;

      case 'copy':
        return Compositing.copy;
      default:
        throw new Error('Invalid compositing function name');
    }
  }


  static apply(
    compositingFunction: CompositingFunction,
    source: ImageData, destination: ImageData = null,
    sx: number = 0, sy: number = 0, sw: number = source.width, sh: number = source.height,
    dx: number = 0, dy: number = 0
  ): ImageData {
    if(destination === null) { destination = new ImageData(sw + dx, sh + dy); }

    const sx_start: number  = Math.max(0, -dx, Math.min(source.width, sx)); // sx_start in [max(0, -dx), width]
    const sx_end: number    = Math.max(sx, Math.min(source.width, sx + Math.min(sw, destination.width - dx))); // sx_end in [sx, min(source_width, destination_width - dx)]

    const sy_start: number  = Math.max(0, -dy, Math.min(source.height, sy));
    const sy_end: number    = Math.max(sy, Math.min(source.height, sy + Math.min(sh, destination.height - dy)));

    const x_offset: number  = dx - sx;
    const y_offset: number  = dy - sy;

    // console.log(sx_start, sx_end, sy_start, sy_end);

    for(let y = sy_start; y < sy_end; y++) {
      for(let x = sx_start; x < sx_end; x++) {
        compositingFunction(source, (x + y * source.width) * 4, destination, ((x + x_offset) + ((y + y_offset) * destination.width)) * 4);
      }
    }

    return destination;
  }


  static SIMDSourceOver(
    source: ImageData, destination: ImageData = null
  ) {

    if(destination === null) { destination = new ImageData(source.width, source.height); }

    let length = (source.data.length >> 4) << 4;


    let alphaSourceSIMD: any;
    let alphaDestinationSIMD: any;
    let alphaSIMD: any;
    let colorSourceSIMD: any;
    let colorDestinationSIMD: any;
    let resultSIMD: any;
    let splat255SIMD = SIMD.Float32x4.splat(255);

    for(let i = 0; i < length; i += 16) {
      alphaSourceSIMD = SIMD.Float32x4.div(
        SIMD.Float32x4(source.data[i + 3], source.data[i + 7], source.data[i + 11], source.data[i + 15]),
        splat255SIMD
      );

      alphaDestinationSIMD = SIMD.Float32x4.mul(
        SIMD.Float32x4.div(
          SIMD.Float32x4(destination.data[i + 3], destination.data[i + 7], destination.data[i + 11], destination.data[i + 15]),
          splat255SIMD
        ),
        SIMD.Float32x4.sub(SIMD.Float32x4.splat(1), alphaSourceSIMD)
      );


      alphaSIMD             = SIMD.Float32x4.add(alphaSourceSIMD, alphaDestinationSIMD);
      alphaSourceSIMD       = SIMD.Float32x4.div(alphaSourceSIMD, alphaSIMD);
      alphaDestinationSIMD  = SIMD.Float32x4.div(alphaDestinationSIMD, alphaSIMD);
      alphaSIMD             = SIMD.Float32x4.mul(alphaSIMD, splat255SIMD);

      for(let j = i, l = i + 16; j < l; j += 4) {
        let k = (j - i) >> 2;
        colorSourceSIMD       = SIMD.Float32x4.mul(
          SIMD.Float32x4(source.data[j], source.data[j + 1], source.data[j + 2], 255),
          SIMD.Float32x4.splat(SIMD.Float32x4.extractLane(alphaSourceSIMD, k))
        );

        colorDestinationSIMD  = SIMD.Float32x4.mul(
          SIMD.Float32x4(destination.data[j], destination.data[j + 1], destination.data[j + 2], 255),
          SIMD.Float32x4.splat(SIMD.Float32x4.extractLane(alphaDestinationSIMD, k))
        );

        resultSIMD = SIMD.Float32x4.add(colorSourceSIMD, colorDestinationSIMD);

        destination.data[j] = SIMD.Float32x4.extractLane(resultSIMD, 0);
        destination.data[j + 1] = SIMD.Float32x4.extractLane(resultSIMD, 1);
        destination.data[j + 2] = SIMD.Float32x4.extractLane(resultSIMD, 2);
        destination.data[j + 3] = SIMD.Float32x4.extractLane(alphaSIMD, k);
      }
    }

    return destination;
  }

}


export class ImageDataHelper {

  static copy(imageData: ImageData): ImageData {
    const copy: ImageData = new ImageData(imageData.width, imageData.height);
    copy.data.set(imageData.data);
    return copy;
  }

  static areEquals(imageData_0: ImageData, imageData_1: ImageData): boolean {
    if(
      (imageData_0.data.length !== imageData_1.data.length) ||
      (imageData_0.width !== imageData_1.width) ||
      (imageData_0.height !== imageData_1.height)
    ) {
      return false;
    }

    for(let i = 0; i < imageData_0.data.length; i++) {
      if(imageData_0.data[i] !== imageData_1.data[i]) {
        return false;
      }
    }

    return true;
  }

  static distance(imageData_0: ImageData, imageData_1: ImageData) {
    let distance: number[] = [0, 0, 0, 0];
    for(let i = 0; i < imageData_0.data.length; i += 4) {
      distance[0] += Math.abs(imageData_0.data[i + 0] - imageData_1.data[i + 0]);
      distance[1] += Math.abs(imageData_0.data[i + 1] - imageData_1.data[i + 1]);
      distance[2] += Math.abs(imageData_0.data[i + 2] - imageData_1.data[i + 2]);
      distance[3] += Math.abs(imageData_0.data[i + 3] - imageData_1.data[i + 3]);
    }
    console.log(distance);
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

  static changeOpacity(imageData: ImageData, multiplier: number): ImageData {
    for(let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 3] = Math.max(0, Math.min(255, Math.round(imageData.data[i + 3] * multiplier)));
    }
    return imageData;
  }


  static hasTransparency(imageData: ImageData): boolean {
    for(let i = 0; i < imageData.data.length; i += 4) {
      if(imageData.data[i + 3] !== 255) {
        return true;
      }
    }
    return false;
  }

}

