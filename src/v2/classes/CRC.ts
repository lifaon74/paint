
// https://github.com/emn178/js-crc/blob/master/src/crc.js
// https://stackoverflow.com/questions/18638900/javascript-crc32


export class CRC32 {

  static initialValue: number = (0 ^ (-1));

  static createTable(polynomial: number): Uint32Array {
    const table: Uint32Array = new Uint32Array(256);
    let value: number;
    for(let i = 0, l = table.length; i < l; i++) {
      value = i;
      for(let j = 0; j < 8; j++) {
        value = (value & 1)
          ? (polynomial ^ (value >>> 1))
          : (value >>> 1);
      }
      table[i] = value >>> 0;
    }
    return table;
  }


  protected _table: Uint32Array;
  protected _polynomial: number;

  constructor(polynomial: number | Uint8Array | [number, number, number, number] = 0xedb88320) {
    if(Array.isArray(polynomial) || ArrayBuffer.isView(polynomial)) {
      if(polynomial.length !== 4) throw new Error('Expected a length of 4 for polynomial');
      polynomial = (polynomial[0] << 24) | (polynomial[1] << 16) | (polynomial[2] << 8) | (polynomial[3]);
    } else if(typeof polynomial !== 'number') {
      throw new Error('Expected a number or array as polynomial');
    }

    this.polynomial = polynomial;
  }

  get polynomial(): number {
    return this._polynomial;
  }

  set polynomial(value: number) {
    this._polynomial = value;
    this._table = CRC32.createTable(this._polynomial);
  }

  hash(bytes: Uint8Array, crc: number = CRC32.initialValue): number {
    for(let i = 0, l = bytes.length; i < l; i++) {
      crc = this._table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8) ;
    }
    return (crc ^ (-1)) >>> 0;
  }

  * decoder(crc: number = CRC32.initialValue): IterableIterator<number> {
    let byte: number;
    while(true) {
      byte = yield ((crc ^ (-1)) >>> 0);
      crc = (this._table[(crc ^ byte) & 0xff] ^ (crc >>> 8));
    }
  }
}

function test() {

  const entries: [any, number][] = [
    [new Uint8Array([
      84, 104, 101, 32, 113, 117, 105, 99, 107, 32,
      98, 114, 111, 119, 110, 32, 102, 111, 120, 32,
      106, 117, 109, 112, 115, 32, 111, 118, 101, 114,
      32, 116, 104, 101, 32, 108, 97, 122, 121, 32,
      100, 111, 103
    ]), 0x414fa339],
  ];

  const crc32: CRC32 = new CRC32();
  for(const entry of entries) {
    if(crc32.hash(entry[0]) !== entry[1]) {
      console.log(entry);
      throw new Error('Invalid crc');
    }

    const decoder = crc32.decoder();
    decoder.next();

    let result: IteratorResult<number>;
    for(const byte of entry[0]) {
      result = decoder.next(byte);
    }
    if(result.value !== entry[1]) {
      throw new Error('Invalid crc');
    }
  }
}
// test();
