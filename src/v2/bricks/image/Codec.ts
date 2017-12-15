export type Constructor<T> = new(...args: any[]) => T;

export abstract class Iterator {
  protected _done: boolean;

  constructor() {
    this._done = false;
  }

  get done(): boolean {
    return this._done;
  }

  protected throwIfDone(): void {
    if(this.done) throw new Error(this.constructor.name + ' is done');
  }
}


export abstract class ByteEncoder<T> extends Iterator {
  protected _input: T;

  constructor(input: T) {
    super();
    this._input = input;
  }

  get input(): T {
    return this._input;
  }

  abstract next(): number;
}

export abstract class ByteDecoder<T> extends Iterator {
  protected _output: T;

  constructor() {
    super();
    this._output = null;
  }

  get output(): T {
    return this._output;
  }

  abstract next(value: number): void;
}




export abstract class ByteStepEncoder<T> extends ByteEncoder<T> {
  protected _step: number;
  protected _yieldValue: number;

  constructor(input: T, initCall: boolean = true) {
    super(input);
    this._step = 0;
    if(initCall) this._init();
  }

  next(): number {
    super.throwIfDone();
    const value: number = this._yieldValue;
    this._yieldValue = this._next();
    return value;
  }

  protected _init(): void {
    this._yieldValue = this._next();
  }

  protected abstract _next(): number;
}

export abstract class ByteStepDecoder<T> extends ByteDecoder<T> {
  protected _step: number;

  constructor(initCall: boolean = true) {
    super();
    this._step = 0;
    if(initCall) this._init();
  }

  next(value: number): void {
    super.throwIfDone();
    this._next(value);
  }

  protected _init(): void {
    this._next(0);
  }

  protected abstract _next(value: number): void;
}


export class IteratorDecoder<T> extends ByteDecoder<T>{
  protected _iterator: IterableIterator<T | void>;

  constructor(iterator: IterableIterator<T | void>, initCall: boolean = true) {
    super();
    this._iterator = iterator;
    if(initCall) this._init();
  }

  next(value: number) {
    const result: IteratorResult<T | void> = this._iterator.next(value);
    this._done = result.done;
    if(this._done) this._output = result.value as any;
  }

  protected _init(): void {
    this.next(0);
  }
}


export function encode<T = any>(encoder: ByteEncoder<T>): number[] {
  const buffer: number[] = [];
  while(!encoder.done) {
    buffer.push(encoder.next());
  }
  return buffer;
}

export function decode<T = any>(decoder: ByteDecoder<T>, buffer: number[]): T {
  let i = 0;
  while(!decoder.done) {
    if(i >= buffer.length) throw new Error('Buffer overflow');
    decoder.next(buffer[i]);
    i++;
  }
  return decoder.output;
}

export function codec<T>(encoder: ByteEncoder<T>, decoder: ByteDecoder<T>): T {
  const buffer: number[] = encode(encoder);
  console.log(buffer);

  const output: T = decode(decoder, buffer);
  console.log(output);

  return output;
}

export function testClone<T>(
  encoder: Constructor<ByteEncoder<T>>,
  decoder: Constructor<ByteDecoder<T>>,
  input: T,
  encoderArgs: any[] = [],
  decoderArgs: any[] = [],
): void {
  const output: T = codec(
    Reflect.construct(encoder, [input, ...encoderArgs]),
    Reflect.construct(decoder, [...decoderArgs])
  );

  if(JSON.stringify(input) !== JSON.stringify(output)) {
    if((typeof input === 'number') && (typeof output === 'number')) {
      if(Math.abs(input - output) < 1e-4) return;
    }
    throw new Error('Failed to serialize/deserialize : ' + JSON.stringify(input) + ' - ' + JSON.stringify(output));
  }
}
