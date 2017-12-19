
const red: number[] = [255, 0, 0, 255];
const green: number[] = [0, 255, 0, 255];
const blue: number[] = [0, 0, 255, 255];


// HARDCODED
function logOctreeData(data: Uint8Array): void {
  for(let i = 0; i < data.length / 33; i++) {
    console.log(data.slice(i * 33, (i + 1) * 33).join(', '));
  }
  console.log('length: ', data.length);
}

const IS_BROWSER = (typeof window !== 'undefined');


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


function ImageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas: HTMLCanvasElement = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return canvas;
}

function CanvasToImage(canvas: HTMLCanvasElement): HTMLImageElement {
  const image: HTMLImageElement = new Image();
  image.src = canvas.toDataURL('image/png');
  return image;
}


export class Ray {
  public vector: Float32Array;
  public position: Float32Array;

  constructor(vector: Float32Array = new Float32Array(3), position: Float32Array = new Float32Array(3)) {
    this.vector = vector;
    this.position = position;
  }

  // where it hits the XY plan
  hitXYPlan(z: number): Float32Array {
    const ratio: number = (z - this.position[2]) / this.vector[2]; // distance Z between XY plan and Ray Z, divided by vectorZ => length ration of the resulting vector
    // take care of this.vector[2] === 0
    return new Float32Array([
      this.position[0] + this.vector[0] * ratio,
      this.position[1] + this.vector[1] * ratio,
      this.position[2] + this.vector[2] * ratio,
    ]);
  }

  // where it hits the XZ plan
  hitXZPlan(y: number): Float32Array {
    const ratio: number = (y - this.position[1]) / this.vector[1];
    return new Float32Array([
      this.position[0] + this.vector[0] * ratio,
      this.position[1] + this.vector[1] * ratio,
      this.position[2] + this.vector[2] * ratio,
    ]);
  }

  // where it hits the YZ plan
  hitYZPlan(x: number): Float32Array {
    const ratio: number = (x - this.position[0]) / this.vector[0];
    return new Float32Array([
      this.position[0] + this.vector[0] * ratio,
      this.position[1] + this.vector[1] * ratio,
      this.position[2] + this.vector[2] * ratio,
    ]);
  }

  hitCube(position: Float32Array, side: number): Float32Array[] | null {
    const rayPosition: Float32Array = new Float32Array([
      this.position[0] - position[0],
      this.position[1] - position[1],
      this.position[2] - position[2],
    ]);

    const hits: Float32Array[] = [];
    let ratio: number;
    let a: number, b: number, c: number;

    if (
      (0 <= rayPosition[0]) && (rayPosition[0] < side)
      && (0 <= rayPosition[1]) && (rayPosition[1] < side)
      && (0 <= rayPosition[2]) && (rayPosition[2] < side)
    ) {
      hits.push(rayPosition.slice());
    }

    const coords: Float32Array = new Float32Array(3);

    for(let j = 0; j < 3; j++) {
      a = j;
      b = (j + 1) % 3;
      c = (j + 2) % 3;
      coords[a] = 0;

      if(this.vector[a] !== 0) {
        for (let j = 0; j < 2; j++) {
          ratio = (coords[a] - rayPosition[a]) / this.vector[a];

          if(ratio >= 0) {
            coords[b] = rayPosition[b] + this.vector[b] * ratio;
            coords[c] = rayPosition[c] + this.vector[c] * ratio;

            if ((0 <= coords[b]) && (coords[b] < side) && (0 <= coords[c]) && (coords[c] < side)) {
              hits.push(coords.slice());
              if (hits.length === 2) return hits;
            }
          }

          coords[a] += side;
        }
      }
    }

    return null;
  }

  toString(): string {
    return `vec[${this.vector.join(', ')}] pos[${this.position.join(', ')}]`;
  }
}


export abstract class Camera {
  public width: number;
  public height: number;
  public position: Float32Array;
  public rotation: Float32Array;

  constructor(
    width: number = window.innerWidth,
    height: number = window.innerHeight,
    position: Float32Array = new Float32Array(3),
    rotation: Float32Array = new Float32Array(3),
  ) {
    this.width = width;
    this.height = height;
    this.position = position;
    this.rotation = rotation;
  }

  abstract getRays(): Ray[][];
}

export class PerspectiveCamera extends Camera {
  public depth: number;

  constructor(
    width: number = window.innerWidth,
    height: number = window.innerHeight,
    depth: number = Math.max(width, height) / 2,
    position: Float32Array = new Float32Array(3),
    rotation: Float32Array = new Float32Array(3),
  ) {
    super(width, height, position, rotation);
    this.depth = depth;
  }

  getRays(): Ray[][] {
    const rays: Ray[][] = [];
    const halfWidth: number = this.width / 2;
    const halfHeight: number = this.height / 2;
    for(let y = -halfHeight + 0.5; y < halfHeight; y++) {
      const line: Ray[] = [];
      for(let x = -halfWidth + 0.5; x < halfWidth; x++) {
        line.push(new Ray(new Float32Array([x, y, this.depth]), this.position)); // this.depth is not totally correct
      }
      rays.push(line);
    }
    return rays;
  }
}


export class Octree {
  static computeMaxOctreeSize(depth: number): number {
    return (depth === 0) ? 0 : this.computeMaxOctreeSize(depth - 1) * 8 + 33;
  }

  // TODO verify if correct
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
    return this.computeSideDepth(Math.pow(texture.length / 4, 1 / 3));
  }

  static computeSideDepth(side: number): number {
    const depth: number = Math.round(Math.log2(side));
    if((depth < 1) || (depth % 1 !== 0)) {
      throw new Error('Invalid side : must be a power of 2 with a min value of 2');
    }
    return depth;
  }

  static from3DTexture(texture: Uint8Array): Octree {
    const tree: Octree = new Octree(this.compute3DTextureDepth(texture));
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

  static fromSide(side: number): Octree {
    return new Octree(this.computeSideDepth(side))
  }

  public depth: number;
  public data: Uint8Array;
  public mapping: Uint8Array;

  protected _mappingIndex: number;

  constructor(depth: number, data: Uint8Array = new Uint8Array(Octree.computeMaxOctreeSize(depth))) {
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
      this._mappingIndex = Math.max(this._mappingIndex, index);
      this.mapping[index >> 3] |= (0x1 << (index % 8));
    } else {
      this.mapping[index >> 3] &= ~(0x1 << (index % 8));
    }
  }

  getMapping(index: number): number {
    index = Math.floor(index / 33);
    return this.mapping[index >> 3] & (0x1 << (index % 8));
  }

  getFirstAvailableMappingIndex(start: number = 0): number {
    let value: number;
    for(let i = Math.floor(start / 33 / 8), l = this.mapping.length; i < l; i++) {
      value = this.mapping[i];
      if(value !== 0b11111111) {
        for(let j = 0; j <= 8; j++) {
          if((value & (0x1 << j)) === 0) {
            this._mappingIndex = ((i << 3) | j) * 33;
            return this._mappingIndex;
          }
        }
      }
    }
    this._mappingIndex = this.data.length;
    return this._mappingIndex;
  }


  /**
   * Explores reachable octrees and return mapping according to it.
   */
  refreshMapping(): void {
    this.mapping = new Uint8Array(Math.ceil(this.data.length / 33 / 8));
    this._mappingIndex = 0;
    this.refreshMappingAtIndex(0);
  }

  protected refreshMappingAtIndex(dataIndex: number) {
    this.setMapping(dataIndex, true);
    let _dataIndex: number = dataIndex + 1;
    for(let i = 0; i < 8; i++) {
      if((this.data[dataIndex] >> i) & 0x1) {
        this.refreshMappingAtIndex(ReadAsUint32(this.data, _dataIndex));
      }
      _dataIndex += 4;
    }
  }


  explore(callback: (index: number, path: [number, number, number][]) => void, dataIndex: number = 0, path: [number, number, number][] = []): void {
    callback(dataIndex, path);
    let _dataIndex: number = dataIndex + 1;
    for(let i = 0; i < 8; i++) {
      if((this.data[dataIndex] >> i) & 0x1) {
        this.explore(
          callback,
          ReadAsUint32(this.data, _dataIndex),
          // path.concat([i % 2, (i >> 1) % 2, (i >> 2) % 2])
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
    let coordsOffset: number;
    let _dataIndex: number;

    while(depthOffset >= 0) {
      coordsOffset = GetCoordsOffset(x, y, z, depthOffset);
      _dataIndex = dataIndex + 1 + coordsOffset * 4;

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


  /**
   * Creates and appends an new octree to data.
   * Returns ths index.
   * @param {Uint8Array} value
   * @return {number}
   */
  createOctree(value?: Uint8Array): number {
    const index: number = this.getFirstAvailableMappingIndex(this._mappingIndex);
    if (index >= this.data.length) throw new Error(`Missing space`);
    this.setMapping(index, true);

    if (value) {
      for(let i = index + 1, l = i + 32; i < l; i += 4) {
        this.data.set(value, i)
      }
    }

    return index;
  }

  /**
   * Moves octree at 'sourceIndex' to 'destinationIndex'
   * @param {number} sourceIndex
   * @param {number} destinationIndex
   */
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
    //console.time('compactValues');
    this.compactValues();
    // console.timeEnd('compactValues');
    // console.time('removeDuplicatedOctrees');
    // this.removeDuplicatedOctrees();
    // console.timeEnd('removeDuplicatedOctrees');
    // console.time('removeEmptyData');
    this.removeEmptyData();
    // console.timeEnd('removeEmptyData');
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


  /**
   * Removes redundant data.
   * Heavy computing.
   */
  removeDuplicatedOctrees(): void {
    const octrees: number[] = [];

    let value: number;
    for(let i =0, l = this.mapping.length; i < l; i++) {
      value = this.mapping[i];
      for(let j = 0; j <= 8; j++) {
        if((value >> j) & 0x1) {
          octrees.push(((i << 3) | j) * 33);
        }
      }
    }

    // console.time('removeDuplicatedOctrees');

    let octree1: number;
    let octree2: number;
    let octree3: number;

    for(let i = 0; i < octrees.length; i++) { // for each octree
      octree1 = octrees[i];

      for(let j = i + 1; j < octrees.length; j++) {  // for each following octrees
        octree2 = octrees[j];

        let k: number = octree1;
        let end: number = k + 33;
        let offset: number = octree2 - octree1;
        for(; k < end; k++) { // verify that all values are equals
          if(this.data[k] !== this.data[offset + k]) break;
        }

        if(k === end) { // all values equals => duplicate octree
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

    // console.timeEnd('removeDuplicatedOctrees');
  }


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


  toImageData(): ImageData {
    const size: number = Math.ceil(Math.sqrt(this.data.length / 4));
    const data: Uint8ClampedArray = new Uint8ClampedArray(size * size * 4);
    data.set(this.data);
    return new ImageData(data, size, size);
  }

  toCanvas(): HTMLCanvasElement {
    const imageData: ImageData = this.toImageData();
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    return canvas;
  }

  toImage(): HTMLImageElement {
    const image: HTMLImageElement = new Image();
    image.src = this.toCanvas().toDataURL('image/png');
    return image;
  }


  computeRay(ray: Ray): Uint8Array {
    const color: Uint8Array = new Uint8Array(4);

    const position: Float32Array = new Float32Array(3);

    let side: number = this.side / 2;
    let dataIndex: number = 0;
    let depthOffset: number = this.depth - 1;
    let _dataIndex: number;

    this._computeRay(ray, 0, this.depth - 1, 0, 0, 0);

    return color;
  }

  protected _computeRay(ray: Ray, dataIndex: number, depth: number, x: number, y: number, z: number): void {
    let _dataIndex: number = dataIndex + 1;

    for(let _z = 0; _z < 2; _z++) {
      //position[2] = z;
      for (let _y = 0; _y < 2; _y++) {
        // position[1] = y;
        for (let _x = 0; _x < 2; _x++) {
          x |=
          //position[0] = x;
          // const hits: Float32Array[] | null = ray.hitCube(position, side);
          _dataIndex += 4;
        }
      }
    }
  }
}





/**
 * TESTS
 */

function getTextureColorAt(x: number, y: number, z: number, texture: Uint8Array): Uint8Array {
  const depth: number = Octree.compute3DTextureDepth(texture);
  const index: number = x | (y << depth) | (z << (depth << 1));
  return new Uint8Array(texture.buffer, index * 4, 4);
}

function generateRandom3DTextureFromSet(side: number, values: number[] = new Array(256).fill(null).map((a, i) => i)): Uint8Array {
  const data: Uint8Array = new Uint8Array(side * side * side * 4);
  for (let i = 0; i < data.length; i++) {
    data[i] = values[Math.floor(Math.random() * values.length)];
  }
  return data;
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

function generateSphereOctree(side: number, color: Uint8Array): Octree {
  const tree: Octree = Octree.fromSide(side);
  const halfSide: number = side / 2;
  for(let z = 0; z < side; z++) {
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const radius: number = Math.sqrt(
          Math.pow(x - halfSide, 2)
          + Math.pow(y - halfSide, 2)
          + Math.pow(z - halfSide, 2)
        );

        if(radius <= halfSide) {
          // console.log('set at', x, y, z);
          tree.setValueAt(x, y, z, color);
        }
      }
    }
  }
  // testCompact('generateSphereOctree - ' + side, tree);

  return tree;
  // return tree.compact();
}

function generateDiskOctree(side: number, z: number, color: Uint8Array): Octree {
  const tree: Octree = Octree.fromSide(side);
  const halfSide: number = side / 2;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const radius: number = Math.sqrt(
        Math.pow(x - halfSide, 2)
        + Math.pow(y - halfSide, 2)
      );

      if(radius <= halfSide) {
        // console.log('set at', x, y, z);
        tree.setValueAt(x, y, z, color);
      }
    }
  }
  return tree;
  // return tree.compact();
}


function testImport(texture: Uint8Array, options?: any): void {
  const tree = Octree.from3DTexture(texture); // .compact()
  // tree.compact();
  // tree.compactValues();
  // tree.compactValues();
  // tree.removeDuplicatedOctrees();
  // tree.removeEmptyData();
  // console.log(tree.data.length);
  //
  // tree.removeDuplicatedOctrees();
  // tree.removeEmptyData();
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

  testCompact(tree, options);
}

function testCompact(tree: Octree, options: any = {}): Octree {
  const size1: number = tree.data.length;
  let t1: number = Date.now();
  const compactedTree: Octree = tree.clone().compact();
  let t2: number = Date.now();
  const size2: number = compactedTree.data.length;
  const size3: number = (tree.side ** 3) * 4;
  const size4: number = (tree.side ** 2) * 4;

  console.log(
    (options.name ? `[${name}] :` : '')
    + `\ncompact performance: ${size1} -> ${size2} (${Math.round(size2 / size1 * 100)}%) in ${t2 - t1}ms`
    + `\n(text3d: ${size3} (${Math.round(size2 / size3 * 100)}%))`
    + (options.text2d ? `\n(text2d: ${size4} (${Math.round(size2 / size4 * 100)}%))` : '')
  );

  if(!IS_BROWSER && options.zlib) {
    const size5: number = require('zlib').deflateSync(compactedTree.data).length;
    console.log(`zlib: ${size5} (${Math.round(size5 / size3 * 100)}% of text3d))`);
  }

  return compactedTree;
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


function sliceOctree(tree: Octree, z: number): ImageData {
  const side: number = tree.side;
  const imageData: ImageData = new ImageData(side, side);

  let i: number = 0;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      imageData.data.set(tree.getValueAt(x, y, z), i);
      i += 4;
    }
  }

  return imageData;
}



function testCamera() {
  const camera: Camera = new PerspectiveCamera(2, 2);
  console.log(camera.getRays().map(_ => _.map(_ => _.toString()).join(', ')).join('\n'));

}

function testRays() {
  // const ray = new Ray(new Float32Array([0.5, 0.5, 1]), new Float32Array([0, 0, 0]));
  // console.log(ray.hitXYPlan(-10));
  // console.log(ray.hitXZPlan(10));
  // console.log(ray.hitYZPlan(10));

  if(
    new Ray(new Float32Array([-1, 0, 0]), new Float32Array([1000, 0, 0]))
      .hitCube(new Float32Array([-1, -1, -1]), 2).length !== 2
  ) {
    throw new Error('hitCube failed for X ray');
  }

  if(
    new Ray(new Float32Array([0, -1, 0]), new Float32Array([0, 1000, 0]))
      .hitCube(new Float32Array([-1, -1, -1]), 2).length !== 2
  ) {
    throw new Error('hitCube failed for Y ray');
  }

  if(
    new Ray(new Float32Array([0, 0, -1]), new Float32Array([0, 0, 1000]))
      .hitCube(new Float32Array([-1, -1, -1]), 2).length !== 2
  ) {
    throw new Error('hitCube failed for Z ray');
  }

  if(
    new Ray(new Float32Array([1, 0, 0]), new Float32Array([1000, 0, 0]))
      .hitCube(new Float32Array([-1, -1, -1]), 2) !== null
  ) {
    throw new Error('hitCube failed for X ray in opposite direction');
  }

  if(
    new Ray(new Float32Array([1, 0, 0]), new Float32Array([0, 0, 0]))
      .hitCube(new Float32Array([-1, -1, -1]), 2).length !== 2
  ) {
    throw new Error('hitCube failed for ray inside of cube');
  }


  let tree = generateSphereOctree(128, new Uint8Array([255, 0, 0, 255])).compact();

  const ray = new Ray(new Float32Array([0, 0, -1]), new Float32Array([tree.side / 2, tree.side / 2, 1000]));
  tree.computeRay(ray);

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

  // const testTexture     = generate3DTexture(64, (x, y, z) => new Uint8Array([x, y, z, 0]));
  // const uniformTexture  = generate3DTexture(64, () => new Uint8Array([1, 1, 1, 123]));
  // const emptyTexture    = generate3DTexture(64, () => new Uint8Array([0, 0, 0, 0]));

  // const tree = Octree.from3DTexture(new Uint8Array(chunkDepth1));
  // testImport('textureDepth1', textureDepth1);
  // testImport('textureDepth2', textureDepth2);
  // testImport('textureDepth3', textureDepth3);
  // testImport('testTexture', testTexture);
  // testImport('uniformTexture', uniformTexture);
  // testImport('emptyTexture', emptyTexture);
  // testImport('generateRandom3DTexture', generateRandom3DTexture(32));

  // from3DTextureTime(generateRandom3DTexture(32));
  // readAllTime(Octree.from3DTexture(generateRandom3DTexture(32)));


  // let tree = Octree.from3DTexture(textureDepth3);
  // let tree = Octree.from3DTexture(uniformTexture);
  let tree = generateSphereOctree(128, new Uint8Array([255, 0, 0, 255]));
  // let tree = generateDiskOctree(128,16, new Uint8Array([255, 0, 0, 255]));
  tree = testCompact(tree);

  // tree.setColorAt(0, 0, 0, new Uint8Array([1, 1, 1, 1]));
  // console.log('---');
  // tree.setColorAt(1, 0, 0, new Uint8Array([2, 2, 2, 2]));
  // console.log('---');
  // tree.setColorAt(1, 0, 2, new Uint8Array([3, 3, 3, 3]));

  // console.log('length', tree.data.length);
  // logOctreeData(tree.data);

  // console.log(tree.side);
  // console.log(tree.getValueAt(0, 0, 0));
  // console.log(tree.getColorAt(0, 0, 1));


  if(IS_BROWSER) {
    // document.body.appendChild(tree.toImage());
    // document.body.appendChild(ImageDataToCanvas(sliceOctree(tree, 16)));
  }
}


function test() {
  // testOctree();
  // testCamera();
  testRays();
}


if(IS_BROWSER) {
  window.addEventListener('load', () => {
    test();
    // test().catch(_ => console.error(_));
  });
} else {
  test();
}
