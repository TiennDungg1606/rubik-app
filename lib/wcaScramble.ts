// Hàm tạo scramble cho các thể loại khối Rubik khác nhau
export function generateWcaScramble(cubeType: string = '3x3'): string {
  try {
    // Thử sử dụng thư viện scrambler nếu có
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const scrambler = require('scrambler');
    
    if (scrambler && typeof scrambler.cube === 'function') {
      return scrambler.cube(getCubeSize(cubeType));
    }
    
    if (scrambler && scrambler.default && typeof scrambler.default.cube === 'function') {
      return scrambler.default.cube(getCubeSize(cubeType));
    }
  } catch (e) {
    // Bỏ qua lỗi và sử dụng fallback
  }
  
  // Fallback: Tạo scramble ngẫu nhiên cho từng thể loại
  return generateRandomScramble(cubeType);
}

// Hàm lấy kích thước khối từ tên
function getCubeSize(cubeType: string): number {
  switch (cubeType.toLowerCase()) {
    case '2x2': return 2;
    case '4x4': return 4;
    case '5x5': return 5;
    case '6x6': return 6;
    case '7x7': return 7;
    case '3x3':
    default: return 3;
  }
}

// Hàm tạo scramble ngẫu nhiên cho từng thể loại
function generateRandomScramble(cubeType: string): string {
  switch (cubeType.toLowerCase()) {
    case '2x2':
      return generate2x2Scramble();
    case '4x4':
      return generate4x4Scramble();
    case '5x5':
      return generate5x5Scramble();
    case '6x6':
      return generate6x6Scramble();
    case '7x7':
      return generate7x7Scramble();
    case 'pyraminx':
      return generatePyraminxScramble();
    case 'skewb':
      return generateSkewbScramble();
    case 'megaminx':
      return generateMegaminxScramble();
    case '3x3':
    default:
      return generate3x3Scramble();
  }
}

// Hàm tạo scramble cho 2x2
function generate2x2Scramble(): string {
  const moves = ['R', 'U', 'F'];
  const modifiers = ['', '\'', '2'];
  const length = 9; // 2x2 thường cần ít bước hơn
  
  return generateRandomMoveSequence(moves, modifiers, length);
}

// Hàm tạo scramble cho 3x3
function generate3x3Scramble(): string {
  const moves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const modifiers = ['', '\'', '2'];
  const length = 20; // 3x3 cần khoảng 20 bước
  
  return generateRandomMoveSequence(moves, modifiers, length);
}

// Hàm tạo scramble cho 4x4
function generate4x4Scramble(): string {
  // 20 bước xáo giống 3x3 (outer layer moves)
  const outerMoves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const outerModifiers = ['', '\'', '2'];
  const outerLength = 20;
  
  // 23 bước xáo bên trong (inner layer moves - có thể lộn wide moves và normal moves)
  const innerMoves = ['Uw', 'Rw', 'Fw', 'R', 'L', 'U', 'B', 'D', 'F'];
  const innerModifiers = ['', '\'', '2'];
  const innerLength = 23;
  
  // Tạo outer scramble (20 bước) - giống như 3x3
  const outerScramble = generateRandomMoveSequence(outerMoves, outerModifiers, outerLength);
  
  // Tạo inner scramble (23 bước) - xáo các lớp bên trong (có thể lộn wide và normal)
  const innerScramble = generateRandomMoveSequence(innerMoves, innerModifiers, innerLength);
  
  // Kết hợp cả hai với khoảng cách rõ ràng
  // Ví dụ: "R U F2 L' D B  Uw R Rw' Fw2 L U B D F"
  return outerScramble + '  ' + innerScramble;
}

// Hàm tạo scramble cho 5x5
function generate5x5Scramble(): string {
  const moves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const wideMoves = ['Rw', 'Uw', 'Fw', 'Lw', 'Dw', 'Bw'];
  const middleMoves = ['3Rw', '3Uw', '3Fw', '3Lw', '3Dw', '3Bw'];
  const modifiers = ['', '\'', '2'];
  const length = 30; // 5x5 cần nhiều bước hơn
  
  const allMoves = [...moves, ...wideMoves, ...middleMoves];
  return generateRandomMoveSequence(allMoves, modifiers, length);
}

// Hàm tạo scramble cho 6x6
function generate6x6Scramble(): string {
  const moves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const wideMoves = ['Rw', 'Uw', 'Fw', 'Lw', 'Dw', 'Bw'];
  const middleMoves = ['3Rw', '3Uw', '3Fw', '3Lw', '3Dw', '3Bw'];
  const outerMoves = ['4Rw', '4Uw', '4Fw', '4Lw', '4Dw', '4Bw'];
  const modifiers = ['', '\'', '2'];
  const length = 35; // 6x6 cần nhiều bước hơn
  
  const allMoves = [...moves, ...wideMoves, ...middleMoves, ...outerMoves];
  return generateRandomMoveSequence(allMoves, modifiers, length);
}

// Hàm tạo scramble cho 7x7
function generate7x7Scramble(): string {
  const moves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const wideMoves = ['Rw', 'Uw', 'Fw', 'Lw', 'Dw', 'Bw'];
  const middleMoves = ['3Rw', '3Uw', '3Fw', '3Lw', '3Dw', '3Bw'];
  const outerMoves = ['4Rw', '4Uw', '4Fw', '4Lw', '4Dw', '4Bw'];
  const farMoves = ['5Rw', '5Uw', '5Fw', '5Lw', '5Dw', '5Bw'];
  const modifiers = ['', '\'', '2'];
  const length = 40; // 7x7 cần nhiều bước hơn
  
  const allMoves = [...moves, ...wideMoves, ...middleMoves, ...outerMoves, ...farMoves];
  return generateRandomMoveSequence(allMoves, modifiers, length);
}

// Hàm tạo scramble cho Pyraminx
function generatePyraminxScramble(): string {
  const mainMoves = ['R', 'L', 'U', 'B']; // Chỉ bao gồm R L U B, không có D và F
  const tipMoves = ['l', 'r', 'b']; // Kí tự nhỏ cho tip moves - chỉ l, r, b (không có d)
  const modifiers = ['', '\'']; // Không có 2 (double move) cho Pyraminx
  
  // 8-9 kí tự lớn (main moves) - tránh lặp liên tiếp
  const largeMovesLength = Math.random() < 0.5 ? 8 : 9;
  const largeScramble = generateRandomMoveSequence(mainMoves, modifiers, largeMovesLength);
  
  // 1-4 kí tự nhỏ ở cuối (tip moves - l, r, b) - tránh lặp liên tiếp
  const smallMovesLength = Math.floor(Math.random() * 4) + 1; // 1-4
  const smallScramble = generateRandomMoveSequence(tipMoves, modifiers, smallMovesLength);
  
  // Kết hợp cả hai với khoảng cách rõ ràng
  // Ví dụ: "R L' U B R' L U'  l r b" (đúng) hoặc "R L U B R' L' U' B  l" (đúng)
  // Không được: "r b u b'" (sai vì bị lặp b)
  return largeScramble + '  ' + smallScramble;
}

// Hàm tạo scramble cho Skewb
function generateSkewbScramble(): string {
  const moves = ['R', 'U', 'L', 'B'];
  const modifiers = ['', '\''];
  const length = 12; // Skewb cần ít bước hơn
  
  return generateRandomMoveSequence(moves, modifiers, length);
}

// Hàm tạo scramble cho Megaminx
function generateMegaminxScramble(): string {
  const moves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const modifiers = ['', '\'', '2'];
  const length = 45; // Megaminx cần nhiều bước hơn
  
  return generateRandomMoveSequence(moves, modifiers, length);
}

// Hàm tạo chuỗi di chuyển ngẫu nhiên
function generateRandomMoveSequence(moves: string[], modifiers: string[], length: number): string {
  const sequence: string[] = [];
  let lastMove = '';
  let lastAxis = '';
  
  for (let i = 0; i < length; i++) {
    let move: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Tránh lặp lại cùng một move hoặc cùng axis liên tiếp
    do {
      move = moves[Math.floor(Math.random() * moves.length)];
      attempts++;
    } while (
      attempts < maxAttempts && 
      (move === lastMove || getAxis(move) === lastAxis)
    );
    
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    sequence.push(move + modifier);
    
    lastMove = move;
    lastAxis = getAxis(move);
  }
  
  return sequence.join(' ');
}

// Hàm lấy axis của move (R, L = R axis; U, D = U axis; F, B = F axis)
function getAxis(move: string): string {
  if (move.includes('R') || move.includes('L')) return 'R';
  if (move.includes('U') || move.includes('D')) return 'U';
  if (move.includes('F') || move.includes('B')) return 'F';
  return 'R'; // fallback
}

// Alias cho backward compatibility
export const getScramble = generateWcaScramble;
