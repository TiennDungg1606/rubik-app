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
  const moves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const wideMoves = ['Rw', 'Uw', 'Fw', 'Lw', 'Dw', 'Bw'];
  const modifiers = ['', '\'', '2'];
  const length = 25; // 4x4 cần nhiều bước hơn
  
  const allMoves = [...moves, ...wideMoves];
  return generateRandomMoveSequence(allMoves, modifiers, length);
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
  const moves = ['R', 'U', 'L', 'B'];
  const modifiers = ['', '\''];
  const length = 15; // Pyraminx cần ít bước hơn
  
  return generateRandomMoveSequence(moves, modifiers, length);
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
