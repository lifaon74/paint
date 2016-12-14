export declare type CompositingFunction = (source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) => void;


export class Compositing {

  /**
   * OFFICIALS
   *
   * https://www.w3.org/TR/compositing-1/#porterduffcompositingoperators_srcover
   */
  static sourceOver(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    let alpha_source: number      = source.data[sourceIndex + 3] / 255;
    let alpha_destination: number = (destination.data[destinationIndex + 3] / 255) * (1 - alpha_source);
    let alpha: number             = alpha_source + alpha_destination;
    destination.data[destinationIndex    ] = (source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination) / alpha;
    destination.data[destinationIndex + 1] = (source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination) / alpha;
    destination.data[destinationIndex + 2] = (source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination) / alpha;
    destination.data[destinationIndex + 3] = (alpha_source + alpha_destination) * 255;
  }

  static destinationOver(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    let alpha_destination: number = destination.data[sourceIndex + 3] / 255;
    let alpha_source: number      = (source.data[destinationIndex + 3] / 255) * (1 - alpha_destination);
    let alpha: number             = alpha_source + alpha_destination;
    destination.data[destinationIndex    ] = (source.data[sourceIndex    ] * alpha_source + destination.data[destinationIndex    ] * alpha_destination) / alpha;
    destination.data[destinationIndex + 1] = (source.data[sourceIndex + 1] * alpha_source + destination.data[destinationIndex + 1] * alpha_destination) / alpha;
    destination.data[destinationIndex + 2] = (source.data[sourceIndex + 2] * alpha_source + destination.data[destinationIndex + 2] * alpha_destination) / alpha;
    destination.data[destinationIndex + 3] = alpha * 255;
  }

  static sourceIn(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    destination.data[destinationIndex    ] = source.data[sourceIndex    ];
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1];
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2];
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3] * destination.data[destinationIndex + 3] / 255;
  }

  static destinationIn(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3] * destination.data[destinationIndex + 3] / 255;
  }

  static sourceOut(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    destination.data[destinationIndex    ] = source.data[sourceIndex    ];
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1];
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2];
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3]* (1 - (destination.data[destinationIndex + 3] / 255));
  }

  static destinationOut(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    destination.data[destinationIndex + 3] = (1 - (source.data[sourceIndex + 3] / 255)) * destination.data[destinationIndex + 3];
  }

  static copy(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    destination.data[destinationIndex + 0] = source.data[sourceIndex + 0];
    destination.data[destinationIndex + 1] = source.data[sourceIndex + 1];
    destination.data[destinationIndex + 2] = source.data[sourceIndex + 2];
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }


  /**
   * EXTENDED
   */
  static alphaMap(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    destination.data[destinationIndex + 3] = source.data[sourceIndex];
  }

  static grayScaleAverage(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    let gray: number = (source.data[sourceIndex + 0] + source.data[sourceIndex + 1] + source.data[sourceIndex + 2]) / 3;
    destination.data[destinationIndex + 0] = gray;
    destination.data[destinationIndex + 1] = gray;
    destination.data[destinationIndex + 2] = gray;
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }

  static grayScaleLuma(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    let gray: number = source.data[sourceIndex + 0] * 0.3 + source.data[sourceIndex + 1] * 0.59 + source.data[sourceIndex + 2] * 0.11;
    destination.data[destinationIndex + 0] = gray;
    destination.data[destinationIndex + 1] = gray;
    destination.data[destinationIndex + 2] = gray;
    destination.data[destinationIndex + 3] = source.data[sourceIndex + 3];
  }

  static grayScaleDesaturation(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    let gray: number = (Math.max(source.data[sourceIndex + 0], source.data[sourceIndex + 1], source.data[sourceIndex + 2]) +
      Math.min(source.data[sourceIndex + 0], source.data[sourceIndex + 1], source.data[sourceIndex + 2])) / 2;
    destination.data[destinationIndex + 0] = gray;
    destination.data[destinationIndex + 1] = gray;
    destination.data[destinationIndex + 2] = gray;
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
      default:
        return Compositing.destinationOver;
    }
  }


  static apply(
    filterFunction: ((source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) => any),
    source: ImageData, destination: ImageData = null,
    sx: number = 0, sy: number = 0, sw: number = source.width, sh: number = source.height,
    dx: number = 0, dy: number = 0
  ): ImageData {
    if(destination === null) { destination = new ImageData(sw + dx, sh + dy); }

    let sx_start  = Math.max(0, -dx, Math.min(source.width, sx)); // sx_start in [max(0, -dx), width]
    let sx_end    = Math.max(sx, Math.min(source.width, sx + Math.min(sw, destination.width - dx))); // sx_end in [sx, min(source_width, destination_width - dx)]

    let sy_start  = Math.max(0, -dy, Math.min(source.height, sy));
    let sy_end    = Math.max(sy, Math.min(source.height, sy + Math.min(sh, destination.height - dy)));

    let x_offset = dx - sx;
    let y_offset = dy - sy;

    // console.log(sx_start, sx_end, sy_start, sy_end);

    for(let y = sy_start; y < sy_end; y++) {
      for(let x = sx_start; x < sx_end; x++) {
        filterFunction(source, (x + y * source.width) * 4, destination, ((x + x_offset) + ((y + y_offset) * destination.width)) * 4);
      }
    }

    return destination;
  }


}


export class ImageDataHelper {

  static copy(imageData: ImageData): ImageData {
    let copy: ImageData = new ImageData(imageData.width, imageData.height);
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

  static distance(imageData_0: ImageData, imageData_1: ImageData): number {
    let distance: number = 0;
    for(let i = 0; i < imageData_0.data.length; i++) {
      distance += Math.abs(imageData_0.data[i] - imageData_1.data[i]);
    }
    return distance;
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