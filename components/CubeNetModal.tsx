import React, { useEffect, useState } from 'react';
import { 
  CubeNetModalProps, 
  Face, 
  CubeState, 
  applyScrambleToCubeState, 
  renderStickers, 
  getLayoutGrid, 
  getCubeConfig,
  isCubeSizeSupported,
  getCubeTypeName
} from '@/lib/cubeNetRenderer';

export default function CubeNetModal({ scramble, open, onClose, size }: CubeNetModalProps) {
  const [cubeState, setCubeState] = useState<CubeState>(() => applyScrambleToCubeState(scramble || '', size));
  
  useEffect(() => {
    setCubeState(applyScrambleToCubeState(scramble || '', size));
  }, [scramble, size]);

  // Lấy cấu hình cho loại cube hiện tại
  const config = getCubeConfig(size);
  const layoutGrid = getLayoutGrid(size);
  const faceSize = config.faceSize;

  // Kiểm tra xem loại cube có được hỗ trợ không
  if (!isCubeSizeSupported(size)) {
    return open ? (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black bg-opacity-60" style={{ backdropFilter: 'blur(2px)' }}>
        <div className="bg-red-100 rounded-xl p-6 shadow-lg relative border-4 border-red-400">
          <button onClick={onClose} className="absolute top-2 right-2 px-2 py-1 bg-red-500 hover:bg-red-700 text-white rounded font-bold">Đóng</button>
          <div className="text-center font-bold text-lg text-red-700 mb-4">
            Loại cube không được hỗ trợ
          </div>
          <div className="text-center text-red-600">
            Hiện tại chỉ hỗ trợ cube từ 2x2 đến 7x7
          </div>
        </div>
      </div>
    ) : null;
  }

  return open ? (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black bg-opacity-60" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="bg-pink-100 rounded-xl p-4 shadow-lg relative" style={{ minWidth: 320, minHeight: 320 }}>
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 px-2 py-1 bg-red-500 hover:bg-red-700 text-white rounded font-bold"
        >
          Đóng
        </button>
        
        <div className="mb-2 text-center font-bold text-lg text-gray-700">
          {getCubeTypeName(size)} - Lưới Scramble
        </div>
        
        <div 
          id="net-view" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(4, ${faceSize}px)`, 
            gridTemplateRows: `repeat(3, ${faceSize}px)`, 
            gap: 2, 
            background: 'none' 
          }}
        >
          {layoutGrid.flatMap((row, rowIdx) =>
            row.map((faceKey, colIdx) => {
              if (faceKey === '') {
                return (
                  <div 
                    key={`blank-${rowIdx}-${colIdx}`} 
                    className="net-face-empty" 
                    style={{ 
                      width: faceSize, 
                      height: faceSize, 
                      background: 'none' 
                    }}
                  />
                );
              } else {
                return (
                  <React.Fragment key={faceKey}>
                    {renderStickers(faceKey as Face, cubeState, size, faceSize)}
                  </React.Fragment>
                );
              }
            })
          )}
        </div>
        
        <div className="mt-3 text-gray-700 text-sm text-center font-mono">
          Scramble: <span className="font-bold">{scramble}</span>
        </div>
        
        <div className="mt-2 text-gray-600 text-xs text-center">
          Loại cube: {getCubeTypeName(size)}
        </div>
      </div>
    </div>
  ) : null;
}
