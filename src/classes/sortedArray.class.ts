declare type ComparisonFunction<T> = (a: T, b: T) => number;


export class SortedArray<T> {

  public comparisonFunction: ComparisonFunction<T>;
  public array: T[];

  constructor(comparisonFunction?: ComparisonFunction<T>) {
    if(typeof comparisonFunction === 'undefined') {
      comparisonFunction = (a: any, b: any) => {
        if(a < b) return -1;
        if(a > b) return 1;
        return 0;
      };
    }

    this.array = [];
    this.setComparisonFunction(comparisonFunction);
  }

  insert(value: T): number {
    let insertIndex: number = this.getInsertIndex(value);
    this.array.splice(insertIndex, 0, value);
    return insertIndex;
  }

  insertUnique(value: T): number {
    let insertIndex: number = this.getInsertIndex(value);
    if(!this.match(insertIndex, value)) {
      this.array.splice(insertIndex, 0, value);
    }
    return insertIndex;
  }

  remove(index: number) {
    this.array.splice(index, 1);
  }

  indexOf(value: T): number {
    let insertIndex: number = this.getInsertIndex(value);
    return this.match(insertIndex, value) ? insertIndex : -1;
  }

  includes(value: T): boolean {
    return this.indexOf(value) >= 0;
  }


  get(index: number): T {
    return this.array[index];
  }


  /**
   * Return true if the element at position "index" is equal to "value"
   * @param index
   * @param value
   * @returns {boolean}
   */
  match(index: number, value: T): boolean {
    return (index < this.array.length) && (this.comparisonFunction(this.array[index], value) === 0);
  }


  /**
   * Get index at with value must be inserted keeping order
   * @param value
   * @returns {number}
   */
  getInsertIndex(value: T): number {
    let startIndex: number  = 0;
    let endIndex: number    = this.array.length;
    let insertIndex: number  = 0;

    while((endIndex - startIndex) > 0) {
      insertIndex = Math.floor(startIndex + (endIndex - startIndex) / 2);

      switch(this.comparisonFunction(value, this.array[insertIndex])) {
        case -1:
          endIndex = insertIndex;
          break;
        case 1:
          startIndex = insertIndex + 1;
          break;
        case 0:
          return insertIndex;
      }
    }

    return startIndex;
  }


  setComparisonFunction(comparisonFunction: ComparisonFunction<T>) {
    this.comparisonFunction = comparisonFunction;
  }

}

// test
// let array = new SortedArray();
// for(let i = 0; i < 1000; i++) {
//   array.put(Math.random());
// }
//
// for(let i = 0; i < 1000 - 1; i++) {
//   if(array.get(i) >= array.get(i + 1)) {
//     console.log(array);
//     throw new Error('Sorted array is inconsistent');
//   }
// }



