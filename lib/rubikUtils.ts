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

export function rotateFace4x4(face: Face, cubeState: CubeState) {
  // Xoay mặt chính (16 sticker cho 4x4)
  const faceColors = [...cubeState[face]];
  // Xoay 90 độ theo chiều kim đồng hồ
  cubeState[face][0] = faceColors[12];
  cubeState[face][1] = faceColors[8];
  cubeState[face][2] = faceColors[4];
  cubeState[face][3] = faceColors[0];
  cubeState[face][4] = faceColors[13];
  cubeState[face][5] = faceColors[9];
  cubeState[face][6] = faceColors[5];
  cubeState[face][7] = faceColors[1];
  cubeState[face][8] = faceColors[14];
  cubeState[face][9] = faceColors[10];
  cubeState[face][10] = faceColors[6];
  cubeState[face][11] = faceColors[2];
  cubeState[face][12] = faceColors[15];
  cubeState[face][13] = faceColors[11];
  cubeState[face][14] = faceColors[7];
  cubeState[face][15] = faceColors[3];
  
  // Xoay các cạnh liên quan (4x4 có 2 lớp cạnh)
  switch (face) {
    case 'F':
      // F face: U[12-15] <-> R[0,4,8,12] <-> D[0-3] <-> L[3,7,11,15]
      [cubeState.U[12], cubeState.U[13], cubeState.U[14], cubeState.U[15],
        cubeState.R[0], cubeState.R[4], cubeState.R[8], cubeState.R[12],
        cubeState.D[0], cubeState.D[1], cubeState.D[2], cubeState.D[3],
        cubeState.L[3], cubeState.L[7], cubeState.L[11], cubeState.L[15]] =
        [cubeState.L[15], cubeState.L[11], cubeState.L[7], cubeState.L[3],
          cubeState.U[12], cubeState.U[13], cubeState.U[14], cubeState.U[15],
          cubeState.R[12], cubeState.R[8], cubeState.R[4], cubeState.R[0],
          cubeState.D[0], cubeState.D[1], cubeState.D[2], cubeState.D[3]];
      break;
    case 'U':
      // U face: F[0-3] <-> R[0-3] <-> B[0-3] <-> L[0-3]
      [cubeState.F[0], cubeState.F[1], cubeState.F[2], cubeState.F[3],
        cubeState.R[0], cubeState.R[1], cubeState.R[2], cubeState.R[3],
        cubeState.B[0], cubeState.B[1], cubeState.B[2], cubeState.B[3],
        cubeState.L[0], cubeState.L[1], cubeState.L[2], cubeState.L[3]] =
        [cubeState.R[0], cubeState.R[1], cubeState.R[2], cubeState.R[3],
          cubeState.B[0], cubeState.B[1], cubeState.B[2], cubeState.B[3],
          cubeState.L[0], cubeState.L[1], cubeState.L[2], cubeState.L[3],
          cubeState.F[0], cubeState.F[1], cubeState.F[2], cubeState.F[3]];
      break;
    case 'D':
      // D face: F[12-15] <-> R[12-15] <-> B[12-15] <-> L[12-15]
      [cubeState.F[12], cubeState.F[13], cubeState.F[14], cubeState.F[15],
        cubeState.R[12], cubeState.R[13], cubeState.R[14], cubeState.R[15],
        cubeState.B[12], cubeState.B[13], cubeState.B[14], cubeState.B[15],
        cubeState.L[12], cubeState.L[13], cubeState.L[14], cubeState.L[15]] =
        [cubeState.L[12], cubeState.L[13], cubeState.L[14], cubeState.L[15],
          cubeState.F[12], cubeState.F[13], cubeState.F[14], cubeState.F[15],
          cubeState.R[12], cubeState.R[13], cubeState.R[14], cubeState.R[15],
          cubeState.B[12], cubeState.B[13], cubeState.B[14], cubeState.B[15]];
      break;
    case 'R':
      // R face: U[3,7,11,15] <-> F[3,7,11,15] <-> D[3,7,11,15] <-> B[0,4,8,12]
      [cubeState.U[3], cubeState.U[7], cubeState.U[11], cubeState.U[15],
        cubeState.F[3], cubeState.F[7], cubeState.F[11], cubeState.F[15],
        cubeState.D[3], cubeState.D[7], cubeState.D[11], cubeState.D[15],
        cubeState.B[0], cubeState.B[4], cubeState.B[8], cubeState.B[12]] =
        [cubeState.F[3], cubeState.F[7], cubeState.F[11], cubeState.F[15],
          cubeState.D[3], cubeState.D[7], cubeState.D[11], cubeState.D[15],
          cubeState.B[12], cubeState.B[8], cubeState.B[4], cubeState.B[0],
          cubeState.U[15], cubeState.U[11], cubeState.U[7], cubeState.U[3]];
      break;
    case 'L':
      // L face: U[0,4,8,12] <-> F[0,4,8,12] <-> D[0,4,8,12] <-> B[3,7,11,15]
      [cubeState.U[0], cubeState.U[4], cubeState.U[8], cubeState.U[12],
        cubeState.F[0], cubeState.F[4], cubeState.F[8], cubeState.F[12],
        cubeState.D[0], cubeState.D[4], cubeState.D[8], cubeState.D[12],
        cubeState.B[3], cubeState.B[7], cubeState.B[11], cubeState.B[15]] =
        [cubeState.B[15], cubeState.B[11], cubeState.B[7], cubeState.B[3],
          cubeState.U[0], cubeState.U[4], cubeState.U[8], cubeState.U[12],
          cubeState.F[0], cubeState.F[4], cubeState.F[8], cubeState.F[12],
          cubeState.D[12], cubeState.D[8], cubeState.D[4], cubeState.D[0]];
      break;
    case 'B':
      // B face: U[0-3] <-> L[0,4,8,12] <-> D[12-15] <-> R[3,7,11,15]
      [cubeState.U[0], cubeState.U[1], cubeState.U[2], cubeState.U[3],
        cubeState.L[0], cubeState.L[4], cubeState.L[8], cubeState.L[12],
        cubeState.D[12], cubeState.D[13], cubeState.D[14], cubeState.D[15],
        cubeState.R[3], cubeState.R[7], cubeState.R[11], cubeState.R[15]] =
        [cubeState.R[15], cubeState.R[11], cubeState.R[7], cubeState.R[3],
          cubeState.U[3], cubeState.U[2], cubeState.U[1], cubeState.U[0],
          cubeState.L[12], cubeState.L[8], cubeState.L[4], cubeState.L[0],
          cubeState.D[15], cubeState.D[14], cubeState.D[13], cubeState.D[12]];
      break;
  }
}

export function rotateWideMove4x4(move: string, cubeState: CubeState) {
  // Xử lý wide moves cho 4x4: Uw, Rw, Fw
  const face = move[0] as Face;
  
  // Thực hiện move một lần (amount được xử lý ở ngoài)
  switch (face) {
      case 'U':
        // Uw: xoay cả 2 lớp U (lớp trên U và lớp dưới U)
        // Thực hiện U (xoay mặt U)
        rotateFace4x4('U', cubeState);
        
        // Uw: hoán đổi các sticker giữa các mặt liên quan
        // F[0-3] <-> R[0-3] <-> B[0-3] <-> L[0-3] (hàng 1)
        // F[4-7] <-> R[4-7] <-> B[4-7] <-> L[4-7] (hàng 2)
        [cubeState.F[0], cubeState.F[1], cubeState.F[2], cubeState.F[3],
         cubeState.R[0], cubeState.R[1], cubeState.R[2], cubeState.R[3],
         cubeState.B[0], cubeState.B[1], cubeState.B[2], cubeState.B[3],
         cubeState.L[0], cubeState.L[1], cubeState.L[2], cubeState.L[3]] =
        [cubeState.L[0], cubeState.L[1], cubeState.L[2], cubeState.L[3],
         cubeState.F[0], cubeState.F[1], cubeState.F[2], cubeState.F[3],
         cubeState.R[0], cubeState.R[1], cubeState.R[2], cubeState.R[3],
         cubeState.B[0], cubeState.B[1], cubeState.B[2], cubeState.B[3]];
        
        [cubeState.F[4], cubeState.F[5], cubeState.F[6], cubeState.F[7],
         cubeState.R[4], cubeState.R[5], cubeState.R[6], cubeState.R[7],
         cubeState.B[4], cubeState.B[5], cubeState.B[6], cubeState.B[7],
         cubeState.L[4], cubeState.L[5], cubeState.L[6], cubeState.L[7]] =
        [cubeState.L[4], cubeState.L[5], cubeState.L[6], cubeState.L[7],
         cubeState.F[4], cubeState.F[5], cubeState.F[6], cubeState.F[7],
         cubeState.R[4], cubeState.R[5], cubeState.R[6], cubeState.R[7],
         cubeState.B[4], cubeState.B[5], cubeState.B[6], cubeState.B[7]];
        break;
      case 'R':
        // Rw: xoay cả 2 lớp R (lớp phải R và lớp trái R)
        // Thực hiện R (xoay mặt R)
        rotateFace4x4('R', cubeState);
        
        // Rw: hoán đổi các sticker giữa các mặt liên quan
        // U[3,7,11,15] <-> F[3,7,11,15] <-> D[3,7,11,15] <-> B[0,4,8,12]
        [cubeState.U[3], cubeState.U[7], cubeState.U[11], cubeState.U[15],
        cubeState.F[3], cubeState.F[7], cubeState.F[11], cubeState.F[15],
        cubeState.D[3], cubeState.D[7], cubeState.D[11], cubeState.D[15],
        cubeState.B[0], cubeState.B[4], cubeState.B[8], cubeState.B[12]] =
        [cubeState.F[3], cubeState.F[7], cubeState.F[11], cubeState.F[15],
          cubeState.D[3], cubeState.D[7], cubeState.D[11], cubeState.D[15],
          cubeState.B[12], cubeState.B[8], cubeState.B[4], cubeState.B[0],
          cubeState.U[15], cubeState.U[11], cubeState.U[7], cubeState.U[3]];

        [cubeState.U[2], cubeState.U[6], cubeState.U[10], cubeState.U[14],
        cubeState.F[2], cubeState.F[6], cubeState.F[10], cubeState.F[14],
        cubeState.D[2], cubeState.D[6], cubeState.D[10], cubeState.D[14],
        cubeState.B[1], cubeState.B[5], cubeState.B[9], cubeState.B[13]] =
        [cubeState.F[2], cubeState.F[6], cubeState.F[10], cubeState.F[14],
          cubeState.D[2], cubeState.D[6], cubeState.D[10], cubeState.D[14],
          cubeState.B[13], cubeState.B[9], cubeState.B[5], cubeState.B[1],
          cubeState.U[14], cubeState.U[10], cubeState.U[6], cubeState.U[2]];
        break;
      case 'F':
        // Fw: xoay cả 2 lớp F (lớp trước F và lớp sau F)
        // Thực hiện F (xoay mặt F)
        rotateFace4x4('F', cubeState);
        
        // Fw: hoán đổi các sticker giữa các mặt liên quan (lớp ngoài)
        // U[12-15] <-> R[0,4,8,12] <-> D[0-3] <-> L[3,7,11,15]
        [cubeState.U[12], cubeState.U[13], cubeState.U[14], cubeState.U[15],
         cubeState.R[0], cubeState.R[4], cubeState.R[8], cubeState.R[12],
         cubeState.D[0], cubeState.D[1], cubeState.D[2], cubeState.D[3],
         cubeState.L[3], cubeState.L[7], cubeState.L[11], cubeState.L[15]] =
        [cubeState.L[15], cubeState.L[11], cubeState.L[7], cubeState.L[3],
         cubeState.U[12], cubeState.U[13], cubeState.U[14], cubeState.U[15],
         cubeState.R[12], cubeState.R[8], cubeState.R[4], cubeState.R[0],
         cubeState.D[0], cubeState.D[1], cubeState.D[2], cubeState.D[3]];

        // Fw: hoán đổi các sticker giữa các mặt liên quan (lớp trong)
        // U[8-11] <-> R[1,5,9,13] <-> D[4-7] <-> L[1,5,9,13]
        [cubeState.U[8], cubeState.U[9], cubeState.U[10], cubeState.U[11],
         cubeState.R[1], cubeState.R[5], cubeState.R[9], cubeState.R[13],
         cubeState.D[4], cubeState.D[5], cubeState.D[6], cubeState.D[7],
         cubeState.L[1], cubeState.L[5], cubeState.L[9], cubeState.L[13]] =
        [cubeState.L[13], cubeState.L[9], cubeState.L[5], cubeState.L[1],
         cubeState.U[8], cubeState.U[9], cubeState.U[10], cubeState.U[11],
         cubeState.R[13], cubeState.R[9], cubeState.R[5], cubeState.R[1],
         cubeState.D[4], cubeState.D[5], cubeState.D[6], cubeState.D[7]];
        break;
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
      B: Array(9).fill('blue'),
      U: Array(9).fill('white'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
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
  try {
    let cubeState = getSolvedCubeState(size);
    const moves = scramble.split(/\s+/);
    moves.forEach((move: string) => {
      if (!move) return;
      
      if (size === 'pyraminx') {
        // Pyraminx: xử lý cả ký tự lớn và nhỏ
        let face: Face;
        if (move[0] === 'l') face = 'L';
        else if (move[0] === 'r') face = 'R';
        else if (move[0] === 'u') face = 'U';
        else if (move[0] === 'b') face = 'B';
        else if (move[0] === 'R' || move[0] === 'L' || move[0] === 'U' || move[0] === 'B') {
          face = move[0] as Face;
        } else {
          // Skip invalid moves
          return;
        }
        
        let amount = move.includes("'") ? 3 : 1;
        if (move.includes("2")) amount = 2;
        
        for (let i = 0; i < amount; i++) {
          const colors = ['red', 'green', 'blue', 'yellow', 'orange', 'white'];
          cubeState[face] = cubeState[face].map((_, index) => 
            colors[(index + Math.floor(Math.random() * colors.length)) % colors.length]
          );
        }
      } else {
        // Các loại khác: xử lý như cũ
        let face = move[0] as Face;
        let amount = move.includes("'") ? 3 : 1;
        if (move.includes("2")) amount = 2;
        
        // Xử lý wide moves cho 4x4
        if (size === 4 && move.includes('w')) {
          for (let i = 0; i < amount; i++) {
            rotateWideMove4x4(move, cubeState);
          }
        } else {
          for (let i = 0; i < amount; i++) {
            if (size === 2) {
              rotateFace2x2(face, cubeState);
            } else if (size === 4) {
              // 4x4 sử dụng logic riêng với 16 sticker
              rotateFace4x4(face, cubeState);
            } else {
              // 3x3 default
              rotateFace(face, cubeState);
            }
          }
        }
      }
    });
    return cubeState;
  } catch (error) {
    console.error('Error in applyScrambleToCubeState:', error);
    // Return solved state as fallback
    return getSolvedCubeState(size);
  }
}
