import * as $zlib from 'zlib';
import * as $stream from 'stream';
import { GetUninitializedImageResource, ImageResource } from './Image';
import { CRC32 } from '../../classes/CRC';
import { ByteDecoder, ByteStepDecoder, decode, IteratorDecoder } from './Codec';
import { DeferredPromise } from '../../classes/DeferredPromise';

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

export type ArrayBufferView = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array;

export class Uint32BEDecoder extends ByteDecoder<number> {
  protected _offset: number;

  constructor() {
    super();
    this._offset = 32;
    this._output = 0;
  }

  get output(): number {
    return this._output >>> 0;
  }

  next(value: number): void {
    super.throwIfDone();
    this._offset -=8;
    this._output |= value << this._offset;
    this._done = this._offset === 0;
  }
}



export interface Transparency {
  indexed?: Uint8Array;
  grayscale?: number;
  rgb?: Uint8Array;
}



export class IHDRDecoder extends IteratorDecoder<IHDR> {

  constructor(ihdr: IHDR = new IHDR()) {
    super((function * () {
      ihdr.width = (((yield) << 24) | ((yield) << 16) | ((yield) << 8) | (yield)) >>> 0;
      ihdr.height = (((yield) << 24) | ((yield) << 16) | ((yield) << 8) | (yield)) >>> 0;
      ihdr.bitDepth = (yield);
      ihdr.colorType = (yield);
      ihdr.compressionMethod = (yield);
      ihdr.filterMethod = (yield);
      ihdr.interlaceMethod = (yield);

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
    })());

    this._output = ihdr;
  }
}

export class IHDR {
  public width: number;
  public height: number;
  public bitDepth: number;
  public colorType: number;
  public compressionMethod: number;
  public filterMethod: number;
  public interlaceMethod: number;

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
        throw new Error('Invalid color type: ' + this.colorType);
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

  get pixelByteLength(): number {
    return this.pixelBitLength / 8;
  }

}



export class PLTEDecoder extends ByteStepDecoder<PLTE> {

  protected _index: number;

  constructor(chunkSize: number, plte: PLTE = new PLTE()) {
    super(false);
    this._output = plte;

    const size: number = chunkSize / 3;
    if((size % 1) !== 0) throw new Error('Invalid PLTE size : expected a multiple of 3, found ' + chunkSize);
    if((size < 1) || (size > 256)) throw new Error('Invalid PLTE : expected from 1 to 256 palette entries, found ' + size);

    this._output.palette = new Uint8Array(chunkSize);
    this._index = 0;

    this._init();
  }

  protected _next(value: number): void {
    while(true) {
      switch(this._step) {
        case 0:
          this._done = (this._index >= this._output.palette.length);
          this._step = 1;
          return;
        case 1:
          this._output.palette[this._index++] = value;
          this._step = 0;
          break;
        default:
          throw new Error('Invalid step: ' + this._step);
      }
    }
  }
}

export class PLTE {
  public palette: Uint8Array;
}



export class InflateDecoder<T> extends ByteDecoder<T> {
  protected _inflate: $zlib.Inflate;
  protected _decoder: ByteDecoder<T>;

  protected _finishPromise: DeferredPromise<void>;

  constructor(decoder: ByteDecoder<T>) {
    super();

    this._decoder = decoder;

    this._finishPromise = new DeferredPromise<void>();

    this._inflate = $zlib.createInflate();
    this._inflate.on('data', (data: Uint8Array) => {
      for(let i = 0; i < data.length; i++) {
        this._decoder.next(data[i]);
      }
    });

    this._inflate.on('finish', () => {
      console.log('finish');
      if(this._decoder.done) {
        this._finishPromise.resolve();
      } else {
        this._finishPromise.reject(new Error('Inflate finished bot decoder still expects some data'));
      }
    });

    this._inflate.on('error', (error: any) => {
      this._done = true;
      this._finishPromise.reject(error);
    });

    // this._init();
  }

  get finished(): Promise<void> {
    return this._finishPromise.promise;
  }

  get output(): T {
    return this._decoder.output;
  }

  // protected _next(value: number): void {
  //   while(true) {
  //     switch(this._step) {
  //       case 0:
  //         console.log(this._decoder);
  //         this._done = this._decoder.done;
  //         if(this._done) {
  //           // this._inflate.flush();
  //           console.log('end');
  //           this._inflate.end();
  //         }
  //         this._step = 1;
  //         return;
  //       case 1:
  //         this._inflate.write(new Uint8Array([value]));
  //         this._step = 0;
  //         break;
  //     }
  //   }
  // }

  next(value: number): void {
    super.throwIfDone();
    this._inflate.write(new Buffer([value]));
  }

  end(): Promise<void> {
    this._done = true;
    this._inflate.end();
    return this._finishPromise.promise;
  }
}


export class PNGFilterDecoder extends ByteStepDecoder<IDAT> {

  static getArrayBufferViewConstructorFromBitDepth(bitDepth: number): new (...arg:any[]) => ArrayBufferView {
    switch(bitDepth) {
      case 1:
      case 2:
      case 4:
      case 8:
        return Uint8Array;
      case 16:
        return Uint16Array;
      default:
        throw new Error('Invalid bitDepth: ' + bitDepth);
    }
  }


  protected _ihdr: IHDR;

  protected _pixelByteLength: number;

  protected _rowCount: number;
  protected _rowIndex: number;

  protected _scanLineSize: number;
  protected _scanLineIndex: number;
  protected _scanLineStep: number;

  protected _dataIndex: number;

  protected _bufferBitLength: number;


  constructor(ihdr: IHDR, idat: IDAT = new IDAT()) {
    super(false);
    this._ihdr    = ihdr;
    this._output  = idat;
    this._init();
  }

  __next(value: number): void {
    console.log('value', value);

    // if(value === 36)
    // this._done = true;

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
  }


  protected _next(value: number): void {
    console.log('value', value);

    while(true) {
      console.log('this._step', this._step);
      switch(this._step) {
        case 0:
          this._pixelByteLength = this._ihdr.pixelByteLength;

          console.log(this._ihdr);
          this._rowCount        = this._ihdr.height;
          this._rowIndex        = 0;

          this._scanLineSize    = this._pixelByteLength * this._ihdr.width;
          this._scanLineIndex   = 0;

          this._bufferBitLength = 8;
          this._output.data     = new (PNGFilterDecoder.getArrayBufferViewConstructorFromBitDepth(this._ihdr.bitDepth))(this._ihdr.width * this._ihdr.height * 4);
          this._dataIndex       = 0;

        case 4:
          this._done = (this._rowIndex >= this._rowCount);
          this._step = 5;
          return;

        case 5: // switch filter type
          switch(value) {
            case 0:
              this._scanLineStep = 10;
              break;
            case 1:
              this._scanLineStep = 20;
              break;
            case 2:
              this._scanLineStep = 30;
              break;
            case 3:
              this._scanLineStep = 40;
              break;
            case 4:
              this._scanLineStep = 50;
              break;
            default:
              throw new Error('Invalid filter algorithm: ' + value);
          }
          this._scanLineIndex = 0;

        case 6:
          if(this._scanLineIndex >= this._scanLineSize) {
            this._rowIndex++;
            this._step = 4;
            break;
          }
          this._step = this._scanLineStep;
          break;

        case 10:
          this._step = 11;
          return;
        case 11:
          switch(this._ihdr.colorType) {
            case 0: // Each pixel is a grayscale sample.
              const mask: number = 0b11111111 >> (8 - this._ihdr.bitDepth);

              for(let i = 0; i < 8; i += this._ihdr.bitDepth) {
                let colorValue: number = ((value >> i) & mask);
                let color: number = 0;
                for(let j = 0; j < this._bufferBitLength; j += this._ihdr.bitDepth) { color |= colorValue << j; }
                // console.log('color', color);
                this._output.data[this._dataIndex++] = color;
                this._output.data[this._dataIndex++] = color;
                this._output.data[this._dataIndex++] = color;
                this._output.data[this._dataIndex++] = (1 << this._bufferBitLength) - 1;
              }

              break;
            case 2: // Each pixel is an R,G,B triple
              break;

            default:
              throw new Error('Unsuported color type: ' + this._ihdr.colorType);
          }

          console.log(this._output.data);
          throw 'end';
          this._output.data[this._dataIndex++] = value;
          this._step = 7;
          break;

        default:
          throw new Error('Invalid step: ' + this._step);


      }
    }
  }
}

export class IDATDecoder extends InflateDecoder<IDAT> {
  constructor(ihdr: IHDR, idat?: IDAT) {
    super(new PNGFilterDecoder(ihdr, idat));
  }
}

export class IDAT {
  public data: ArrayBufferView;
}



class IDATDecoder_old extends $stream.Writable {

  static * decoder(width: number, height: number, pixelBytes: number): IterableIterator<void> {
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
    return IDATDecoder.decoder(this.png.width, this.png.height, this.png.pixelBitLength / 8);
  }

}


// https://github.com/arian/pngjs/blob/master/PNGReader.js
// http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html

export class PGNDecoder extends $stream.Writable {

  static * decoder(): IterableIterator<void> {
    const png: PNG = GetUninitializedImageResource(PNG) as PNG;
    const crc32: CRC32 = new CRC32();

    yield* this.verifySignature();

    let chunkSize: number;
    let chunkType: string;
    let chunkCRC: number;
    let computedChunkCRC: IteratorResult<number>;
    let crcDecoder: IterableIterator<number>;

    let idatDecoder: IDATDecoder;
    let decoder: ByteDecoder<any>;

    while(true) {
      chunkSize = (((yield) << 24) | ((yield) << 16) | ((yield) << 8) | (yield)) >>> 0;

      crcDecoder = crc32.decoder();
      computedChunkCRC = crcDecoder.next();

      chunkType = '';
      for(let i = 0; i < 4; i++) {
        const byte: number = yield;
        computedChunkCRC = crcDecoder.next(byte);
        chunkType += String.fromCharCode(byte);
      }

      // console.log(chunkSize, chunkType);

      switch(chunkType) {
        case 'IHDR':
          decoder = new IHDRDecoder(png.IHDR);
          break;
        case 'PLTE':
          decoder = new PLTEDecoder(chunkSize, png.PLTE);
          break;
        case 'IDAT':
          decoder = idatDecoder;
          break;
        case 'IEND':
          return idatDecoder.end();
        default:
          console.log('unknown chunk', chunkType);
          break;
      }

      for(let i = 0; i < chunkSize; i++) {
        const byte: number = yield;
        computedChunkCRC = crcDecoder.next(byte);
        decoder.next(byte);
      }

      // if(!decoder.done) throw new Error('Unprocessed data');

      chunkCRC = (((yield) << 24) | ((yield) << 16) | ((yield) << 8) | (yield)) >>> 0;
      if(chunkCRC !== computedChunkCRC.value) {
        console.log(chunkType);
        throw new Error(
          'Chunk CRC mismatch : \n'
          + '0x' + chunkCRC.toString(16).padStart(8, '0') + ' - '
          + '0x' + computedChunkCRC.value.toString(16).padStart(8, '0')
        );
      }

      switch(chunkType) {
        case 'IHDR':
          idatDecoder = new IDATDecoder(png.IHDR, png.IDAT);
          break;
      }
    }
  }


  private static signature: Uint8Array = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  private static * verifySignature(): IterableIterator<void> {
    for(let i = 0; i < 8; i++) {
      if((yield) !== this.signature[i]) throw new Error('Invalid png signature');
    }
  }


  private _decoder: IterableIterator<void>;

  constructor() {
    super({ objectMode: false });
    this._decoder = PGNDecoder.decoder();
    this._decoder.next();
  }

  _write(data: Uint8Array, encoding: any, callback: any) {
    for(let i = 0; i < data.length; i++) {
      const result = this._decoder.next(data[i]);
      if(result.done) {
        this.end();
      }
    }
    callback();
  }

  _final(callback: any) {
  }
}










export class PNG extends ImageResource {
  public IHDR: IHDR = new IHDR();
  public PLTE: PLTE = new PLTE();
  public IDAT: IDAT = new IDAT();
}


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

readPNG().catch(error => console.log(error));

