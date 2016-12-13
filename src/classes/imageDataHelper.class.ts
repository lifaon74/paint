export class ImageDataHelper {
  static sourceOverFunction(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    let alpha1: number, alpha2: number, alpha3: number;

    alpha1 = source.data[sourceIndex + 3] / 255;
    alpha2 = (destination.data[destinationIndex + 3] / 255) * (1 - alpha1);
    alpha3 = alpha1 + alpha2;

    destination.data[destinationIndex + 0] = (source.data[sourceIndex + 0] * alpha1 + destination.data[destinationIndex + 0] * alpha2) / alpha3;
    destination.data[destinationIndex + 1] = (source.data[sourceIndex + 1] * alpha1 + destination.data[destinationIndex + 1] * alpha2) / alpha3;
    destination.data[destinationIndex + 2] = (source.data[sourceIndex + 2] * alpha1 + destination.data[destinationIndex + 2] * alpha2) / alpha3;
    destination.data[destinationIndex + 3] = alpha3 * 255;
  }

  static alphaMapFunction(source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) {
    destination.data[destinationIndex + 3] = source.data[sourceIndex];
  }


  static mergeImageData(
    source: ImageData, destination: ImageData, mergeFunction: ((source: ImageData, sourceIndex: number, destination: ImageData, destinationIndex: number) => any),
    sx: number = 0, sy: number = 0, sw: number = source.width, sh: number = source.height,
    dx: number = 0, dy: number = 0
  ): ImageData {
    let sx_start  = Math.max(0, -dx, Math.min(source.width, sx)); // sx_start in [max(0, -dx), width]
    let sx_end    = Math.max(sx, Math.min(source.width, sx + Math.min(sw, destination.width - dx))); // sx_end in [sx, min(source_width, destination_width - dx)]

    let sy_start  = Math.max(0, -dy, Math.min(source.height, sy));
    let sy_end    = Math.max(sy, Math.min(source.height, sy + Math.min(sh, destination.height - dy)));

    let x_offset = dx - sx;
    let y_offset = dy - sy;

    // console.log(sx_start, sx_end, sy_start, sy_end);

    for(let y = sy_start; y < sy_end; y++) {
      for(let x = sx_start; x < sx_end; x++) {
        mergeFunction(source, (x + y * source.width) * 4, destination, ((x + x_offset) + ((y + y_offset) * destination.width)) * 4);
      }
    }

    return destination;
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