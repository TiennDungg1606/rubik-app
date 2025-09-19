// Cấu hình socket cho 1vs1 và 2vs2
export const SOCKET_CONFIG = {
  // Server 1vs1 (port 3001)
  SERVER_1VS1: process.env.NODE_ENV === 'production' 
    ? 'https://rubik-timer-1vs1.herokuapp.com' 
    : 'http://localhost:3001',
  
  // Server 2vs2 (port 3002)  
  SERVER_2VS2: process.env.NODE_ENV === 'production'
    ? 'https://rubik-timer-2vs2.herokuapp.com'
    : 'http://localhost:3002',
};

// Hàm lấy URL server dựa trên game mode
export function getSocketUrl(gameMode: '1vs1' | '2vs2'): string {
  return gameMode === '2vs2' ? SOCKET_CONFIG.SERVER_2VS2 : SOCKET_CONFIG.SERVER_1VS1;
}

// Hàm lấy port dựa trên game mode
export function getSocketPort(gameMode: '1vs1' | '2vs2'): number {
  return gameMode === '2vs2' ? 3002 : 3001;
}
