import * as $zlib from 'zlib';
import * as $stream from 'stream';
import { GetUninitializedImageResource, ImageResource } from './Image';
import { CRC32 } from '../../classes/CRC';

// export class ImageData {
//   public data: Uint8ClampedArray;
//   public width: number;
//   public height: number;
//
//   constructor(width: number, height: number/*, buffer: Uint8ClampedArray*/) {
//     this.width = width;
//     this.height = height;
//     this.data = new Uint8ClampedArray(this.width * this.height * 4);
//   }
// }

export interface Transparency {
  indexed?: Uint8Array;
  grayscale?: number;
  rgb?: Uint8Array;
}

interface PNGChunk {
  size?: number;
  type?: string;
  data?: Uint8Array;
  crc?: number;
}

interface IHDR {
  width?: number;
  height?: number;
  bitDepth?: number;
  colorType?: number;
  compressionMethod?: number;
  filterMethod?: number;
  interlaceMethod?: number;
}

interface PLTE {
  palette?: Uint8Array;
}

class IDATDecoder extends $stream.Writable {

  static * decode(data: Uint8Array): IterableIterator<any> {
    while(true) {

    }

    // let index: number = 0;
    // let length: number = bytes.length;
    // const pixelBytes: number = pixelBitLength / 8;
    // const scanLineLength: number = pixelBytes * width;
    // const data: Uint8Array = new Uint8Array(scanLineLength * height);
    // let dataIndex: number = 0;
    //
    // let row: number = 0;
    //
    // let byte: number;
    // let col: number;
    // let upper: number;
    // let left: number;
    // let upperLeft: number;
    // let p: number, pa: number, pb: number, pc: number, paeth: number;
    //
    // while(index < length) {
    //   switch(bytes[index++]) {
    //     case 0:
    //       for(let i = 0; i < scanLineLength; i++) {
    //         data[dataIndex++] = bytes[index++];
    //       }
    //       break;
    //     case 1:
    //       for(let i = 0; i < scanLineLength; i++) {
    //         byte = bytes[index++];
    //         left = (i < pixelBytes) ? 0 : data[dataIndex - pixelBytes];
    //         data[dataIndex++] = byte + left; // % 256
    //       }
    //       break;
    //     case 2:
    //       for(let i = 0; i < scanLineLength; i++) {
    //         byte = bytes[index++];
    //         col = (i - (i % pixelBytes)) / pixelBytes;
    //         upper = row && data[(row - 1) * scanLineLength + col * pixelBytes + (i % pixelBytes)];
    //         data[dataIndex++] = byte + upper; //  % 256
    //       }
    //       break;
    //     case 3:
    //       for(let i = 0; i < scanLineLength; i++) {
    //         byte = bytes[index++];
    //         col = (i - (i % pixelBytes)) / pixelBytes;
    //         left = i < pixelBytes ? 0 : data[dataIndex - pixelBytes];
    //         upper = row && data[(row - 1) * scanLineLength + col * pixelBytes + (i % pixelBytes)];
    //         data[dataIndex++] = byte + Math.floor((left + upper) / 2); //  % 256
    //       }
    //       break;
    //     case 4:
    //       for(let i = 0; i < scanLineLength; i++) {
    //         byte = bytes[index++];
    //         col = (i - (i % pixelBytes)) / pixelBytes;
    //         left = i < pixelBytes ? 0 : data[dataIndex - pixelBytes];
    //         if(row === 0) {
    //           upper = upperLeft = 0;
    //         } else {
    //           upper = data[(row - 1) * scanLineLength + col * pixelBytes + (i % pixelBytes)];
    //           upperLeft = col && data[(row - 1) * scanLineLength + (col - 1) * pixelBytes + (i % pixelBytes)];
    //         }
    //
    //         p = left + upper - upperLeft;
    //         pa = Math.abs(p - left);
    //         pb = Math.abs(p - upper);
    //         pc = Math.abs(p - upperLeft);
    //         if((pa <= pb) && (pa <= pc)) {
    //           paeth = left;
    //         } else if(pb <= pc) {
    //           paeth = upper;
    //         } else {
    //           paeth = upperLeft;
    //         }
    //         data[dataIndex++] = byte + paeth; //  % 256
    //       }
    //       break;
    //     default:
    //       reject(new Error('Invalid filter algorithm: ' + bytes[index - 1]));
    //       return;
    //   }
    //   row++;
    // }
  }

  public data: Uint8Array;
  public writeIndex: number;

  private _inflate: any;

  constructor(width: number, height: number) {
    super({ objectMode: false });

    this.data = new Uint8Array(width * height * 4);
    this.writeIndex = 0;
    this._inflate = $zlib.createInflate();

    this._inflate.on('data', (data: Uint8Array) => {
      console.log('ok', data);
    });
  }

  // push(data: Uint8Array): void {
  //   this._inflate.
  //   // this.data.set(data, this.writeIndex);
  //   // this.writeIndex += data.length;
  // }

  _write(data: Uint8Array, encoding: any, callback: any) {
    this._inflate.write(data);
    callback();
  }

}

console.log('png');

// https://github.com/arian/pngjs/blob/master/PNGReader.js
// http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html

export class PNG extends ImageResource implements IHDR, PLTE {

  static signature: Uint8Array = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  static fromBytes(bytes: Uint8Array): Promise<PNG> {
    return new Promise((resolve: any, reject: any) => {
      const png: PNG = GetUninitializedImageResource(PNG) as PNG;
      const crc: CRC32 = new CRC32();

      let index: number = this.verifySignature(bytes);

      let chunk: PNGChunk;
      let pixelDecoder: IDATDecoder;

      while(true) {
        [index, chunk] = this.decodeChunk(bytes, index, crc);

        // console.log('chunk', chunk, index);

        switch(chunk.type) {
          case 'IHDR':
            this.decodeIHDR(chunk, png);
            pixelDecoder = new IDATDecoder(png.width, png.height);
            break;
          case 'PLTE':
            this.decodePLTE(chunk, png);
            break;
          case 'IDAT':
            pixelDecoder.write(chunk.data);
            throw 'ok';
            break;
          // case 'tRNS':
          //   png.transparency = {};
          //   switch(png.colorType) {
          //     case 3:
          //       png.transparency.indexed = new Uint8Array(Math.max(255, chunkSize));
          //       for(let i = 0; i < chunkSize; i++) {
          //         png.transparency.indexed[i] = bytes[index + i];
          //       }
          //       for(let i = chunkSize; i < 255; i++) {
          //         png.transparency.indexed[i] = 255;
          //       }
          //       index += chunkSize;
          //       break;
          //     case 0:
          //       png.transparency.grayscale = bytes[index];
          //       index += chunkSize;
          //       break;
          //     case 2:
          //       png.transparency.rgb = bytes.slice(index, index + chunkSize); // or subarray
          //       index += chunkSize;
          //       break;
          //   }
          //   break;
          // case 'tEXt':
          //   let key: string = '';
          //   let value: string = '';
          //   let i: number = index;
          //   let l: number = index + chunkSize;
          //   let char: number;
          //   for(; i < l; i++) {
          //     char = bytes[i];
          //     if(char === 0) break;
          //     key += String.fromCharCode(char);
          //   }
          //   for(; i < l; i++) {
          //     char = bytes[i];
          //     value += String.fromCharCode(char);
          //   }
          //   png.text[key] = value;
          //   index += chunkSize;
          //   break;
          // case 'IEND':
          //   switch(png.colorType) {
          //     case 0:
          //     case 3:
          //     case 4:
          //       png.colors = 1;
          //       png.colorSpace = 'DeviceGray';
          //       break;
          //     case 2:
          //     case 6:
          //       png.colors = 3;
          //       png.colorSpace = 'DeviceRGB';
          //       break;
          //   }
          //
          //   png.hasAlphaChannel = (png.colorType === 4) || (png.colorType === 6);
          //   png.pixelBitLength = png.bits * (png.colors + (png.hasAlphaChannel ? 1 : 0));
          //
          //   this.decodePixelsData(pixelsBytes.subarray(0, pixelsBytesIndex), png.width, png.height, png.pixelBitLength)
          //     .then((data: Uint8ClampedArray) => {
          //       png.data = data;
          //       resolve(png);
          //     }, reject);
          //   return;
          default:
            console.log('unknown chunk', chunk.type);
            break;
        }

        if(index > bytes.length) {
          reject(new Error('Incomplete or corrupt PNG file'));
          return;
        }
      }
    });
  }

  private static verifySignature(bytes: Uint8Array, index: number = 0): number {
    for(; index < 8; index++) {
      if(bytes[index] !== this.signature[index]) throw new Error('Invalid png signature');
    }
    return index;
  }

  private static decodeChunk(bytes: Uint8Array, index: number = 0, crc32: CRC32 = new CRC32()): [number, PNGChunk] {
    const chunk: PNGChunk = {};
    chunk.size = ((bytes[index++] << 24) | (bytes[index++] << 16) | (bytes[index++] << 8) | bytes[index++]) >>> 0;

    const crc: number = crc32.hash(bytes.subarray(index , index + 4 + chunk.size));

    chunk.type = '';
    for(let l = index + 4; index < l; index++) {
      chunk.type += String.fromCharCode(bytes[index]);
    }

    chunk.data = bytes.subarray(index, index + chunk.size);
    index += chunk.size;

    chunk.crc = ((bytes[index++] << 24) | (bytes[index++] << 16) | (bytes[index++] << 8) | bytes[index++]) >>> 0;

    if(chunk.crc !== crc) {
      console.log(chunk);
      throw new Error(
        'Chunk CRC mismatch : \n'
        + '0x' + chunk.crc.toString(16).padStart(8, '0') + ' - '
        + '0x' + crc.toString(16).padStart(8, '0')
      );
    }

    return [index, chunk];
  }

  private static decodeIHDR(chunk: PNGChunk, ihdr: IHDR = {}): IHDR {
    let index: number = 0;
    ihdr.width = ((chunk.data[index++] << 24) | (chunk.data[index++] << 16) | (chunk.data[index++] << 8) | chunk.data[index++]) >>> 0;
    ihdr.height = ((chunk.data[index++] << 24) | (chunk.data[index++] << 16) | (chunk.data[index++] << 8) | chunk.data[index++]) >>> 0;
    ihdr.bitDepth = chunk.data[index++];
    ihdr.colorType = chunk.data[index++];
    ihdr.compressionMethod = chunk.data[index++];
    ihdr.filterMethod = chunk.data[index++];
    ihdr.interlaceMethod = chunk.data[index++];
    if(index !== chunk.size) throw new Error('Invalid IHDR chunk size, expected ' + index + ' bytes');
    return ihdr;
  }

  private static decodePLTE(chunk: PNGChunk, plte: PLTE = {}): PLTE {
    plte.palette = chunk.data;
    const size: number = plte.palette.length / 3;
    if((size % 1) !== 0) throw new Error('Invalid PLTE chunk size, expected a multiple of 3, found ' + plte.palette.length);
    if((size < 1) || (size > 256)) throw new Error('Invalid PLTE chunk, expected from 1 to 256 palette entries, found ' + size);
    return plte;
  }

  // private static encodeIHDR() {
  //   // TODO
  // }

  private static decodePixelsData(bytes: Uint8Array, width: number, height: number, pixelBitLength: number): Promise<Uint8ClampedArray> {
    return new Promise<Uint8ClampedArray>((resolve: any, reject: any) => {
      $zlib.inflate(Buffer.from(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.length), (error: any, bytes: Uint8Array) => {
        if(error) {
          reject(error);
          return;
        }

        let index: number = 0;
        let length: number = bytes.length;
        const pixelBytes: number = pixelBitLength / 8;
        const scanLineLength: number = pixelBytes * width;
        const data: Uint8Array = new Uint8Array(scanLineLength * height);
        let dataIndex: number = 0;

        let row: number = 0;

        let byte: number;
        let col: number;
        let upper: number;
        let left: number;
        let upperLeft: number;
        let p: number, pa: number, pb: number, pc: number, paeth: number;

        while(index < length) {
          switch(bytes[index++]) {
            case 0:
              for(let i = 0; i < scanLineLength; i++) {
                data[dataIndex++] = bytes[index++];
              }
              break;
            case 1:
              for(let i = 0; i < scanLineLength; i++) {
                byte = bytes[index++];
                left = (i < pixelBytes) ? 0 : data[dataIndex - pixelBytes];
                data[dataIndex++] = byte + left; // % 256
              }
              break;
            case 2:
              for(let i = 0; i < scanLineLength; i++) {
                byte = bytes[index++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                upper = row && data[(row - 1) * scanLineLength + col * pixelBytes + (i % pixelBytes)];
                data[dataIndex++] = byte + upper; //  % 256
              }
              break;
            case 3:
              for(let i = 0; i < scanLineLength; i++) {
                byte = bytes[index++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                left = i < pixelBytes ? 0 : data[dataIndex - pixelBytes];
                upper = row && data[(row - 1) * scanLineLength + col * pixelBytes + (i % pixelBytes)];
                data[dataIndex++] = byte + Math.floor((left + upper) / 2); //  % 256
              }
              break;
            case 4:
              for(let i = 0; i < scanLineLength; i++) {
                byte = bytes[index++];
                col = (i - (i % pixelBytes)) / pixelBytes;
                left = i < pixelBytes ? 0 : data[dataIndex - pixelBytes];
                if(row === 0) {
                  upper = upperLeft = 0;
                } else {
                  upper = data[(row - 1) * scanLineLength + col * pixelBytes + (i % pixelBytes)];
                  upperLeft = col && data[(row - 1) * scanLineLength + (col - 1) * pixelBytes + (i % pixelBytes)];
                }

                p = left + upper - upperLeft;
                pa = Math.abs(p - left);
                pb = Math.abs(p - upper);
                pc = Math.abs(p - upperLeft);
                if((pa <= pb) && (pa <= pc)) {
                  paeth = left;
                } else if(pb <= pc) {
                  paeth = upper;
                } else {
                  paeth = upperLeft;
                }
                data[dataIndex++] = byte + paeth; //  % 256
              }
              break;
            default:
              reject(new Error('Invalid filter algorithm: ' + bytes[index - 1]));
              return;
          }
          row++;
        }

        resolve(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length));
      });
    });
  }


  public bitDepth: number;
  public colorType: number;
  public compressionMethod: number;
  public filterMethod: number;
  public interlaceMethod: number;

  public palette: Uint8Array;

  public transparency: Transparency;

  public colors: number;
  public hasAlphaChannel: boolean;
  public pixelBitLength: number;
  public colorSpace: string;

  public text: { [key: string]: string };

}


// async function readPNG() {
//   const path: string = '../../src/assets/images/originals/01.png';
//   const fs = require('fs');
//   const bytes: Uint8Array = fs.readFileSync(path);
//   const png = new PNG(bytes);
//   console.log(png);
// }
//
// readPNG();

