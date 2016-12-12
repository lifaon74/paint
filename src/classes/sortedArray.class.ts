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

  put(value: T): number {
    let pivotIndex: number  = this.getPivotIndex(value);
    this.array.splice(pivotIndex, 0, value);
    return pivotIndex;
  }

  putUnique(value: T): number {
    let pivotIndex: number  = this.getPivotIndex(value);
    if(this.array[pivotIndex] !== value) {
      this.array.splice(pivotIndex, 0, value);
    }
    return pivotIndex;
  }

  delete(index: number) {
    this.array.splice(index, 1);
  }

  includes(value: T): boolean {
    return this.array[this.getPivotIndex(value)] === value;
  }

  get(index: number): T {
    return this.array[index];
  }

  getPivotIndex(value: T): number {
    let startIndex: number  = 0;
    let endIndex: number    = this.array.length;
    let pivotIndex: number  = 0;

    while((endIndex - startIndex) > 0) {
      pivotIndex = Math.floor(startIndex + (endIndex - startIndex) / 2);

      switch(this.comparisonFunction(value, this.array[pivotIndex])) {
        case -1:
          endIndex = pivotIndex;
          break;
        case 1:
          startIndex = pivotIndex + 1;
          break;
        case 0:
          return pivotIndex;
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



