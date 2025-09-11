// lib/dailyConfig.ts
export const DAILY_CONFIG = {
  // Thay thế bằng domain thật của bạn từ Daily.co
  DOMAIN: process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'your-domain.daily.co',
  API_KEY: process.env.DAILY_API_KEY || '',
  
  // Cấu hình mặc định cho Daily call
  DEFAULT_CONFIG: {
    showLeaveButton: false,
    showFullscreenButton: false,
    showLocalVideo: true,
    showParticipantsBar: false,
    theme: {
      accent: '#007bff',
      accentText: '#ffffff',
      background: '#1a1a1a',
      backgroundAccent: '#2d2d2d',
      baseText: '#ffffff',
      border: '#404040',
      mainAreaBg: '#000000',
      supportiveText: '#cccccc',
    }
  }
};

export const getDailyRoomUrl = (roomName: string): string => {
  return `https://${DAILY_CONFIG.DOMAIN}/${roomName}`;
};
