import * as $zlib from 'zlib';
import * as $stream from 'stream';
import { GetUninitializedImageResource, ImageResource } from './Image';
import { CRC32 } from '../../classes/CRC';


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

  static * decode(width: number, height: number, pixelBytes: number): IterableIterator<void> {
    const scanLineLength: number  = pixelBytes * width;
    const data: Uint8Array        = new Uint8Array(scanLineLength * height);
    let dataIndex: number = 0;

    while(dataIndex < data.length) {
      const type: number = yield;
      switch(type) { // filter type
        case 0: // none
          for(let i = 0; i < scanLineLength; i++) {
            data[dataIndex++] = yield;
          }

          console.log(data);
          break;
        default:
          console.log('unknown filter type', type);
      }
    }

    console.log('FINISH');

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


  public png: PNG;

  private _data: Uint8Array;
  private _inflate: $zlib.Inflate;
  private _decoder: IterableIterator<void>;

  constructor(png: PNG) {
    super({ objectMode: false });
    this.png = png;
  }

  get data(): Uint8ClampedArray {
    return new Uint8ClampedArray(this._data.buffer, this._data.byteOffset, this._data.length);
  }

  init() {
    this._data = new Uint8Array(this.png.width * this.png.height * 4);

    this._inflate = $zlib.createInflate();
    this._inflate.on('data', (data: Uint8Array) => {
      for(let i = 0; i < data.length; i++) {
        // console.log(data[i]);
        this._decoder.next(data[i]);
      }
    });

    this._decoder = this.decode();
    this._decoder.next();
  }


  _write(data: Uint8Array, encoding: any, callback: any) {
    this._inflate.write(data, callback);
  }


  protected decode(): IterableIterator<void> {
    return IDATDecoder.decode(this.png.width, this.png.height, this.png.pixelBitLength / 8);
  }

}

console.log('png');

// https://github.com/arian/pngjs/blob/master/PNGReader.js
// http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html

export class PGNDecoder extends $stream.Writable {



  static * decode(): IterableIterator<any> {
    const png: PNG = GetUninitializedImageResource(PNG) as PNG;
    const crc: CRC32 = new CRC32();

    yield* this.verifySignature();

    while(true) {
      yield* this.decodeChunk(bytes, index, crc);

      // console.log('chunk', chunk, index);

      // switch(chunk.type) {
      //   case 'IHDR':
      //     this.decodeIHDR(chunk, png);
      //     pixelDecoder.init();
      //     break;
      //   case 'PLTE':
      //     this.decodePLTE(chunk, png);
      //     break;
      //   case 'IDAT':
      //     console.log(chunk.data);
      //     pixelDecoder.write(chunk.data);
      //     throw 'ok';
      //     break;
      //   case 'IEND':
      //     pixelDecoder.end();
      //     return;
      //
      //   // case 'tRNS':
      //   //   png.transparency = {};
      //   //   switch(png.colorType) {
      //   //     case 3:
      //   //       png.transparency.indexed = new Uint8Array(Math.max(255, chunkSize));
      //   //       for(let i = 0; i < chunkSize; i++) {
      //   //         png.transparency.indexed[i] = bytes[index + i];
      //   //       }
      //   //       for(let i = chunkSize; i < 255; i++) {
      //   //         png.transparency.indexed[i] = 255;
      //   //       }
      //   //       index += chunkSize;
      //   //       break;
      //   //     case 0:
      //   //       png.transparency.grayscale = bytes[index];
      //   //       index += chunkSize;
      //   //       break;
      //   //     case 2:
      //   //       png.transparency.rgb = bytes.slice(index, index + chunkSize); // or subarray
      //   //       index += chunkSize;
      //   //       break;
      //   //   }
      //   //   break;
      //   // case 'tEXt':
      //   //   let key: string = '';
      //   //   let value: string = '';
      //   //   let i: number = index;
      //   //   let l: number = index + chunkSize;
      //   //   let char: number;
      //   //   for(; i < l; i++) {
      //   //     char = bytes[i];
      //   //     if(char === 0) break;
      //   //     key += String.fromCharCode(char);
      //   //   }
      //   //   for(; i < l; i++) {
      //   //     char = bytes[i];
      //   //     value += String.fromCharCode(char);
      //   //   }
      //   //   png.text[key] = value;
      //   //   index += chunkSize;
      //   //   break;
      //
      //   default:
      //     console.log('unknown chunk', chunk.type);
      //     break;
      // }

      // if(index > bytes.length) {
      //   reject(new Error('Incomplete or corrupt PNG file'));
      //   return;
      // }
    }
  }


  private static signature: Uint8Array = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  private static * verifySignature(): IterableIterator<void> {
    for(let i = 0; i < 8; i++) {
      if((yield) !== this.signature[i]) throw new Error('Invalid png signature');
    }
  }

  private static * decodeChunk(crc32: CRC32 = new CRC32()): IterableIterator<void> {
    const chunk: PNGChunk = {};
    chunk.size = (((yield) << 24) | ((yield) << 16) | ((yield) << 8) | (yield)) >>> 0;

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





  public png: PNG;
  private _decoder: IterableIterator<void>;

  constructor(png: PNG) {
    super({ objectMode: false });
    this.png = png;

    this._decoder = PGNDecoder.decode();
    this._decoder.next();
  }

  _write(data: Uint8Array, encoding: any, callback: any) {
    for(let i = 0; i < data.length; i++) {
      this._decoder.next(data[i]);
    }
  }
}













export class PNG extends ImageResource implements IHDR, PLTE {

  static signature: Uint8Array = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);


  static fromBytes(bytes: Uint8Array): Promise<PNG> {
    return new Promise((resolve: any, reject: any) => {
      const png: PNG = GetUninitializedImageResource(PNG) as PNG;
      const crc: CRC32 = new CRC32();

      let index: number = this.verifySignature(bytes);

      let chunk: PNGChunk;
      const pixelDecoder: IDATDecoder = new IDATDecoder(png);

      pixelDecoder.on('finish', () => {
        resolve(png);
      });

      pixelDecoder.on('error', (error: any) => {
        reject(error);
      });

      while(true) {
        [index, chunk] = this.decodeChunk(bytes, index, crc);

        // console.log('chunk', chunk, index);

        switch(chunk.type) {
          case 'IHDR':
            this.decodeIHDR(chunk, png);
            pixelDecoder.init();
            break;
          case 'PLTE':
            this.decodePLTE(chunk, png);
            break;
          case 'IDAT':
            console.log(chunk.data);
            pixelDecoder.write(chunk.data);
            throw 'ok';
            break;
          case 'IEND':
            pixelDecoder.end();
            return;

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

    if(
      ((ihdr.colorType === 0) && ![1, 2, 4, 8, 16].includes(ihdr.bitDepth))
      || ((ihdr.colorType === 2) && ![8, 16].includes(ihdr.bitDepth))
      || ((ihdr.colorType === 3) && ![1, 2, 4, 8].includes(ihdr.bitDepth))
      || ((ihdr.colorType === 4) && ![8, 16].includes(ihdr.bitDepth))
      || ((ihdr.colorType === 6) && ![8, 16].includes(ihdr.bitDepth))
    ) {
      throw new Error('Invalid IHDR : the colorType (' + ihdr.colorType + ') doesn\'t accept this bitDepth (' + ihdr.bitDepth + ')');
    }


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

  // public transparency: Transparency;

  // public colors: number;
  // public hasAlphaChannel: boolean;
  // public pixelBitLength: number;
  // public colorSpace: string;

  // public text: { [key: string]: string };

  get colors(): number {
    switch(this.colorType) {
      case 0:
      case 3:
      case 4:
        return 1;
      case 2:
      case 6:
        return 3;
      default:
        throw new Error('Invalid color type');
    }
  }

  get colorSpace(): string {
    switch(this.colorType) {
      case 0:
      case 3:
      case 4:
        return 'DeviceGray';
      case 2:
      case 6:
        return 'DeviceRGB';
      default:
        throw new Error('Invalid color type');
    }
  }

  get hasAlphaChannel(): boolean {
    return (this.colorType === 4) || (this.colorType === 6);
  }

  get pixelBitLength(): number {
    return (this.bitDepth * (this.colors + (this.hasAlphaChannel ? 1 : 0)));
  }

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



async function readPNG() {
  // console.log(decode(new Uint32BEDecoder(), [0xf7, 0xff, 0xff, 0xf1]).toString(16));

  const path: string = '../../../src/assets/images/other/red_px.png';
  const fs = require('fs');
  const bytes: Uint8Array = fs.readFileSync(path);
  const pngDecoder: PGNDecoder = new PGNDecoder();
  pngDecoder.write(bytes);

  pngDecoder.on('finish', () => {
    console.log('done');
  });

  pngDecoder.on('error', (error: any) => {
    console.log('error', error);
  });

  // const png = new PNG(bytes);
  // console.log(png);
}

// readPNG().catch(error => console.log(error));

