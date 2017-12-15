import { Matrix } from './Matrix';
import { Float } from './Float';

async function test() {
  const matrix = [
    new Matrix(2, 2).fromArray([ // 0
      [ 1, 0],
      [-1, 3]
    ]),
    new Matrix(2, 2).fromArray([ // 1
      [1, 0],
      [0, 1]
    ]),
    new Matrix(2, 2).fromArray([ // 2
      [1, -1],
      [0,  3]
    ]),
    new Matrix(2, 2).fromArray([ // 3
      [3, 1],
      [2, 1]
    ]),
    new Matrix(2, 2).fromArray([ // 4
      [3, 1],
      [3, 2]
    ]),

    new Matrix(2, 3).fromArray([ // 5
      [ 3, 4, 1],
      [-8, 1, 2]
    ]),
    new Matrix(2, 3).fromArray([ // 6
      [3,  4,  1],
      [0, 35, 14]
    ]),

    new Matrix(2, 3).fromArray([ // 7
      [ 3, 4, 1],
      [ 0, 5, 2]
    ]),
    new Matrix(2, 3).fromArray([ // 8
      [15, 0, -3],
      [0,  5,  2]
    ]),


    new Matrix(4, 4).fromArray([ // 9
      [ 2,  1, 1, 14],
      [ 4,  2, 3, 28],
      [ 2,  5, 5, 30],
      [-1, -2, 1,  0]
    ]),
    new Matrix(4, 7).fromArray([ // 10
      [ 2,  1, 1, 1, 0, 0, 14],
      [ 4,  2, 3, 0, 1, 0, 28],
      [ 2,  5, 5, 0, 0, 1, 30],
      [-1, -2, 1, 0, 0, 0,  0]
    ]),

    new Matrix(2, 3).fromArray([ // 11
      [1, 0, -0.2],
      [0, 1,  0.4]
    ]),

    new Matrix(2, 3).fromArray([ // 12
      [-8, 1, 2],
      [ 3, 4, 1]
    ]),

    new Matrix(3, 4).fromArray([ // 13
      [ 1, -1,  5, -6],
      [ 3,  3, -1, 10],
      [ 1,  3,  2,  5]
    ]),
    new Matrix(3, 4).fromArray([ // 14
      [1, 0, 0, 1],
      [0, 1, 0, 2],
      [0, 0, 1, -1]
    ]),
  ];

  Float.DEFAULT_PRECISION = 1e-3;

  let mat: Matrix;

  if(!matrix[0].equals(matrix[0])) throw new Error('!matrix[0].equals(matrix[0])');
  if(!new Matrix(2, 2).identity().equals(matrix[1])) throw new Error('!new Matrix(2, 2).identity().equals(matrix[1])');
  if(!matrix[0].transpose().equals(matrix[2])) throw new Error('!matrix[0].transpose().equals(matrix[2])');
  if(!matrix[0].multiply(matrix[3]).equals(matrix[4])) throw new Error('!matrix[0].multiply(matrix[3]).equals(matrix[4])');
  if(matrix[0].det() !== 3) throw new Error('matrix[0].det() !== 3');

  if(!matrix[5].pivot(0, 0).equals(matrix[6])) throw new Error('!matrix[5].pivot(0, 0).equals(matrix[6])');
  if(!matrix[7].pivot(1, 1).equals(matrix[8])) throw new Error('!matrix[7].pivot(1, 1).equals(matrix[8])');

  if(!matrix[9].toSimplexTableau().equals(matrix[10])) throw new Error('!matrix[9].toSimplexTableau().equals(matrix[10])');

  if(!matrix[7].solveSystemOfEquationsProblem().equals(matrix[11], Float.equals)) throw new Error('!matrix[7].solveSystemOfEquationsProblem().equals(matrix[11], Float.equals)');
  if(!matrix[7].solveSystemOfEquationsProblem(matrix[7]).getSystemOfEquationsProblemSolutions().equals(new Matrix(2, 1).fromArray([[-0.2], [0.4]]), Float.equals)) throw new Error('!matrix[7].solveSystemOfEquationsProblem(matrix[7]).getSystemOfEquationsProblemSolutions().equals(new Matrix(2, 1).fromArray([[-0.2], [0.4]]), Float.equals)');

  if(!matrix[12].solveSystemOfEquationsProblem().equals(matrix[11], Float.equals)) throw new Error('!matrix[12].solveSystemOfEquationsProblem().equals(matrix[11], Float.equals)');
  if(!matrix[13].solveSystemOfEquationsProblem().equals(matrix[14], Float.equals)) throw new Error('!matrix[13].solveSystemOfEquationsProblem().equals(matrix[14], Float.equals)');

  // console.log(matrix[13].solveSystemOfEquationsProblem().toString());

  // console.log(matrix[9].toSimplexTableau().solveSystemOfEquationsProblem().toString());
}


test().catch(_ => console.log(_));