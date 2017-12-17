import { Matrix } from './Matrix';

export type Constructor<T> = new (...args: any[]) => T;

export type ArrayBufferView = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array;
export type NumberArray = ArrayBufferView | Array<number>;


export class Vector {
  static length(vectors: NumberArray, index: number, dimension: number): number {
    let value: number = 0;
    for(let i = index * dimension, l = i + dimension; i < l; i++) {
      value += vectors[i] * vectors[i];
    }
    return Math.sqrt(value);
  }

  static lengthBulk(vectors: NumberArray, dimension: number, output: NumberArray = new (vectors.constructor as any)(vectors.length / dimension)): NumberArray {
    let value: number;
    let j: number = 0;
    for(let i = 0, l = output.length; i < l; i++) {
      value = 0;
      for(let s = j + dimension; j < s; j++) {
        value += vectors[j] * vectors[j];
      }
      output[i] = Math.sqrt(value);
    }
    return output;
  }

  static add(vectors_1: NumberArray, vectors_2: NumberArray, index: number, dimension: number, output: NumberArray = new (vectors_1.constructor as any)(vectors_1.length)): NumberArray {
    for(let i = index * dimension, l = i + dimension; i < l; i++) {
      output[i] = vectors_1[i] + vectors_2[i];
    }
    return output;
  }

  static addBulk(vectors_1: NumberArray, vectors_2: NumberArray, dimension: number, output: NumberArray = new (vectors_1.constructor as any)(vectors_1.length)): NumberArray {
    for(let i = 0, l = vectors_1.length; i < l; i++) {
      output[i] = vectors_1[i] + vectors_2[i];
    }
    return output;
  }
}

export class Vector3 {

  static length(vectors: ArrayBufferView, index: number) {

  }

  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
  ) {}

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}


export class Camera {

}

export class Renderer {
  public gl: WebGLRenderingContext;

  protected program: WebGLProgram;

  constructor() {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    this.gl = canvas.getContext('webgl');

    this.append();
    this.setSize(500, 500);
  }

  append(container: HTMLElement = document.body): void {
    container.appendChild(this.gl.canvas);
  }

  setSize(width: number, height: number): void {
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  init() {
    const vertexShader    = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader  = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = this.createProgram(vertexShader, fragmentShader);


  }


  render() {

    const positionAttributeLocation: number = this.gl.getAttribLocation(this.program, 'a_position');


    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      0, 0.5,
      0.5, 0,
    ]), this.gl.STATIC_DRAW);




    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);

    this.gl.enableVertexAttribArray(positionAttributeLocation);

    this.gl.vertexAttribPointer(
      positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0
    );

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }


  createShader(type: number, source: string): WebGLShader {
    const shader: WebGLShader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if(this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      return shader;
    } else {
      throw this.gl.getShaderInfoLog(shader);
      // this.gl.deleteShader(shader);
    }
  }

  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program: WebGLProgram = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if(this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      return program;
    } else {
      throw this.gl.getProgramInfoLog(program);
      // this.gl.deleteProgram(program);
    }
  }
}





const vertexShaderSource: string = `
  // an attribute will receive data from a buffer
  attribute vec4 a_position;
  
  // all shaders have a main function
  void main() {
    // gl_Position is a special variable a vertex shader
    // is responsible for setting
    gl_Position = a_position;
  }
`;

const fragmentShaderSource: string = `
  // fragment shaders don't have a default precision so we need
  // to pick one. mediump is a good default
  precision mediump float;
  
  void main() {
    // gl_FragColor is a special variable a fragment shader
    // is responsible for setting
    gl_FragColor = vec4(1, 0, 0.5, 1); // return redish-purple
  }
`;

export class VoxelBlock {
  public position: Vector3;
  public size: Vector3;
  public data: Uint8ClampedArray;

  createBuffers(gl: WebGLRenderingContext) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, someData, gl.STATIC_DRAW);
  }
}

// http://learningwebgl.com/blog/?page_id=1217
// http://learningwebgl.com/blog/?p=28
// https://webglfundamentals.org/

function vectorTest() {
  console.log(Vector.length([1, 1], 0, 2));
  console.log(Vector.lengthBulk([1, 1, -1, -1], 2));

  console.log(Vector.add([1, 1], [2, 2], 0, 2));
  console.log(Vector.addBulk([1, 1, -1, -2], [2, 2, 5, 6], 2));
}




const red: number[] = [255, 0, 0, 255];
const green: number[] = [0, 255, 0, 255];
const blue: number[] = [0, 0, 255, 255];

async function test() {
  // console.log(await canvasKey());

  // const mat = new Matrix(5).identity();
  // console.log(mat.toString());

  // const block: VoxelBlock = new VoxelBlock();
  //
  // block.size = new Vector3(2, 2, 2);
  // block.data = new Uint8ClampedArray([
  //   ...red,  ...red,
  //   ...green, ...green,
  //   ...red,  ...red,
  //   ...blue, ...blue,
  // ]);
  //
  // const renderer: Renderer = new Renderer();
  // renderer.init();
  // renderer.render();
  //
  // console.log('ok');


}

function canvasKey(){
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  const context: CanvasRenderingContext2D = canvas.getContext('2d');

  const gradient = context.createLinearGradient(0, 0, 70, 70);
  gradient.addColorStop(0, '#dddedf');
  gradient.addColorStop(1, '#5062A4');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 60, 60);

  const typefaces = ['sans-serif', 'serif', 'fantasy', 'cursive', 'monospace', '-no-font-', navigator.userAgent, screen.width];
  for (let i = 0; i < typefaces.length; i++) {
    context.font = '14px ' + typefaces[i];
    context.fillStyle = 'rgba(202, 56, 202, 0.53)';
    context.fillText('canvasprint.js 个個칼', i, 10 + (6 * i));
  }

  const buffer = new TextEncoder('utf-8').encode(canvas.toDataURL()); // better than getImageData because PNG encoding may vary
  return crypto.subtle.digest('SHA-256', buffer).then( (hash: ArrayBuffer) => {
    let string: string = '';
    const data: Uint8Array = new Uint8Array(hash);
    for (let i = 0, l = data.length; i < l; i++) {
      string += data[i].toString(16).padStart(2, '0');
    }
    return string;
  });
}

export class Octree {
  static computeMaxOctreeSize(depth: number): number {
    return (depth === 0) ? 0 : this.computeMaxOctreeSize(depth - 1) * 8 + 33;
  }

  static computeMaxOctreeDepth(maxSize: number): number {
    let size: number = 0;
    let depth: number = 0;
    while(size < maxSize) {
      size = size * 8 + 33;
      depth++;
    }
    return depth - 1;
  }

  static compute3DTextureDepth(texture: Uint8Array): number {
    const depth: number = Math.round(Math.log2(Math.pow(texture.length / 4, 1 / 3)));
    if((depth < 1) || (Math.pow(2, depth * 3) !== (texture.length / 4))) {
      throw new Error('Invalid data size : array side must be a power of 2 with a min side of 2');
    }
    return depth;
  }

  static from3DTexture(texture: Uint8Array): Octree {
    const depth: number = this.compute3DTextureDepth(texture);
    const data: Uint8Array = new Uint8Array(this.computeMaxOctreeSize(depth));
    const tree: Octree = new Octree(depth, data);
    const side: number = tree.side;
    let i: number = 0;

    for(let z = 0; z < side; z++) {
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          tree.setColorAt(x, y, z, texture.subarray(i, i + 4));
          i += 4;
        }
      }
    }

    return tree;
  }


  public depth: number;
  public data: Uint8Array;
  public mappedChunk: Uint8Array;

  constructor(depth: number, data: Uint8Array, mappedChunk: Uint8Array = new Uint8Array(Math.ceil(data.length / 33 / 8))) {
    this.depth = depth;
    this.data = data; // [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    this.mappedChunk = mappedChunk;
  }

  get side(): number {
    return 0x1 << this.depth; // Math.pow(2, this.depth)
  }

  setMapped(index: number, value: boolean | number): void {
    index = Math.floor(index / 33);
    if(value) {
      this.mappedChunk[index >> 3] |= (0x1 << (index % 8));
    } else {
      this.mappedChunk[index >> 3] &= ~(0x1 << (index % 8));
    }
  }

  getMapped(index: number): number {
    index = Math.floor(index / 33);
    return this.mappedChunk[index >> 3] & (0x1 << (index % 8));
  }

  getFirstAvailableChunk(): number {
    let value: number;
    for(let i = 0, l = this.mappedChunk.length; i < l; i++) {
      value = this.mappedChunk[i];
      if(value !== 0b11111111) {
        for(let j = 0; j <= 8; j++) {
          if((value & (0x1 << j)) === 0) {
            const index: number = (i << 3) | j;
            return ((index * 33) < this.data.length) ? index : -1;
          }
        }
      }
    }
    return -1;
  }

  setColorAt(x: number, y: number, z: number, color: Uint8Array): void {
    let depth: number = this.depth;
    let dataIndex: number = 0;
    // let side = 0x1 << (depth - 1);
    let depthOffset: number = depth - 1;

    if(!this.getMapped(dataIndex)) {
      this.setMapped(dataIndex, true);
    }

    // insert color at proper place
    while(depth > 0) {
      const coordsOffset: number = (
        ((x >> depthOffset) & 0x1)
        | (((y >> depthOffset) & 0x1) << 1)
        | (((z >> depthOffset) & 0x1) << 2)
      ) >>> 0;
      const _dataIndex: number = dataIndex + 1 + coordsOffset * 4;

      if(depth === 1) {
        // for depth === 1 mask should be equals to 'color' by default
        // this.data[dataIndex] &= ~(0x1 << coordsOffset);

        this.data[_dataIndex    ] = color[0];
        this.data[_dataIndex + 1] = color[1];
        this.data[_dataIndex + 2] = color[2];
        this.data[_dataIndex + 3] = color[3];

        // this.mergeColorsAt(dataIndex);
        break;
      } else {

        if((this.data[dataIndex] >> coordsOffset) & 0x1) { // is index
          dataIndex = (
            (this.data[_dataIndex])
            | (this.data[_dataIndex + 1] << 8)
            | (this.data[_dataIndex + 2] << 16)
            | (this.data[_dataIndex + 3] << 24)
          ) >>> 0;
        } else {
          if(
            (this.data[_dataIndex    ] === color[0])
            && (this.data[_dataIndex + 1] === color[1])
            && (this.data[_dataIndex + 2] === color[2])
            && (this.data[_dataIndex + 3] === color[3])
          ) { // same colors
            // here we are not at the deepest lvl, colors are the same and chunk should already be optimized
            break; // touch nothing
          } else { // colors are different => must split current color to another chunk

            const newIndex: number = this.getFirstAvailableChunk() * 33;
            if(newIndex < 0) throw new Error(`Missing space`);
            this.setMapped(newIndex, true);

            // init new chunk with previous color
            for(let i = newIndex + 1, l = i + 32; i < l; i += 4) {
              this.data[i    ] = this.data[_dataIndex    ];
              this.data[i + 1] = this.data[_dataIndex + 1];
              this.data[i + 2] = this.data[_dataIndex + 2];
              this.data[i + 3] = this.data[_dataIndex + 3];
            }

            // replace mask color by index
            this.data[dataIndex] |= (0x1 << coordsOffset);
            // replace color by index
            this.data[_dataIndex    ] = newIndex;
            this.data[_dataIndex + 1] = newIndex >> 8;
            this.data[_dataIndex + 2] = newIndex >> 16;
            this.data[_dataIndex + 3] = newIndex >> 24;

            dataIndex = newIndex;
            // console.log('assign new chunk');
          }
        }

        // console.log('dataIndex', dataIndex);
      }

      depth--;
      depthOffset--;
    }
  }

  getColorAt(x: number, y: number, z: number): Uint8Array {
    let depth: number = this.depth;
    let dataIndex: number = 0;
    // let side = 0x1 << (depth - 1);
    let depthOffset: number = depth - 1;

    while(depth > 0) {
      // const offset: number = Math.floor(x / side) + Math.floor(y / side) * 2 + Math.floor(z / side) * 4; // x + y * 2 + z * 4
      const coordsOffset: number = (
        ((x >> depthOffset) & 0x1)
        | (((y >> depthOffset) & 0x1) << 1)
        | (((z >> depthOffset) & 0x1) << 2)
      ) >>> 0; // x + y * 2 + z * 4
      const _dataIndex: number = dataIndex + 1 + coordsOffset * 4;

      // console.log('coordsOffset', coordsOffset);
      if((this.data[dataIndex] >> coordsOffset) & 0x1) {
        dataIndex = (
          (this.data[_dataIndex])
          | (this.data[_dataIndex + 1] << 8)
          | (this.data[_dataIndex + 2] << 16)
          | (this.data[_dataIndex + 3] << 24)
        ) >>> 0;
        // console.log('dataIndex', dataIndex);
        depth--;
        depthOffset--;
      } else {
        return this.data.subarray(_dataIndex, _dataIndex + 4);
        // return new Uint8Array(this.data.buffer, _dataIndex, 4);
      }
    }

    throw new Error('Invalid coords');
  }


  protected mergeColorsAt(dataIndex: number): void {

    for(let i = dataIndex + 1, l = i + 32; i < l; i += 4) {
      this.data[i    ] = this.data[_dataIndex    ];
      this.data[i + 1] = this.data[_dataIndex + 1];
      this.data[i + 2] = this.data[_dataIndex + 2];
      this.data[i + 3] = this.data[_dataIndex + 3];
    }
  }

}





function getTextureColorAt(x: number, y: number, z: number, texture: Uint8Array): Uint8Array {
  const depth: number = Octree.compute3DTextureDepth(texture);
  const index: number = x | (y << depth) | (z << (depth << 1));
  return new Uint8Array(texture.buffer, index * 4, 4);
}

function generateRandom3DTexture(side: number): Uint8Array {
  const data: Uint8Array = new Uint8Array(side * side * side * 4);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 256;
  }
  return data;
}

function generate3DTexture(side: number, callback: (x: number, y: number, z: number) => Uint8Array): Uint8Array {
  const data: Uint8Array = new Uint8Array(side * side * side * 4);
  let j: number = 0;
  for(let z = 0; z < side; z++) {
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const color: Uint8Array = callback(x, y, z);
        for(let i = 0; i < 4; i++) {
          data[j++] = color[i];
        }
      }
    }
  }
  return data;
}



function testImport(texture: Uint8Array): void {
  const tree = Octree.from3DTexture(texture);
  // console.log(tree.data.join(', '));
  // console.log('length:', tree.data.length);
  // for(let i = 0; i < tree.data.length / 33; i++) {
  //   console.log(tree.data.slice(i * 33, (i + 1) * 33).join(', '));
  // }
  //
  // console.log('--->', tree.mappedChunk.join(', '));

  const side: number = tree.side;
  for(let x = 0; x < side; x++) {
    for(let y = 0; y < side; y++) {
      for(let z = 0; z < side; z++) {
        const color1: Uint8Array = getTextureColorAt(x, y, z, texture);
        const color2: Uint8Array = tree.getColorAt(x, y, z);
        for(let i = 0; i < 4; i++) {
          if(color1[i] !== color2[i]) {
            throw new Error(`Invalid color at position ${x}, ${y}, ${z} : ${color1.join(', ')} - ${color2.join(', ')}`);
          }
        }
      }
    }
  }
}


function testOctree() {
  // console.log(Octree.computeMaxOctreeDepth(2**30));
  // const tree = new Octree(1, new Uint8Array([
  //   0b11111111,
  //   ...red, ...red, ...green, ...green,
  //   ...blue, ...blue, ...blue, ...blue
  // ]));

  const chunkDepth1 = new Uint8Array([
    ...red, ...red, ...green, ...green,
    ...blue, ...blue, ...blue, ...blue
  ]);

  const chunkDepth2 = new Uint8Array([
    ...chunkDepth1, ...chunkDepth1, ...chunkDepth1, ...chunkDepth1,
    ...chunkDepth1, ...chunkDepth1, ...chunkDepth1, ...chunkDepth1
  ]);

  const chunkDepth3 = new Uint8Array([
    ...chunkDepth2, ...chunkDepth2, ...chunkDepth2, ...chunkDepth2,
    ...chunkDepth2, ...chunkDepth2, ...chunkDepth2, ...chunkDepth2
  ]);

  const testTexture = generate3DTexture(4, (x, y, z) => new Uint8Array([x, y, z, 0]));
  const uniformTexture = generate3DTexture(4, (x, y, z) => new Uint8Array([1, 1, 1, 123]));
  const emptyTexture = generate3DTexture(4, (x, y, z) => new Uint8Array([0, 0, 0, 0]));

  // const tree = Octree.from3DTexture(new Uint8Array(chunkDepth1));
  testImport(testTexture);
  testImport(uniformTexture);
  testImport(emptyTexture);
  testImport(generateRandom3DTexture(8));

  const tree = Octree.from3DTexture(uniformTexture);

  // tree.setColorAt(0, 0, 0, new Uint8Array([1, 1, 1, 1]));
  // console.log('---');
  // tree.setColorAt(1, 0, 0, new Uint8Array([2, 2, 2, 2]));
  // console.log('---');
  // tree.setColorAt(1, 0, 2, new Uint8Array([3, 3, 3, 3]));

  console.log(tree.data.join(', '));

  // console.log(tree.side);
  console.log(tree.getColorAt(0, 0, 0));

  // console.log(tree.getColorAt(0, 0, 1));

}


testOctree();

// window.addEventListener('load', () => {
//   testOctree();
//   // test().catch(_ => console.error(_));
// });