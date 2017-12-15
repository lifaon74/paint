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

  // static from3DTexture(texture: Uint8Array): Octree {
  //   console.log(texture.length);
  //   // const depth: number = Math.round(Math.log2(Math.pow(texture.length / 4, 1 / 3)));
  //   const depth: number = Math.round(Math.pow(texture.length / 4, 1 / 6));
  //   if((depth < 1) || (Math.pow(2, depth * 3) !== (texture.length / 4))) {
  //     throw new Error('Invalid data size : array side must be a power of 2 with a min side of 2');
  //   }
  //
  //   const data: Uint8Array = new Uint8Array(this.computeMaxOctreeSize(depth));
  //   let index: number = 0;
  //   if(depth === 1) {
  //     data[index++] = 0b00000000;
  //     for (let i = 0; i < 32; i++) {
  //       data[index++] = texture[i];
  //     }
  //   } else {
  //     console.log('else');
  //     data[index++] = 0b11111111;
  //   }
  //   console.log(depth, data.length);
  // }
  //
  // static buildOctree(depth: number, texture: Uint8Array): number[] {
  //
  // }

  public depth: number;
  public data: Uint8Array;

  constructor(depth: number, data: Uint8Array) {
    this.depth = depth;
    this.data = data; // [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
  }

  get side(): number {
    return 0x1 << this.depth; // Math.pow(2, this.depth)
  }

  getColorAt(x: number, y: number, z: number): Uint8Array {
    let depth: number = this.depth;
    let index: number = 0;
    let side = 0x1 << (depth - 1);

    while(depth > 0) {
      const offset: number = Math.floor(x / side) + Math.floor(y / side) * 2 + Math.floor(z / side) * 4; // x + y * 2 + z * 4

      if((this.data[index] >> offset) & 0x1) {
        return new Uint8Array(this.data.buffer, index + 1, 4);
      } else {
        const i: number = index + offset * 4;
        index = (this.data[i] << 24) | (this.data[i + 1] << 16) | (this.data[i + 2] << 8) | (this.data[i + 3]);
        depth--;
        side >>= 1;
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

  const chunkDepth1 = [
    ...red, ...red, ...green, ...green,
    ...blue, ...blue, ...blue, ...blue
  ];

  const chunkDepth2 = [
    ...chunkDepth1, ...chunkDepth1, ...chunkDepth1, ...chunkDepth1,
    ...chunkDepth1, ...chunkDepth1, ...chunkDepth1, ...chunkDepth1
  ];

  const tree = new Octree(1, new Uint8Array([0b11111111, ...chunkDepth1]));
  // const tree = Octree.from3DTexture(new Uint8Array(chunkDepth1));
  // const tree = Octree.from3DTexture(new Uint8Array(chunkDepth2));

  // console.log(tree.side);
  console.log(tree.getColorAt(1, 1, 1));
}


window.addEventListener('load', () => {
  testOctree();
  // test().catch(_ => console.error(_));
});