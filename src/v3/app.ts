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

// HARDCODED
function logOctreeData(data: Uint8Array): void {
  for(let i = 0; i < data.length / 33; i++) {
    console.log(data.slice(i * 33, (i + 1) * 33).join(', '));
  }
  console.log('length: ', data.length);
}


function ReadAsUint32(array: Uint8Array, index: number): number {
  return (
    (array[index    ])
    | (array[index + 1] << 8)
    | (array[index + 2] << 16)
    | (array[index + 3] << 24)
  ) >>> 0;
}

function WriteAsUint32(array: Uint8Array, index: number, value: number): void {
  array[index    ] = value;
  array[index + 1] = value >> 8;
  array[index + 2] = value >> 16;
  array[index + 3] = value >> 24;
}

function CompareAsUint32(array1: Uint8Array, index1: number, array2: Uint8Array, index2: number): boolean {
  return (array1[index1    ] === array2[index2    ])
      && (array1[index1 + 1] === array2[index2 + 1])
      && (array1[index1 + 2] === array2[index2 + 2])
      && (array1[index1 + 3] === array2[index2 + 3]);
}

function GetCoordsOffset(x: number, y: number, z: number, depthOffset: number): number {
  return (
    ((x >> depthOffset) & 0x1)
    | (((y >> depthOffset) & 0x1) << 1)
    | (((z >> depthOffset) & 0x1) << 2)
  ) >>> 0;
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
    const tree: Octree = new Octree(depth, new Uint8Array(this.computeMaxOctreeSize(depth)));
    const side: number = tree.side;
    let i: number = 0;

    for(let z = 0; z < side; z++) {
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          tree.setValueAt(x, y, z, texture.subarray(i, i + 4));
          i += 4;
        }
      }
    }

    return tree;
  }


  public depth: number;
  public data: Uint8Array;
  public mapping: Uint8Array;

  constructor(depth: number, data: Uint8Array) {
    this.depth = depth;
    this.data = data; // [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    this.refreshMapping();
  }

  get side(): number {
    return 0x1 << this.depth; // Math.pow(2, this.depth)
  }

  setMapping(index: number, value: boolean | number): void {
    index = Math.floor(index / 33);
    if(value) {
      this.mapping[index >> 3] |= (0x1 << (index % 8));
    } else {
      this.mapping[index >> 3] &= ~(0x1 << (index % 8));
    }
  }

  getMapping(index: number): number {
    index = Math.floor(index / 33);
    return this.mapping[index >> 3] & (0x1 << (index % 8));
  }

  getFirstAvailableMappingIndex(): number {
    let value: number;
    for(let i = 0, l = this.mapping.length; i < l; i++) {
      value = this.mapping[i];
      if(value !== 0b11111111) {
        for(let j = 0; j <= 8; j++) {
          if((value & (0x1 << j)) === 0) {
            return ((i << 3) | j) * 33;
          }
        }
      }
    }
    return this.data.length;
  }


  /**
   * Explores reachable octrees and return mapping according to it.
   */
  refreshMapping(): void {
    this.mapping = new Uint8Array(Math.ceil(this.data.length / 33 / 8));
    this.explore((index: number) => {
      index = Math.floor(index / 33);
      this.mapping[index >> 3] |= (0x1 << (index % 8));
    });
  }

  explore(callback: (index: number, path: [number, number, number][]) => void, dataIndex: number = 0, path: [number, number, number][] = []): void {
    callback(dataIndex, path);
    let _dataIndex: number = dataIndex + 1;
    for(let i = 0; i < 8; i++) {
      if((this.data[dataIndex] >> i) & 0x1) {
        this.explore(
          callback,
          ReadAsUint32(this.data, _dataIndex),
          path.concat([i % 2, (i >> 1) % 2, (i >> 2) % 2])
        );
      }
      _dataIndex += 4;
    }
  }


  /**
   * Sets a value at a specific position.
   * Doesn't replace pre-existing same value, and doesn't apply a merge
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {Uint8Array} value
   */
  setValueAt(x: number, y: number, z: number, value: Uint8Array): void {
    let depth: number = this.depth;
    let dataIndex: number = 0;
    let depthOffset: number = depth - 1;

    // insert value at proper place
    while(depth > 0) {
      const coordsOffset: number = GetCoordsOffset(x, y, z, depthOffset);
      const _dataIndex: number = dataIndex + 1 + coordsOffset * 4;

      if(depth === 1) {
        // for depth === 1 mask should be equals to 'value' by default
        // this.data[dataIndex] &= ~(0x1 << coordsOffset);
        this.data.set(value, _dataIndex);
        break;
      } else {

        if((this.data[dataIndex] >> coordsOffset) & 0x1) { // is index type
          dataIndex = ReadAsUint32(this.data, _dataIndex);
        } else {
          if(CompareAsUint32(this.data, _dataIndex, value, 0)) { // same values
            break; // here we are not at the deepest lvl, values are the same and octree should already be optimized => touch nothing
          } else { // values are different => must split current value to another octree
            const newIndex: number = this.createOctree(this.data.subarray(_dataIndex, _dataIndex + 4));

            // replace mask value by index type
            this.data[dataIndex] |= (0x1 << coordsOffset);

            // replace value by newIndex
            WriteAsUint32(this.data, _dataIndex, newIndex);

            dataIndex = newIndex;
          }
        }
      }

      depth--;
      depthOffset--;
    }
  }

  /**
   * Fast retrieve of a value at a specific position.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @return {Uint8Array}
   */
  getValueAt(x: number, y: number, z: number): Uint8Array {
    let dataIndex: number = 0;
    let depthOffset: number = this.depth - 1;

    while(depthOffset >= 0) {
      const coordsOffset: number = GetCoordsOffset(x, y, z, depthOffset);
      const _dataIndex: number = dataIndex + 1 + coordsOffset * 4;

      if((this.data[dataIndex] >> coordsOffset) & 0x1) {
        dataIndex = ReadAsUint32(this.data, _dataIndex);
        depthOffset--;
      } else {
        return this.data.subarray(_dataIndex, _dataIndex + 4);
      }
    }

    throw new Error('Invalid coords');
  }


  clone(): Octree {
    return new Octree(this.depth, this.data.slice());
  }


  createOctree(value?: Uint8Array): number {
    const index: number = this.getFirstAvailableMappingIndex();
    if (index >= this.data.length) throw new Error(`Missing space`);
    this.setMapping(index, true);

    if (value) {
      for(let i = index + 1, l = i + 32; i < l; i += 4) {
        this.data.set(value, i)
      }
    }

    return index;
  }

  moveOctree(sourceIndex: number, destinationIndex: number): void {
    if(sourceIndex !== destinationIndex) {
      this.data.set(this.data.subarray(sourceIndex, sourceIndex + 33), destinationIndex);
      this.setMapping(sourceIndex, false);
      this.setMapping(destinationIndex, true);

      this.findOctreesUsingIndex(sourceIndex, (index: number, subIndexIndex: number) => {
        WriteAsUint32(this.data, subIndexIndex, destinationIndex);
      });
    }
  }

  findOctreesUsingIndex(sourceIndex: number, callback: (index: number, subIndexIndex: number) => void): void {
    this.explore((index: number) => {
      let subIndexIndex: number = index + 1;
      for(let i = 0; i < 8; i++) {
        if((this.data[index] >> i) & 0x1) { // is index type
          if(ReadAsUint32(this.data, subIndexIndex) === sourceIndex) {
            // console.log('-> found octree using index', sourceIndex);
            callback(index, subIndexIndex);
          }
        }
        subIndexIndex += 4;
      }
    });
  }


  /**
   * Optimizes Octree to reduce size
   * @return {Octree}
   */
  compact(): Octree {
    this.compactValues();
    this.removeDuplicatedOctrees();
    this.removeEmptyData();
    return this;
  }

  
  /**
   * Tries to merge sub octree according to their values.
   * @return {Uint8Array | null}
   */
  compactValues(): void {
    this.compactValuesAtIndex(0);
    this.refreshMapping();
  }
  
  protected compactValuesAtIndex(dataIndex: number): Uint8Array | null {
    let _dataIndex: number = dataIndex + 1;
    let value:  Uint8Array | null = null;
    let subValue:  Uint8Array | null;

    for (let i = 0; i < 8; i++) { // for each sub-tree
      if ((this.data[dataIndex] >> i) & 0x1) { // is index type
        subValue = this.compactValuesAtIndex(ReadAsUint32(this.data, _dataIndex));

        if(subValue === null) {
          return null;
        } else { // here the sub-octree returned a value so it can be merged
          this.data[dataIndex] &= ~(0x1 << i); // convert to value type
          this.data.set(subValue, _dataIndex); // set value
          // at this point wer don't know if octree is used somewhere else
        }
      } else { // is value type
        subValue = this.data.subarray(_dataIndex, _dataIndex + 4);
      }

      if(value === null) {
        value = subValue;
      } else if(!CompareAsUint32(subValue, 0, value, 0)) {
        return null;
      }

      _dataIndex += 4;
    }

    return value;
  }

  removeDuplicatedOctrees(): void {
    const octrees: number[] = [];
    this.explore((index: number) => {
      if(!octrees.includes(index)) {
        octrees.push(index);
      }
    });

    let octree1: number;
    let octree2: number;
    let octree3: number;

    for(let i = 0; i < octrees.length; i++) { // for each octree
      octree1 = octrees[i];

      for(let j = i + 1; j < octrees.length; j++) {  // for each following octrees
        octree2 = octrees[j];

        let k: number = 0;
        for(; k < 33; k++) { // verify that all values are equals
          if(this.data[octree1 + k] !== this.data[octree2 + k]) break;
        }

        if(k === 33) { // all values equals => duplicate octree
          // console.log('found duplicate octree', octree1, octree2);

          this.setMapping(octree2, false);
          octrees.splice(j, 1);

          for(let m = 0, l = octrees.length; m < l; m++) { // search octree with octree2 as index
            octree3 = octrees[m];
            let _octree3: number = octree3 + 1;

            for(let n = 0; n < 8; n++) {
              if((this.data[octree3] >> n) & 0x1) { // is index
                if(ReadAsUint32(this.data, _octree3) === octree2) { // octree3 index match octree2 index => octree3 has a index on octree2 that is a duplicate
                  // console.log('-found octree using index', octree3);
                  // replace octree2 by octree 1
                  WriteAsUint32(this.data, _octree3, octree1);
                  i = Math.min(i, m - 1); // because octree3 (at index m) changed, we need to re-inspect all from 'm'
                }
              }
              _octree3 += 4;
            }
          }
        }
      }
    }
  }

  // removeDuplicatedOctrees(): void {
  //   const octrees: FlattenOctree[] = [];
  //   this.explore((index: number) => {
  //     octrees.push({ index: index, data:  this.data.subarray(index, 33)});
  //   });
  //
  //   let octree1: FlattenOctree;
  //   let octree2: FlattenOctree;
  //   let octree3: FlattenOctree;
  //
  //
  //   for(let i = 0, length = octrees.length; i < length; i++) { // for each octree
  //     octree1 = octrees[i];
  //
  //     for(let j = i + 1; j < length; j++) {  // for each following octrees
  //       octree2 = octrees[j];
  //
  //       let k: number = 0;
  //       for(; k < 33; k++) { // verify that all values are equals
  //         if(octree1.data[k] !== octree2.data[k]) break;
  //       }
  //
  //       if(k === 33) { // all values equals => duplicate octree
  //         console.log('found duplicate octree');
  //
  //         for(let l = 0; l < length; l++) { // search octree with this index
  //           octree3 = octrees[l];
  //
  //           let dataIndex: number = octrees[l][0];
  //           let _dataIndex: number = dataIndex + 1;
  //
  //           for(let m = 0; m < 8; m++) {
  //             if((this.data[dataIndex] >> m) & 0x1) {
  //               const index: number = (
  //                 (this.data[_dataIndex])
  //                 | (this.data[_dataIndex + 1] << 8)
  //                 | (this.data[_dataIndex + 2] << 16)
  //                 | (this.data[_dataIndex + 3] << 24)
  //               ) >>> 0;
  //               if(index ==0 )
  //                 }
  //             _dataIndex += 4;
  //           }
  //
  //         }
  //       }
  //     }
  //   }
  // }

  /**
   * Remove non-used octrees
   */
  removeEmptyData(hard: boolean = false): void {
    this.reorderData();
    if(hard) {
      this.data = this.data.slice(0, this.getFirstAvailableMappingIndex());
      this.refreshMapping();
    } else {
      this.data = this.data.subarray(0, this.getFirstAvailableMappingIndex());
    }
  }

  /**
   * Reorder data by putting used octrees first
   */
  reorderData(): void {
    let value: number;
    let sourceIndex: number = 0;
    let destinationIndex: number = 0;
    for (let i = 0, l = this.mapping.length; i < l; i++) {
      value = this.mapping[i];
      for (let j = 0; j < 8; j++) {
        if((value >> j) & 0x1) { // is mapped
          this.moveOctree(sourceIndex, destinationIndex);
          destinationIndex += 33;
        }
        sourceIndex += 33;
      }
    }
  }
}





function getTextureColorAt(x: number, y: number, z: number, texture: Uint8Array): Uint8Array {
  const depth: number = Octree.compute3DTextureDepth(texture);
  const index: number = x | (y << depth) | (z << (depth << 1));
  return new Uint8Array(texture.buffer, index * 4, 4);
}

// function generateRandom3DTexture(side: number, values: number[] = new Array(256).fill(null).map((a, i) => i)): Uint8Array {
//   const data: Uint8Array = new Uint8Array(side * side * side * 4);
//   for (let i = 0; i < data.length; i++) {
//     data[i] = values[Math.floor(Math.random() * values.length)];
//   }
//   return data;
// }

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



function testImport(name: string, texture: Uint8Array): void {
  const tree = Octree.from3DTexture(texture); // .compact()
  // tree.compactValues();
  // tree.compactValues();
  // tree.removeDuplicatedOctrees();
  // tree.removeDuplicatedOctrees();

  // logOctreeData(tree.data);
  // tree.removeEmptyData();
  // logOctreeData(tree.data);

  const side: number = tree.side;
  for(let x = 0; x < side; x++) {
    for(let y = 0; y < side; y++) {
      for(let z = 0; z < side; z++) {
        const color1: Uint8Array = getTextureColorAt(x, y, z, texture);
        const color2: Uint8Array = tree.getValueAt(x, y, z);
        for(let i = 0; i < 4; i++) {
          if(color1[i] !== color2[i]) {
            throw new Error(`Invalid color at position ${x}, ${y}, ${z} : ${color1.join(', ')} - ${color2.join(', ')}`);
          }
        }
      }
    }
  }

  testCompact(name, tree);
}

function testCompact(name: string, tree: Octree): void {
  const size1: number = tree.data.length;
  const size2: number = tree.clone().compact().data.length;
  console.log(`[${name}] compact performance: ${size1} -> ${size2} (${Math.round(size2 / size1 * 100)}%)`);
}



function from3DTextureTime(texture: Uint8Array): void {
  console.time('from3DTexture');
  const tree: Octree = Octree.from3DTexture(texture);
  console.timeEnd('from3DTexture');
  console.log(tree.data.length);
}

function readAllTime(tree: Octree): void {
  console.time('readAll');
  const side: number = tree.side;
  let sum: number = 0;
  for(let x = 0; x < side; x++) {
    for(let y = 0; y < side; y++) {
      for(let z = 0; z < side; z++) {
        const color: Uint8Array = tree.getValueAt(x, y, z);
        for(let i = 0; i < 4; i++) {
          sum += color[i];
        }
      }
    }
  }
  console.timeEnd('readAll');
  console.log(sum);
}



function testOctree() {
  // console.log(Octree.computeMaxOctreeDepth(2**30));
  // const tree = new Octree(1, new Uint8Array([
  //   0b11111111,
  //   ...red, ...red, ...green, ...green,
  //   ...blue, ...blue, ...blue, ...blue
  // ]));

  const textureDepth1 = new Uint8Array([
    ...red, ...red, ...green, ...green,
    ...blue, ...blue, ...blue, ...blue
  ]);

  const textureDepth2 = new Uint8Array([
    ...textureDepth1, ...textureDepth1, ...textureDepth1, ...textureDepth1,
    ...textureDepth1, ...textureDepth1, ...textureDepth1, ...textureDepth1
  ]);

  const textureDepth3 = new Uint8Array([
    ...textureDepth2, ...textureDepth2, ...textureDepth2, ...textureDepth2,
    ...textureDepth2, ...textureDepth2, ...textureDepth2, ...textureDepth2
  ]);

  const testTexture     = generate3DTexture(16, (x, y, z) => new Uint8Array([x, y, z, 0]));
  const uniformTexture  = generate3DTexture(16, () => new Uint8Array([1, 1, 1, 123]));
  const emptyTexture    = generate3DTexture(16, () => new Uint8Array([0, 0, 0, 0]));

  // const tree = Octree.from3DTexture(new Uint8Array(chunkDepth1));
  testImport('textureDepth1', textureDepth1);
  testImport('textureDepth2', textureDepth2);
  testImport('textureDepth3', textureDepth3);
  testImport('testTexture', testTexture);
  testImport('uniformTexture', uniformTexture);
  testImport('emptyTexture', emptyTexture);
  testImport('generateRandom3DTexture', generateRandom3DTexture(32));

  from3DTextureTime(generateRandom3DTexture(64));
  readAllTime(Octree.from3DTexture(generateRandom3DTexture(64)));


  let tree = Octree.from3DTexture(textureDepth3);
  // let tree = Octree.from3DTexture(uniformTexture);
  // tree.compactValues();
  // tree.compactValues();
  // console.log(tree.mapping.join(', '));
  tree.removeDuplicatedOctrees();
  tree.removeEmptyData();

  // tree.removeDuplicatedOctrees();
  // console.log('-----------');
  // tree.removeDuplicatedOctrees();
  // console.log('-----------');
  // tree = tree.compact();
  // tree = tree.compact();
  // tree = tree.compact();
  // tree = tree.compact();


  // tree.setColorAt(0, 0, 0, new Uint8Array([1, 1, 1, 1]));
  // console.log('---');
  // tree.setColorAt(1, 0, 0, new Uint8Array([2, 2, 2, 2]));
  // console.log('---');
  // tree.setColorAt(1, 0, 2, new Uint8Array([3, 3, 3, 3]));

  console.log(tree.data.length);
  console.log(tree.data.join(', '));

  // console.log(tree.side);
  console.log(tree.getValueAt(0, 0, 0));

  // console.log(tree.getColorAt(0, 0, 1));

}


testOctree();

// window.addEventListener('load', () => {
//   testOctree();
//   // test().catch(_ => console.error(_));
// });