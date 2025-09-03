// rubikUtils.ts
// Các hàm xử lý trạng thái Rubik và áp dụng scramble

export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type CubeState = Record<Face, string[]>;

export function rotateFace(face: Face, cubeState: CubeState) {
  const faceColors = [...cubeState[face]];
  cubeState[face][0] = faceColors[6];
  cubeState[face][1] = faceColors[3];
  cubeState[face][2] = faceColors[0];
  cubeState[face][3] = faceColors[7];
  cubeState[face][5] = faceColors[1];
  cubeState[face][6] = faceColors[8];
  cubeState[face][7] = faceColors[5];
  cubeState[face][8] = faceColors[2];
  switch (face) {
    case 'F':
      [cubeState.U[6], cubeState.U[7], cubeState.U[8],
        cubeState.R[0], cubeState.R[3], cubeState.R[6],
        cubeState.D[2], cubeState.D[1], cubeState.D[0],
        cubeState.L[2], cubeState.L[5], cubeState.L[8]] =
        [cubeState.L[8], cubeState.L[5], cubeState.L[2],
          cubeState.U[6], cubeState.U[7], cubeState.U[8],
          cubeState.R[0], cubeState.R[3], cubeState.R[6],
          cubeState.D[0], cubeState.D[1], cubeState.D[2]];
      break;
    case 'U':
      [cubeState.F[0], cubeState.F[1], cubeState.F[2],
        cubeState.R[0], cubeState.R[1], cubeState.R[2],
        cubeState.B[0], cubeState.B[1], cubeState.B[2],
        cubeState.L[0], cubeState.L[1], cubeState.L[2]] =
        [cubeState.R[0], cubeState.R[1], cubeState.R[2],
          cubeState.B[0], cubeState.B[1], cubeState.B[2],
          cubeState.L[0], cubeState.L[1], cubeState.L[2],
          cubeState.F[0], cubeState.F[1], cubeState.F[2]];
      break;
    case 'D':
      [cubeState.F[6], cubeState.F[7], cubeState.F[8],
        cubeState.R[6], cubeState.R[7], cubeState.R[8],
        cubeState.B[6], cubeState.B[7], cubeState.B[8],
        cubeState.L[6], cubeState.L[7], cubeState.L[8]] =
        [cubeState.L[6], cubeState.L[7], cubeState.L[8],
          cubeState.F[6], cubeState.F[7], cubeState.F[8],
          cubeState.R[6], cubeState.R[7], cubeState.R[8],
          cubeState.B[6], cubeState.B[7], cubeState.B[8]];
      break;
    case 'R':
      [cubeState.U[2], cubeState.U[5], cubeState.U[8],
        cubeState.F[2], cubeState.F[5], cubeState.F[8],
        cubeState.D[2], cubeState.D[5], cubeState.D[8],
        cubeState.B[6], cubeState.B[3], cubeState.B[0]] =
        [cubeState.F[2], cubeState.F[5], cubeState.F[8],
          cubeState.D[2], cubeState.D[5], cubeState.D[8],
          cubeState.B[6], cubeState.B[3], cubeState.B[0],
          cubeState.U[2], cubeState.U[5], cubeState.U[8]];
      break;
    case 'L':
      [cubeState.U[0], cubeState.U[3], cubeState.U[6],
        cubeState.F[0], cubeState.F[3], cubeState.F[6],
        cubeState.D[0], cubeState.D[3], cubeState.D[6],
        cubeState.B[8], cubeState.B[5], cubeState.B[2]] =
        [cubeState.B[8], cubeState.B[5], cubeState.B[2],
          cubeState.U[0], cubeState.U[3], cubeState.U[6],
          cubeState.F[0], cubeState.F[3], cubeState.F[6],
          cubeState.D[0], cubeState.D[3], cubeState.D[6]];
      break;
    case 'B':
      [cubeState.U[0], cubeState.U[1], cubeState.U[2],
        cubeState.L[0], cubeState.L[3], cubeState.L[6],
        cubeState.D[8], cubeState.D[7], cubeState.D[6],
        cubeState.R[2], cubeState.R[5], cubeState.R[8]] =
        [cubeState.R[2], cubeState.R[5], cubeState.R[8],
          cubeState.U[2], cubeState.U[1], cubeState.U[0],
          cubeState.L[6], cubeState.L[3], cubeState.L[0],
          cubeState.D[8], cubeState.D[7], cubeState.D[6]];
      break;
  }
}

export function rotateFace2x2(face: Face, cubeState: CubeState) {
  const c = [...cubeState[face]];
  cubeState[face][0] = c[2];
  cubeState[face][1] = c[0];
  cubeState[face][2] = c[3];
  cubeState[face][3] = c[1];
  switch (face) {
    case 'F': {
      [cubeState.U[2], cubeState.U[3], cubeState.R[0], cubeState.R[2], cubeState.D[0], cubeState.D[1], cubeState.L[1], cubeState.L[3]] =
        [cubeState.L[3], cubeState.L[1], cubeState.U[2], cubeState.U[3], cubeState.R[2], cubeState.R[0], cubeState.D[0], cubeState.D[1]];
      break;
    }
    case 'U': {
      [cubeState.F[0], cubeState.F[1], cubeState.L[0], cubeState.L[1], cubeState.B[0], cubeState.B[1], cubeState.R[0], cubeState.R[1]] =
        [cubeState.R[0], cubeState.R[1], cubeState.F[0], cubeState.F[1], cubeState.L[0], cubeState.L[1], cubeState.B[0], cubeState.B[1]];
      break;
    }
    case 'L': {
      [cubeState.U[0], cubeState.U[2], cubeState.B[3], cubeState.B[1], cubeState.D[0], cubeState.D[2], cubeState.F[0], cubeState.F[2]] =
        [cubeState.B[3], cubeState.B[1], cubeState.D[0], cubeState.D[2], cubeState.F[0], cubeState.F[2], cubeState.U[0], cubeState.U[2]];
      break;
    }
    case 'R': {
      [cubeState.U[1], cubeState.U[3], cubeState.F[1], cubeState.F[3], cubeState.D[1], cubeState.D[3], cubeState.B[2], cubeState.B[0]] =
        [cubeState.F[1], cubeState.F[3], cubeState.D[1], cubeState.D[3], cubeState.B[2], cubeState.B[0], cubeState.U[1], cubeState.U[3]];
      break;
    }
  }
}

export function getSolvedCubeState(size: number | string): CubeState {
  if (size === 2) {
    return {
      B: Array(4).fill('blue'),
      U: Array(4).fill('white'),
      D: Array(4).fill('yellow'),
      L: Array(4).fill('orange'),
      R: Array(4).fill('red'),
      F: Array(4).fill('green'),
    };
  } else if (size === 4) {
    return {
      B: Array(16).fill('blue'),
      U: Array(16).fill('white'),
      D: Array(16).fill('yellow'),
      L: Array(16).fill('orange'),
      R: Array(16).fill('red'),
      F: Array(16).fill('green'),
    };
  } else if (size === 'pyraminx') {
    return {
      B: Array(1).fill('blue'),
      U: Array(1).fill('white'),
      D: Array(1).fill('yellow'),
      L: Array(1).fill('orange'),
      R: Array(1).fill('red'),
      F: Array(1).fill('green'),
    };
  } else {
    // 3x3 default
    return {
      B: Array(9).fill('blue'),
      U: Array(9).fill('white'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
    };
  }
}

export function applyScrambleToCubeState(scramble: string, size: number | string): CubeState {
  let cubeState = getSolvedCubeState(size);
  const moves = scramble.split(/\s+/);
  moves.forEach((move: string) => {
    if (!move) return;
    let face = move[0] as Face;
    let amount = move.includes("'") ? 3 : 1;
    if (move.includes("2")) amount = 2;
    for (let i = 0; i < amount; i++) {
      if (size === 2) {
        rotateFace2x2(face, cubeState);
      } else if (size === 4) {
        // 4x4 sử dụng logic 3x3 nhưng với 16 sticker
        rotateFace(face, cubeState);
      } else if (size === 'pyraminx') {
        // Pyraminx chỉ cần thay đổi màu đơn giản
        cubeState[face] = cubeState[face].map(() => 
          Math.random() > 0.5 ? cubeState[face][0] : 
          ['red', 'green', 'blue', 'yellow', 'orange', 'white'][Math.floor(Math.random() * 6)]
        );
      } else {
        // 3x3 default
        rotateFace(face, cubeState);
      }
    }
  });
  return cubeState;
}
