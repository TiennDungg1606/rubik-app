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
  // Phần 1: 20 bước xáo giống 3x3 (outer layer moves)
  const outerMoves = ['R', 'U', 'F', 'L', 'D', 'B'];
  const outerModifiers = ['', '\'', '2'];
  const outerLength = 20;
  
  // Phần 2: Mix của wide moves và regular moves, đảm bảo có 9-12 wide moves
  const wideMoves = ['Uw', 'Rw', 'Fw']; // Chỉ sử dụng Uw, Rw, Fw
  const regularMoves = ['R', 'U', 'F', 'L', 'D', 'B']; // Có thể xen lẫn
  const allModifiers = ['', '\'', '2'];
  
  // Tạo phần 1 (3x3-style)
  const part1 = generateRandomMoveSequence(outerMoves, outerModifiers, outerLength);
  
  // Tạo phần 2 với đảm bảo có 9-12 wide moves
  const part2 = generate4x4Part2(wideMoves, regularMoves, allModifiers);
  
  // Kết hợp cả hai với khoảng cách rõ ràng
  const totalWideMoves = (part2.match(/w/g) || []).length;
  console.log(`4x4 Scramble: ${outerLength} outer + ${totalWideMoves} wide moves in part 2`);
  
  return part1 + '  ' + part2;
}

// Hàm tạo phần 2 cho 4x4 - đảm bảo có 23-26 bước tổng cộng, trong đó 9-12 wide moves
function generate4x4Part2(wideMoves: string[], regularMoves: string[], modifiers: string[]): string {
  const sequence: string[] = [];
  const targetWideMoves = Math.floor(Math.random() * 4) + 9; // 9-12 wide moves
  const totalMoves = Math.floor(Math.random() * 4) + 23; // 23-26 bước tổng cộng
  
  let wideMovesCount = 0;
  
  for (let i = 0; i < totalMoves; i++) {
    let move: string;
    let attempts = 0;
    const maxAttempts = 20;
    let lastMove = '';
    let lastAxis = '';
    
    // Nếu chưa đủ wide moves, ưu tiên chọn wide moves
    const shouldUseWide = wideMovesCount < targetWideMoves && Math.random() < 0.6;
    const availableMoves = shouldUseWide ? wideMoves : [...wideMoves, ...regularMoves];
    
    // Tránh lặp lại cùng một move hoặc cùng axis liên tiếp
    do {
      move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      attempts++;
    } while (
      attempts < maxAttempts && 
      (move === lastMove || getAxis(move) === lastAxis)
    );
    
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    sequence.push(move + modifier);
    
    // Đếm wide moves
    if (move.includes('w')) {
      wideMovesCount++;
    }
    
    lastMove = move;
    lastAxis = getAxis(move);
  }
  
  return sequence.join(' ');
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
  const tipMoves = ['l', 'r','u', 'b']; // Kí tự nhỏ cho tip moves - chỉ l, r, b (không có d)
  const modifiers = ['', '\'']; // Không có 2 (double move) cho Pyraminx
  
  // 8-9 kí tự lớn (main moves) - tránh lặp liên tiếp
  const largeMovesLength = Math.random() < 0.5 ? 8 : 9;
  const largeScramble = generatePyraminxMainMoves(mainMoves, modifiers, largeMovesLength);
  
  // 2-4 kí tự nhỏ ở cuối (tip moves - l, r, b) - tránh lặp liên tiếp
  const smallMovesLength = Math.floor(Math.random() * 3) + 2; // 2-4
  const smallScramble = generatePyraminxTipMoves(tipMoves, modifiers, smallMovesLength);
  
  // Kết hợp cả hai với khoảng cách rõ ràng
  // Ví dụ: "R L' U B R' L U'  l r b" (đúng) hoặc "R L U B R' L' U' B  l" (đúng)
  // Không được: "r b u b'" (sai vì bị lặp b)
  
  // Debug log để kiểm tra
  const mainMovesCount = largeScramble.split(' ').length;
  const tipMovesCount = smallScramble.split(' ').length;
  console.log(`Pyraminx Scramble: ${mainMovesCount} main + ${tipMovesCount} tip moves`);
  
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
    const maxAttempts = 20; // Tăng số lần thử để tránh lặp
    
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

// Hàm tạo main moves cho Pyraminx - tránh lặp ký tự liên tiếp
function generatePyraminxMainMoves(moves: string[], modifiers: string[], length: number): string {
  const sequence: string[] = [];
  let lastMove = '';
  
  for (let i = 0; i < length; i++) {
    let move: string;
    let attempts = 0;
    const maxAttempts = 30; // Tăng số lần thử để tránh lặp
    
    // Tránh lặp lại cùng một move liên tiếp
    do {
      move = moves[Math.floor(Math.random() * moves.length)];
      attempts++;
    } while (attempts < maxAttempts && move === lastMove);
    
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    sequence.push(move + modifier);
    lastMove = move;
  }
  
  return sequence.join(' ');
}

// Hàm tạo tip moves cho Pyraminx - đảm bảo không lặp ký tự
function generatePyraminxTipMoves(moves: string[], modifiers: string[], length: number): string {
  const sequence: string[] = [];
  const usedMoves = new Set<string>(); // Track which moves have been used
  
  // Shuffle the available moves to ensure randomness
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < length && i < shuffledMoves.length; i++) {
    const move = shuffledMoves[i];
    
    // Only add if this move hasn't been used yet
    if (!usedMoves.has(move)) {
      const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
      sequence.push(move + modifier);
      usedMoves.add(move);
    }
  }
  
  return sequence.join(' ');
}

// Alias cho backward compatibility
export const getScramble = generateWcaScramble;
