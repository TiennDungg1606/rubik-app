"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { getScramble } from "@/lib/wcaScramble";
import DropdownPortal from "./DropdownPortal";
import { applyScrambleToCubeState, Face, CubeState } from '@/lib/rubikUtils';



// Thêm style cho font Digital-7 Mono
const digitalFontStyle = `
@font-face {
	font-family: 'Digital7Mono';
	src: url('/digital-7-mono.ttf') format('truetype');
	font-weight: normal;
	font-style: normal;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
	width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
	background: rgba(55, 65, 81, 0.3);
	border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
	background: rgba(156, 163, 175, 0.6);
	border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
	background: rgba(156, 163, 175, 0.8);
}

/* Firefox */
.custom-scrollbar {
	scrollbar-width: thin;
	scrollbar-color: rgba(156, 163, 175, 0.6) rgba(55, 65, 81, 0.3);
}

/* Animation cho thông báo "Copied" */
@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translate(-50%, -10px);
	}
	to {
		opacity: 1;
		transform: translate(-50%, 0);
	}
}

.animate-fade-in {
	animation: fadeIn 0.3s ease-out;
}

/* Animation cho solve mới */
@keyframes newSolveHighlight {
	0% {
		background: rgba(34, 197, 94, 0.3);
		transform: scale(1.02);
	}
	50% {
		background: rgba(34, 197, 94, 0.5);
		transform: scale(1.05);
	}
	100% {
		background: rgba(55, 65, 81, 0.3);
		transform: scale(1);
	}
}

.new-solve-highlight {
	animation: newSolveHighlight 2s ease-out;
}

/* Animation cho PB mới */
@keyframes pbCelebration {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.1);
	}
	100% {
		transform: scale(1);
	}
}

.pb-celebration {
	animation: pbCelebration 0.5s ease-out;
}




`;

interface Solve {
  id: string;
  time: number;
  scramble: string;
  date: Date;
  penalty: 'OK' | '+2' | 'DNF';
}

// PyraminxTriangle component - Tam giác hướng lên với cấu trúc 1-3-5
interface PyraminxTriangleProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt F
}

function PyraminxTriangle({ faceSize = 80, faceArray = [] }: PyraminxTriangleProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác
  const point1 = { x: triangleWidth/2, y: 0 };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 4: góc trái dưới
  const point4 = { x: 0, y: triangleHeight };
  
  // Điểm 5: 1/3 từ trái trên cạnh dưới
  const point5 = { x: triangleWidth/3, y: triangleHeight };
  
  // Điểm 6: 2/3 từ trái trên cạnh dưới
  const point6 = { x: 2*triangleWidth/3, y: triangleHeight };
  
  // Điểm 7: góc phải dưới
  const point7 = { x: triangleWidth, y: triangleHeight };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: 2*triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},0 0,${triangleHeight} ${triangleWidth},${triangleHeight}`}
        fill="#4caf50"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ mảng faceArray */}
      {/* Cấu trúc 1-3-5: Hàng 1 có 1 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 5 tam giác */}
      
      {/* Hàng 1: 1 tam giác (số 0) - đỉnh trên cùng */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[0] || '#4caf50'}
        stroke="none"
      />
      
      {/* Hàng 2: 3 tam giác (số 1, 2, 3) - từ trái sang phải */}
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#4caf50'}
        stroke="none"
      />
      
      {/* Hàng 3: 5 tam giác (số 4, 5, 6, 7, 8) - từ trái sang phải */}
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[4] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#4caf50'}
        stroke="none"
      />
      
      
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#4caf50'}
        stroke="none"
      />
      
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#4caf50'}
        stroke="none"
      />
      
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[8] || '#4caf50'}
        stroke="none"
      />
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}

// PyraminxTriangleDown component - Tam giác hướng xuống với cấu trúc 1-3-5
interface PyraminxTriangleDownProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt D
}

function PyraminxTriangleDown({ faceSize = 80, faceArray = [] }: PyraminxTriangleDownProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác (hướng xuống)
  const point1 = { x: triangleWidth/2, y: triangleHeight };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 4: góc trái trên
  const point4 = { x: 0, y: 0 };
  
  // Điểm 5: 1/3 từ trái trên cạnh trên
  const point5 = { x: triangleWidth/3, y: 0 };
  
  // Điểm 6: 2/3 từ trái trên cạnh trên
  const point6 = { x: 2*triangleWidth/3, y: 0 };
  
  // Điểm 7: góc phải trên
  const point7 = { x: triangleWidth, y: 0 };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},${triangleHeight} 0,0 ${triangleWidth},0`}
        fill="#ffeb3b"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ mảng faceArray */}
      {/* Cấu trúc 5-3-1: Hàng 1 có 5 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 1 tam giác */}
      
      {/* Hàng 1: 5 tam giác (số 8, 7, 6, 5, 4) - đáy tam giác - từ trái sang phải */}
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[4] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[8] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Hàng 2: 3 tam giác (số 3, 2, 1) - từ trái sang phải */}
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#ffeb3b'}
        stroke="none"
      />
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#ffeb3b'}
        stroke="none"
      />
      
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#ffeb3b'}
        stroke="none"
      />
     
      
      {/* Hàng 3: 1 tam giác (số 0) - đỉnh dưới cùng */}
      {/* Tam giác 0: 1-2-9 */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[0] || '#ffeb3b'}
        stroke="none"
      />
      
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}


// PyraminxTriangleLeft component - Tam giác hướng xuống màu đỏ bên trái
interface PyraminxTriangleLeftProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt L
}

function PyraminxTriangleLeft({ faceSize = 80, faceArray = [] }: PyraminxTriangleLeftProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác (hướng xuống)
  const point1 = { x: triangleWidth/2, y: triangleHeight };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 4: góc trái trên
  const point4 = { x: 0, y: 0 };
  
  // Điểm 5: 1/3 từ trái trên cạnh trên
  const point5 = { x: triangleWidth/3, y: 0 };
  
  // Điểm 6: 2/3 từ trái trên cạnh trên
  const point6 = { x: 2*triangleWidth/3, y: 0 };
  
  // Điểm 7: góc phải trên
  const point7 = { x: triangleWidth, y: 0 };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},${triangleHeight} 0,0 ${triangleWidth},0`}
        fill="#f44336"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ faceArray */}
      {/* Cấu trúc 1-3-5: Hàng 1 có 1 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 5 tam giác */}
      
      {/* Hàng 1: 5 tam giác (số 4, 5, 1, 2, 0) - đáy tam giác - từ trái sang phải */}
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[4] || '#f44336'}
        stroke="none"
      />
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 0: 1-2-9 */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[8] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Hàng 2: 3 tam giác (số 6, 7, 3) - từ trái sang phải */}
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#f44336'}
        stroke="none"
      />
      
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#f44336'}
        stroke="none"
      />
      
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#f44336'}
        stroke="none"
      />
      
      {/* Hàng 3: 1 tam giác (số 8) - đỉnh dưới cùng */}
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[0] || '#f44336'}
        stroke="none"
      />
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}

// PyraminxTriangleRight component - Tam giác hướng xuống màu xanh biển bên phải
interface PyraminxTriangleRightProps {
  faceSize?: number;
  faceArray?: string[]; // Mảng 9 phần tử cho mặt R
}

function PyraminxTriangleRight({ faceSize = 80, faceArray = [] }: PyraminxTriangleRightProps) {
  // Tính toán kích thước cho tam giác đều
  const triangleWidth = faceSize;
  const triangleHeight = faceSize * Math.sqrt(3) / 2; // √3/2 ≈ 0.866
  
  // Các điểm chia cạnh làm 3 phần bằng nhau theo cấu trúc 1-2-3-4-5-6-7-8-9-10
  // Điểm 1: đỉnh tam giác (hướng xuống)
  const point1 = { x: triangleWidth/2, y: triangleHeight };
  
  // Điểm 2: 1/3 từ đỉnh trên cạnh trái
  const point2 = { x: triangleWidth/2 - triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 3: 2/3 từ đỉnh trên cạnh trái  
  const point3 = { x: triangleWidth/2 - 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 4: góc trái trên
  const point4 = { x: 0, y: 0 };
  
  // Điểm 5: 1/3 từ trái trên cạnh trên
  const point5 = { x: triangleWidth/3, y: 0 };
  
  // Điểm 6: 2/3 từ trái trên cạnh trên
  const point6 = { x: 2*triangleWidth/3, y: 0 };
  
  // Điểm 7: góc phải trên
  const point7 = { x: triangleWidth, y: 0 };
  
  // Điểm 8: 2/3 từ đỉnh trên cạnh phải
  const point8 = { x: triangleWidth/2 + 2*triangleWidth/6, y: triangleHeight/3 };
  
  // Điểm 9: 1/3 từ đỉnh trên cạnh phải
  const point9 = { x: triangleWidth/2 + triangleWidth/6, y: 2*triangleHeight/3 };
  
  // Điểm 10: giao điểm trung tâm
  const point10 = { x: triangleWidth/2, y: triangleHeight/3 };
  
  return (
    <svg 
      width={triangleWidth} 
      height={triangleHeight} 
      viewBox={`0 0 ${triangleWidth} ${triangleHeight}`}
      style={{ display: 'block' }}
    >
      {/* Tam giác lớn */}
      <polygon
        points={`${triangleWidth/2},${triangleHeight} 0,0 ${triangleWidth},0`}
        fill="#2196f3"
        stroke="#333"
        strokeWidth="2"
      />
      
      {/* Render các tam giác con với màu sắc từ faceArray */}
      {/* Cấu trúc 1-3-5: Hàng 1 có 1 tam giác, Hàng 2 có 3 tam giác, Hàng 3 có 5 tam giác */}
      
      {/* Hàng 1: 5 tam giác (số 0, 2, 3, 7, 8) - đáy tam giác - từ trái sang phải */}
      {/* Tam giác 0: 1-2-9 */}
      <polygon
        points={`${point1.x},${point1.y} ${point2.x},${point2.y} ${point9.x},${point9.y}`}
        fill={faceArray[4] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 2: 2-9-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[5] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 3: 8-9-10 */}
      <polygon
        points={`${point8.x},${point8.y} ${point9.x},${point9.y} ${point10.x},${point10.y}`}
        fill={faceArray[6] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 7: 6-8-10 */}
      <polygon
        points={`${point6.x},${point6.y} ${point8.x},${point8.y} ${point10.x},${point10.y}`}
        fill={faceArray[7] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 8: 6-7-8 */}
      <polygon
        points={`${point6.x},${point6.y} ${point7.x},${point7.y} ${point8.x},${point8.y}`}
        fill={faceArray[8] || '#2196f3'}
        stroke="none"
      />
      
      {/* Hàng 2: 3 tam giác (số 1, 5, 6) - từ trái sang phải */}
      {/* Tam giác 1: 2-3-10 */}
      <polygon
        points={`${point2.x},${point2.y} ${point3.x},${point3.y} ${point10.x},${point10.y}`}
        fill={faceArray[1] || '#2196f3'}
        stroke="none"
      />
      
      {/* Tam giác 5: 5-6-10 */}
      <polygon
        points={`${point5.x},${point5.y} ${point6.x},${point6.y} ${point10.x},${point10.y}`}
        fill={faceArray[3] || '#2196f3'}
        stroke="none"
      />
      
      
      {/* Tam giác 6: 3-5-10 */}
      <polygon
        points={`${point3.x},${point3.y} ${point5.x},${point5.y} ${point10.x},${point10.y}`}
        fill={faceArray[2] || '#2196f3'}
        stroke="none"
      />
      
      {/* Hàng 3: 1 tam giác (số 4) - đỉnh dưới cùng */}
      {/* Tam giác 4: 3-4-5 */}
      <polygon
        points={`${point3.x},${point3.y} ${point4.x},${point4.y} ${point5.x},${point5.y}`}
        fill={faceArray[0] || '#2196f3'}
        stroke="none"
      />
    
      
      {/* Các đường kẻ phân tách - vẽ sau để hiển thị trên cùng */}
      {/* Đường ngang trên: 2-9 */}
      <line x1={point2.x} y1={point2.y} x2={point9.x} y2={point9.y} stroke="#333" strokeWidth="2" />
      
      {/* Đường ngang giữa: 3-8 */}
      <line x1={point3.x} y1={point3.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
      
      {/* Chỉ vẽ các đường kẻ cần thiết để tạo 9 tam giác con */}
      {/* 2-10: cần để tạo tam giác 2-3-10 và 2-9-10 */}
      <line x1={point2.x} y1={point2.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-10: cần để tạo tam giác 2-3-10 */}
      <line x1={point3.x} y1={point3.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 9-10: cần để tạo tam giác 2-9-10 và 8-9-10 */}
      <line x1={point9.x} y1={point9.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 8-10: cần để tạo tam giác 8-9-10 và 6-8-10 */}
      <line x1={point8.x} y1={point8.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 3-5: cần để tạo tam giác 3-4-5 và 3-5-10 */}
      <line x1={point3.x} y1={point3.y} x2={point5.x} y2={point5.y} stroke="#333" strokeWidth="2" />
      
      {/* 5-10: cần để tạo tam giác 5-6-10 và 3-5-10 */}
      <line x1={point5.x} y1={point5.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-10: cần để tạo tam giác 5-6-10 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point10.x} y2={point10.y} stroke="#333" strokeWidth="2" />
      
      {/* 6-8: cần để tạo tam giác 6-7-8 và 6-8-10 */}
      <line x1={point6.x} y1={point6.y} x2={point8.x} y2={point8.y} stroke="#333" strokeWidth="2" />
    </svg>
  );
}

// CubeNetModal component
interface CubeNetModalProps {
  scramble: string;
  open: boolean;
  onClose: () => void;
  size: number | string;
}

function CubeNetModal({ scramble, open, onClose, size }: CubeNetModalProps) {
  const [cubeState, setCubeState] = useState<CubeState>(() => applyScrambleToCubeState(scramble || '', size));
  
  useEffect(() => {
    setCubeState(applyScrambleToCubeState(scramble || '', size));
  }, [scramble, size]);
  
  const faceSize = 70;
  // layoutGrid cho 2x2 và 3x3 giống nhau về vị trí, chỉ khác số sticker mỗi mặt
  const layoutGrid: (Face | '')[][] = size === 'pyraminx' ? [
    ['L', 'F', 'R'],
    ['', 'D', ''],
  ] : [
    ['', 'U', '', ''],
    ['L', 'F', 'R', 'B'],
    ['', 'D', '', ''],
  ];

  function renderStickers(faceKey: Face) {
    if (size === 2) {
      // 2x2: 4 sticker
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 4).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    } else if (size === 4) {
      // 4x4: 16 sticker
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 16).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    } else {
      // 3x3: 9 sticker (default)
      return (
        <div className="net-face" style={{ width: faceSize, height: faceSize, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', border: '2px solid #333', background: '#fff', boxSizing: 'border-box' }}>
          {cubeState[faceKey].slice(0, 9).map((color: string, i: number) => (
            <div key={i} className="net-sticker" style={{ width: '100%', height: '100%', background: color, border: '1px solid #888', boxSizing: 'border-box' }}></div>
          ))}
        </div>
      );
    }
  }

  return open ? (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-transparent modal-backdrop" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="bg-pink-100 rounded-xl p-4 shadow-lg relative modal-content" style={{ minWidth: 320, minHeight: 320 }}>
        <button onClick={onClose} className="absolute top-2 right-2 px-2 py-1 bg-red-500 hover:bg-red-700 text-white rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95">Đóng</button>
        <div className="mb-2 text-center font-bold text-lg text-gray-700"></div>
        <div id="net-view" style={{ 
          display: size === 'pyraminx' ? 'flex' : 'grid', 
          flexDirection: size === 'pyraminx' ? 'column' : 'row',
          alignItems: size === 'pyraminx' ? 'center' : 'stretch',
          justifyContent: size === 'pyraminx' ? 'center' : 'stretch',
          gridTemplateColumns: size === 'pyraminx' ? 'none' : `repeat(4, ${faceSize}px)`, 
          gridTemplateRows: size === 'pyraminx' ? 'none' : `repeat(3, ${faceSize}px)`, 
          gap: size === 'pyraminx' ? 0 : 2, 
          background: 'none' 
        }}>
          {size === 'pyraminx' ? (
            // Pyraminx: hiển thị 4 tam giác với cấu trúc 1-3-5
            <div className="flex flex-col items-center gap-2">
              {/* Hàng trên: 2 tam giác hướng xuống + 1 tam giác hướng lên */}
              <div className="flex items-center gap-1">
                {/* Tam giác đỏ bên trái (mặt L) - dịch sang phải */}
                <div style={{ marginRight: '-35px' }}>
                  <PyraminxTriangleLeft faceSize={80} faceArray={cubeState.L || []} />
                </div>
                {/* Tam giác xanh lá giữa (mặt F) */}
                <PyraminxTriangle faceSize={80} faceArray={cubeState.F || []} />
                {/* Tam giác xanh biển bên phải (mặt R) - dịch sang trái */}
                <div style={{ marginLeft: '-35px' }}>
                  <PyraminxTriangleRight faceSize={80} faceArray={cubeState.R || []} />
                </div>
              </div>
              {/* Hàng dưới: 1 tam giác hướng xuống */}
              <div className="flex justify-center">
                {/* Tam giác vàng dưới (mặt D) */}
                <PyraminxTriangleDown faceSize={80} faceArray={cubeState.D || []} />
              </div>
            </div>
          ) : (
            // Các loại khác: grid layout bình thường
            layoutGrid.flatMap((row, rowIdx) =>
              row.map((faceKey, colIdx) => {
                if (faceKey === '') {
                  return <div key={`blank-${rowIdx}-${colIdx}`} className="net-face-empty" style={{ width: faceSize, height: faceSize, background: 'none' }}></div>;
                } else {
                  return (
                    <React.Fragment key={faceKey}>{renderStickers(faceKey as Face)}</React.Fragment>
                  );
                }
              })
            )
          )}
        </div>
        <div className="mt-3 text-gray-700 text-sm text-center font-mono">Scramble: <span className="font-bold">{scramble}</span></div>
      </div>
    </div>
  ) : null;
}

export default function TimerTab() {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [scramble, setScramble] = useState("");
  const [solves, setSolves] = useState<Solve[]>([]);
  const [session, setSession] = useState<'3x3' | '2x2' | '4x4' | 'pyraminx'>('3x3');
  const [inspection, setInspection] = useState(false);
  const [inspectionActive, setInspectionActive] = useState(false);
  const [inspectionTime, setInspectionTime] = useState(15);
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [typingInput, setTypingInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statsColumns, setStatsColumns] = useState(4); // Số cột tối ưu cho bảng Statistics
  const [isScrambleLocked, setIsScrambleLocked] = useState(false); // Khóa scramble
  const [showCopiedMessage, setShowCopiedMessage] = useState(false); // Hiển thị thông báo "Copied"
  const [newSolveId, setNewSolveId] = useState<string | null>(null); // ID của solve mới để highlight
  const [showCubeNet, setShowCubeNet] = useState(false); // Hiển thị modal lưới scramble
  
  // Refs for dropdown positioning
  const sessionBtnRef = useRef<HTMLButtonElement>(null);
  const modeBtnRef = useRef<HTMLButtonElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  
  // Load solves từ localStorage khi component mount
  useEffect(() => {
    const loadSolves = () => {
      try {
        const savedSolves = localStorage.getItem(`timer-solves-${session}`);
        if (savedSolves) {
          const parsedSolves = JSON.parse(savedSolves);
          // Chuyển đổi date string về Date object
          const solvesWithDates = parsedSolves.map((solve: any) => ({
            ...solve,
            date: new Date(solve.date)
          }));
          setSolves(solvesWithDates);
        }
      } catch (error) {
        console.error('Lỗi khi load solves từ localStorage:', error);
      }
    };
    
    loadSolves();
  }, [session]);

  // Save solves vào localStorage mỗi khi solves thay đổi
  useEffect(() => {
    const saveSolves = () => {
      try {
        localStorage.setItem(`timer-solves-${session}`, JSON.stringify(solves));
      } catch (error) {
        console.error('Lỗi khi save solves vào localStorage:', error);
      }
    };
    
    saveSolves();
  }, [solves, session]);

  // Hàm kiểm tra PB mới
  const checkAndShowPB = (newSolve: Solve) => {
    if (newSolve.penalty === 'DNF') return; // Không hiển thị cho DNF
    
    // Sử dụng solves hiện tại (không bao gồm solve mới)
    const validSolves = solves.filter(s => s.penalty !== 'DNF');
    const times = validSolves.map(s => s.penalty === '+2' ? s.time + 2000 : s.time);
    
    if (times.length === 0) {
      // Lần đầu tiên - đây là PB đầu tiên!
      setNewSolveId(newSolve.id);
      setTimeout(() => setNewSolveId(null), 1200);
      return;
    }
    
    const currentBest = Math.min(...times);
    const newTime = newSolve.penalty === '+2' ? newSolve.time + 2000 : newSolve.time;
    
    if (newTime < currentBest) {
      // PB mới!
      setNewSolveId(newSolve.id);
      setTimeout(() => setNewSolveId(null), 1200);
    }
  };

  // Hàm thêm solve mới với hiệu ứng
  const addNewSolve = (solve: Solve) => {
    // Kiểm tra PB mới TRƯỚC KHI thêm solve mới
    checkAndShowPB(solve);
    
    // Thêm solve mới vào danh sách
    setSolves(prev => [solve, ...prev]);
    setNewSolveId(solve.id);
    
    // Ẩn highlight sau 1.2 giây (nhanh hơn)
    setTimeout(() => setNewSolveId(null), 500);
  };
  
  // Đóng dropdown settings khi click ra ngoài
  // Improved: Close settings dropdown when clicking outside, but not when clicking the button or dropdown itself
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const settingsBtn = document.getElementById('settings-btn');
      const settingsDropdown = document.getElementById('settings-dropdown');
      if (
        showSettings &&
        settingsBtn &&
        settingsDropdown &&
        !settingsBtn.contains(event.target as Node) &&
        !settingsDropdown.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  // Theo dõi thay đổi fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Tính toán số cột tối ưu cho bảng Statistics
  useEffect(() => {
    const calculateOptimalColumns = () => {
      const statsContainer = document.querySelector('.stats-container');
      if (!statsContainer) return;
      
      const containerWidth = statsContainer.clientWidth;
      const padding = 32; // padding của container
      const availableWidth = containerWidth - padding;
      const minColumnWidth = 70; // Độ rộng tối thiểu cho mỗi cột
      const gap = 4; // Khoảng cách giữa các cột
      
      // Tính số cột tối ưu
      let optimalColumns = Math.floor((availableWidth + gap) / (minColumnWidth + gap));
      
      // Giới hạn từ 2 đến 4 cột
      optimalColumns = Math.max(2, Math.min(4, optimalColumns));
      
      setStatsColumns(optimalColumns);
    };

    calculateOptimalColumns();
    
    // Theo dõi thay đổi kích thước màn hình
    const resizeObserver = new ResizeObserver(calculateOptimalColumns);
    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer) {
      resizeObserver.observe(statsContainer);
    }

    window.addEventListener('resize', calculateOptimalColumns);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateOptimalColumns);
    };
  }, []);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const spaceHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inspectionRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  

  // Mobile detection & orientation (fix: always update on resize/orientationchange)
  // Đồng bộ logic phát hiện mobile, portrait, mobileLandscape với room/[roomId]/page.tsx
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  
  // Sử dụng useMemo để đảm bảo mobileShrink được tính toán đúng mỗi khi state thay đổi
  const mobileShrink = useMemo(() => isMobileLandscape, [isMobileLandscape]);
  
  // Tính toán kích thước cube dựa trên session
  const cubeSize = useMemo(() => {
    switch (session) {
      case '2x2': return 2;
      case '4x4': return 4;
      case 'pyraminx': return 'pyraminx';
      default: return 3; // 3x3
    }
  }, [session]);
  
  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      const portrait = window.innerHeight > window.innerWidth;
      // Điều chỉnh logic mobile landscape để phù hợp với điện thoại hiện đại
      const mobileLandscape = mobile && !portrait && window.innerWidth < 1200;
      

      
      setIsMobile(mobile);
      setIsPortrait(portrait);
      setIsMobileLandscape(mobileLandscape);
    }
    if (typeof window !== 'undefined') {
      checkDevice();
      window.addEventListener('resize', checkDevice);
      window.addEventListener('orientationchange', checkDevice);
      return () => {
        window.removeEventListener('resize', checkDevice);
        window.removeEventListener('orientationchange', checkDevice);
      };
    }
  }, []);
  

  
    // Generate scramble khi thay đổi session
  useEffect(() => {
    if (!isScrambleLocked) {
      generateNewScramble();
    }
  }, [session, isScrambleLocked]);
  
  const generateNewScramble = () => {
    if (!isScrambleLocked) {
      const newScramble = getScramble(session);
      setScramble(newScramble);
    }
  };

  // Hàm copy scramble vào clipboard
  const copyScrambleToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(scramble);
      // Hiển thị thông báo "Copied"
      setShowCopiedMessage(true);
      setTimeout(() => {
        setShowCopiedMessage(false);
      }, 1500);
    } catch (err) {
      console.error('Không thể copy scramble:', err);
    }
  };

  // Hàm force generate scramble mới (bỏ qua lock)
  const forceGenerateNewScramble = () => {
    const newScramble = getScramble(session);
    setScramble(newScramble);
  };

  // Inspection logic
  useEffect(() => {
    if (!inspectionActive) return;
    setInspectionTime(15);
    
    inspectionRef.current = setInterval(() => {
      setInspectionTime(t => {
        if (t <= 1) {
          clearInterval(inspectionRef.current!);
          setInspectionActive(false);
          // Khi hết 15s inspection (hiển thị), tự động DNF và kết thúc lượt giải
          const newSolve: Solve = {
            id: Date.now().toString(),
            time: 0,
            scramble,
            date: new Date(),
            penalty: 'DNF'
          };
          addNewSolve(newSolve);
          setTime(0);
          setReady(false);
          setSpaceHeld(false);
          if (!isScrambleLocked) {
            generateNewScramble();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (inspectionRef.current) clearInterval(inspectionRef.current);
    };
  }, [inspectionActive, scramble]);

  // Xử lý phím Space với logic inspection mới
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isTypingMode) return;
        
        if (inspection && !inspectionActive && !running && !ready) {
          // Bắt đầu inspection khi bấm space
          setInspectionActive(true);
          return;
        }
        
        if (inspection && inspectionActive && !running) {
          // Bắt đầu giữ phím Space trong inspection
          setSpaceHeld(true);
          spaceHoldTimerRef.current = setTimeout(() => {
            // Sau 300ms, chỉ chuẩn bị (không chạy timer)
            setReady(true);
          }, 300);
          return;
        }
        
        if (!inspection && !spaceHeld && !running && !ready) {
          // Logic bình thường cho non-inspection mode
          setSpaceHeld(true);
          spaceHoldTimerRef.current = setTimeout(() => {
            setReady(true);
          }, 300);
        }
        
        if (running) {
          // Dừng timer và lưu solve
          setRunning(false);
          
          // Lấy thời gian chính xác từ performance.now()
          const finalTime = Math.round(performance.now() - startTimeRef.current);
          
          // Cập nhật timer hiển thị để đảm bảo đồng bộ
          setTime(finalTime);
          
          let penalty: 'OK' | '+2' | 'DNF' = 'OK';
          if (inspection) {
            // Logic đơn giản: hết 15s là DNF
            if (inspectionTime <= 0) penalty = 'DNF';
          }
          const newSolve: Solve = {
            id: Date.now().toString(),
            time: finalTime,
            scramble,
            date: new Date(),
            penalty
          };
          addNewSolve(newSolve);
          // Không reset timer về 0
          setReady(false);
          setSpaceHeld(false);
          setInspectionActive(false);
          if (!isScrambleLocked) {
            generateNewScramble();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        
        if (inspection && inspectionActive && !running) {
          // Khi thả phím Space trong inspection
          setSpaceHeld(false);
          if (spaceHoldTimerRef.current) {
            clearTimeout(spaceHoldTimerRef.current);
            spaceHoldTimerRef.current = null;
          }
          
          // Nếu đã chuẩn bị (ready = true), bắt đầu timer
          if (ready) {
            if (inspectionRef.current) clearInterval(inspectionRef.current);
            setInspectionActive(false);
            setInspectionTime(15);
            setTime(0);
            setRunning(true);
            setReady(false);
          }
          return;
        }
        
        if (!inspection && ready && !running) {
          // Logic bình thường cho non-inspection mode
          setTime(0);
          setRunning(true);
          setReady(false);
          setSpaceHeld(false);
        } else if (!inspection) {
          setSpaceHeld(false);
          if (spaceHoldTimerRef.current) {
            clearTimeout(spaceHoldTimerRef.current);
            spaceHoldTimerRef.current = null;
          }
          setReady(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spaceHeld, running, ready, time, scramble, inspection, inspectionActive, inspectionTime, isTypingMode, isScrambleLocked]);

  // Xử lý cảm ứng trên vùng timer
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (inspection && !inspectionActive && !running && !ready) {
      // Bắt đầu inspection khi chạm vào timer
      setInspectionActive(true);
      return;
    }
    
    if (inspection && inspectionActive && !running) {
      // Bắt đầu giữ chạm trong inspection
      setSpaceHeld(true);
      spaceHoldTimerRef.current = setTimeout(() => {
        // Sau 300ms, chỉ chuẩn bị (không chạy timer)
        setReady(true);
      }, 300);
      return;
    }
    
    if (!inspection && !spaceHeld && !running && !ready) {
      // Logic bình thường cho non-inspection mode
      setSpaceHeld(true);
      spaceHoldTimerRef.current = setTimeout(() => {
        setReady(true);
      }, 300);
    }
    
            if (running) {
          // Dừng timer và lưu solve
          setRunning(false);
          
          // Lấy thời gian chính xác từ performance.now()
          const finalTime = Math.round(performance.now() - startTimeRef.current);
          
          // Cập nhật timer hiển thị để đảm bảo đồng bộ
          setTime(finalTime);
          
          let penalty: 'OK' | '+2' | 'DNF' = 'OK';
          if (inspection) {
            // Logic đơn giản: hết 15s là DNF
            if (inspectionTime <= 0) penalty = 'DNF';
          }
          const newSolve: Solve = {
            id: Date.now().toString(),
            time: finalTime,
            scramble,
            date: new Date(),
            penalty
          };
      addNewSolve(newSolve);
      // Không reset timer về 0
      setReady(false);
      setSpaceHeld(false);
      setInspectionActive(false);
      if (!isScrambleLocked) {
        generateNewScramble();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (inspection && inspectionActive && !running) {
      // Khi thả chạm trong inspection
      setSpaceHeld(false);
      if (spaceHoldTimerRef.current) {
        clearTimeout(spaceHoldTimerRef.current);
        spaceHoldTimerRef.current = null;
      }
      
                // Nếu đã chuẩn bị (ready = true), bắt đầu timer
          if (ready) {
            if (inspectionRef.current) clearInterval(inspectionRef.current);
            setInspectionActive(false);
            setInspectionTime(15);
            setTime(0);
            setRunning(true);
            setReady(false);
          }
      return;
    }
    
    if (!inspection && ready && !running) {
      // Logic bình thường cho non-inspection mode
      setTime(0);
      setRunning(true);
      setReady(false);
      setSpaceHeld(false);
    } else if (!inspection) {
      setSpaceHeld(false);
      if (spaceHoldTimerRef.current) {
        clearTimeout(spaceHoldTimerRef.current);
        spaceHoldTimerRef.current = null;
      }
      setReady(false);
    }
  };

  // Tăng thời gian khi running
  useEffect(() => {
    let animationId: number;
    let timeoutId: NodeJS.Timeout;
    
    if (running) {
      startTimeRef.current = performance.now(); // Lưu thời gian bắt đầu chính xác
      
      // Sử dụng hybrid approach: requestAnimationFrame cho UI + setTimeout cho độ chính xác
      const updateTimer = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const newTime = Math.round(elapsed); // Làm tròn để có số nguyên
        setTime(newTime);
        
        animationId = requestAnimationFrame(updateTimer);
      };
      
      const preciseUpdate = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const newTime = Math.round(elapsed);
        setTime(newTime);
        
        timeoutId = setTimeout(preciseUpdate, 10); // Cập nhật mỗi 10ms
      };
      
      // Bắt đầu cả hai
      animationId = requestAnimationFrame(updateTimer);
      timeoutId = setTimeout(preciseUpdate, 10);
    }
    
    return () => {
      // Dừng animation loop khi component unmount hoặc running thay đổi
      if (typeof animationId !== 'undefined') {
        cancelAnimationFrame(animationId);
      }
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
    };
  }, [running]);

  const handleReset = () => {
    setTime(0);
    setRunning(false);
    setSpaceHeld(false);
    setReady(false);
    setSolves([]);
    // Xóa dữ liệu khỏi localStorage
    try {
      localStorage.removeItem(`timer-solves-${session}`);
    } catch (error) {
      console.error('Lỗi khi xóa solves từ localStorage:', error);
    }
    if (spaceHoldTimerRef.current) {
      clearTimeout(spaceHoldTimerRef.current);
      spaceHoldTimerRef.current = null;
    }
  };

  // Xử lý typing mode
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typingInput.trim() === "") {
      // DNF
      const newSolve: Solve = {
        id: Date.now().toString(),
        time: 0,
        scramble,
        date: new Date(),
        penalty: 'DNF'
      };
      setSolves(prev => [newSolve, ...prev]);
      setTypingInput("");
      if (!isScrambleLocked) {
        generateNewScramble();
      }
      return;
    }

    const input = typingInput.trim();
    // Chuyển đổi từ format "23867" thành milliseconds (phút:giây.centiseconds)
    // VD: 23867 = 2:38.67, 1387 = 1:38.7, 67 = 0:00.67
    if (input.length < 1) {
      alert("Vui lòng nhập thời gian hợp lệ");
      return;
    }
    
    // Tách phần phút, giây và centiseconds
    let minutes = "0";
    let seconds = "0";
    let centiseconds = "00";
    
    if (input.length === 1) {
      // Chỉ có 1 số: 4 -> 0:00.04
      centiseconds = input + "0";
    } else if (input.length === 2) {
      // Có 2 số: 67 -> 0:00.67
      centiseconds = input;
    } else if (input.length === 3) {
      // Có 3 số: 387 -> 0:03.87
      seconds = input.slice(0, -2);
      centiseconds = input.slice(-2);
    } else if (input.length === 4) {
      // Có 4 số: 4693 -> 46.93 (giây.centiseconds)
      seconds = input.slice(0, -2);
      centiseconds = input.slice(-2);
    } else {
      // Có 5+ số: 23867 -> 2:38.67
      minutes = input.slice(0, -4);
      seconds = input.slice(-4, -2);
      centiseconds = input.slice(-2);
    }
    
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100;
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      alert("Vui lòng nhập thời gian hợp lệ (VD: 23867 = 2:38.67)");
      return;
    }

    const timeMs = Math.round(totalSeconds * 1000);
    const newSolve: Solve = {
      id: Date.now().toString(),
      time: timeMs,
      scramble,
      date: new Date(),
      penalty: 'OK'
    };
    setSolves(prev => [newSolve, ...prev]);
    setTypingInput("");
    if (!isScrambleLocked) {
      generateNewScramble();
    }
  };

  const handleTypingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setTypingInput(value);
  };

  const deleteSolve = (id: string) => {
    setSolves(prev => prev.filter(solve => solve.id !== id));
  };

  // Format time mm:ss:cs
  const format = (ms: number) => {
    const cs = Math.floor((ms % 1000) / 10)
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor(ms / 60000);
    
    if (m > 0) {
      // Có phút: hiển thị m:ss.cs
      return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
    } else if (s > 0) {
      // Có giây: hiển thị s.cs (không có số 0 thừa)
      return `${s}.${cs.toString().padStart(2, "0")}`;
    } else {
      // Chỉ có centiseconds: hiển thị 0.cs
      return `0.${cs.toString().padStart(2, "0")}`;
    }
  };

  const getStats = () => {
    if (solves.length === 0) return null;
    
    const validSolves = solves.filter(s => s.penalty !== 'DNF');
    const times = validSolves.map(s => s.penalty === '+2' ? s.time + 2000 : s.time);
    
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    
    // Ao5 calculation
    let ao5 = null;
    if (times.length >= 5) {
      const recent5 = times.slice(0, 5);
      const sorted5 = [...recent5].sort((a, b) => a - b);
      ao5 = (sorted5[1] + sorted5[2] + sorted5[3]) / 3;
    }

    // Ao12 calculation
    let ao12 = null;
    if (times.length >= 12) {
      const recent12 = times.slice(0, 12);
      const sorted12 = [...recent12].sort((a, b) => a - b);
      ao12 = (sorted12[1] + sorted12[2] + sorted12[3] + sorted12[4] + sorted12[5] + sorted12[6] + sorted12[7] + sorted12[8] + sorted12[9] + sorted12[10]) / 10;
    }
    
    return { best, worst, mean, ao5, ao12, count: solves.length };
  };

  const stats = getStats();

  // Xử lý portrait mode - giống như trong room/[roomId]/page.tsx
  if (isPortrait) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="text-2xl font-bold text-red-400 mb-4 text-center">VUI LÒNG XOAY NGANG MÀN HÌNH ĐỂ SỬ DỤNG ỨNG DỤNG!</div>
        <div className="text-lg text-red-300 mb-2 text-center">Nhớ tắt chế độ khóa xoay màn hình ở bảng điều khiển của thiết bị.</div>
      </div>
    );
  }

  return (
    <>
      <style>{digitalFontStyle}</style>
      

      
      <div className="w-full h-full bg-transparent">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-1 sm:p-2 bg-gray-800/80 backdrop-blur-sm rounded-lg mb-2 sm:mb-2">
                      <div className="flex items-center gap-1 sm:gap-4">
              <div className="relative">
                <button
                  ref={sessionBtnRef}
                  onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                  className="flex items-center bg-gray-700 hover:bg-gray-600 rounded-lg px-1 py-1 text-white text-xs shadow min-w-0 max-w-[90px] transition-colors"
                >
                  <svg className="w-3 h-3 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="px-1 py-1">{session}</span>
                  <svg className={`w-2 h-2 ml-1 text-gray-300 transition-transform ${showSessionDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <DropdownPortal
                  isOpen={showSessionDropdown}
                  triggerRef={sessionBtnRef}
                  placement="bottom-left"
                  className="w-32 bg-gray-800 border border-gray-600 rounded-lg shadow-xl"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSession('3x3');
                        setShowSessionDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        session === '3x3' 
                          ? 'bg-white text-gray-800' 
                          : 'text-white hover:bg-gray-700'
                      }`}
                    >
                      3x3
                    </button>
                    <button
                      onClick={() => {
                        setSession('2x2');
                        setShowSessionDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        session === '2x2' 
                          ? 'bg-white text-gray-800' 
                          : 'text-white hover:bg-gray-700'
                        }`}
                    >
                      2x2
                    </button>
                    <button
                      onClick={() => {
                        setSession('4x4');
                        setShowSessionDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        session === '4x4' 
                          ? 'bg-white text-gray-800' 
                          : 'text-white hover:bg-gray-700'
                      }`}
                    >
                      4x4
                    </button>
                    <button
                      onClick={() => {
                        setSession('pyraminx');
                        setShowSessionDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        session === 'pyraminx' 
                          ? 'bg-white text-gray-800' 
                          : 'text-white hover:bg-gray-700'
                      }`}
                    >
                      Pyraminx
                    </button>
                  </div>
                </DropdownPortal>
              </div>
            </div>
          <div className="flex items-center gap-1 sm:gap-4">
            {/* Scramble Grid Button */}
            <button
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-full font-bold shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
              style={{ fontSize: 20, width: 40, height: 40, lineHeight: '40px' }}
              type="button"
              aria-label="Lưới scramble"
              title="Lưới scramble"
              onClick={() => setShowCubeNet(true)}
            >
              <span role="img" aria-label="cross" style={{ display: 'inline-block', transform: 'rotate(-90deg)' }}>✟</span>
            </button>
            
            <div className="relative">
              <button
                ref={modeBtnRef}
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="flex items-center bg-gray-700 hover:bg-gray-600 rounded-lg px-1 py-1 text-white text-xs shadow min-w-0 max-w-[90px] transition-colors"
              >
                <span className="px-1 py-1">{isTypingMode ? "Typing" : "Timer"}</span>
                <svg className={`w-2 h-2 ml-1 text-gray-300 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <DropdownPortal
                isOpen={showModeDropdown}
                triggerRef={modeBtnRef}
                placement="bottom-right"
                className="w-32 bg-gray-800 border border-gray-600 rounded-lg shadow-xl"
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsTypingMode(false);
                      setShowModeDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      !isTypingMode 
                        ? 'bg-white text-gray-800' 
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    Timer
                  </button>
                  <button
                    onClick={() => {
                      setIsTypingMode(true);
                      setShowModeDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      isTypingMode 
                        ? 'bg-white text-gray-800' 
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    Typing
                  </button>
                </div>
              </DropdownPortal>
            </div>
            {/* Nút Setting Dropdown */}
            <div className="relative settings-container">
              <button
                ref={settingsBtnRef}
                onClick={() => setShowSettings(!showSettings)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-1 py-1 rounded-lg transition-colors flex items-center gap-1 min-w-0 max-w-[90px]"
                title="Settings"
              >
                <span className="text-base">⚙️</span>
                <svg className={`w-2 h-2 ml-1 text-gray-300 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <DropdownPortal
                isOpen={showSettings}
                triggerRef={settingsBtnRef}
                placement="bottom-right"
                className="w-40 bg-gray-800 border border-gray-600 rounded-lg shadow-xl"
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      const el = document.documentElement;
                      if (!document.fullscreenElement) {
                        if (el.requestFullscreen) el.requestFullscreen();
                        else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
                        else if ((el as any).msRequestFullscreen) (el as any).msRequestFullscreen();
                        setIsFullscreen(true);
                      } else {
                        if (document.exitFullscreen) document.exitFullscreen();
                        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
                        else if ((document as any).msExitFullscreen) (document as any).msExitFullscreen();
                        setIsFullscreen(false);
                      }
                      setShowSettings(false);
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                      isFullscreen 
                        ? 'bg-white text-gray-800' 
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Full Screen
                  </button>
                  
                  <button
                    onClick={() => {
                      setInspection(i => !i);
                      setShowSettings(false);
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                      inspection 
                        ? 'bg-white text-gray-800' 
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Inspection
                  </button>
                </div>
              </DropdownPortal>
            </div>
          </div>
        </div>

        {/* Main Content - 3 Columns */}
        <div className="grid grid-cols-12 gap-1 sm:gap-6 h-[calc(100vh-120px)]">
          {/* Left Column - Solves List */}
          <div className="col-span-3 bg-neutral-900/30 rounded-lg p-1 sm:p-4 border border-neutral-700 shadow-xl">
            <div className="flex items-center justify-between mb-1 sm:mb-4">
              <h3 className="text-xs sm:text-lg font-semibold text-white">Solves</h3>
              <button
                onClick={handleReset}
                className={`${mobileShrink ? 'px-1 py-0.5 text-[10px]' : 'px-1 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm'} bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-all hover:scale-105 active:scale-95`}
                title="Reset All Solves"
              >
                {mobileShrink ? 'Reset' : 'Reset All'}
              </button>
            </div>
            <div className="space-y-1 h-[200px] sm:h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              {solves.map((solve, index) => (
                <div
                  key={solve.id}
                  className={`flex items-center justify-between bg-neutral-800/30 rounded-lg p-1 border border-neutral-600/50 transition-all duration-300 ${
                    newSolveId === solve.id ? 'new-solve-highlight' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs w-3 sm:w-6">{solves.length - index}.</span>
                    <span className={`font-mono text-xs ${solve.penalty === 'DNF' ? 'text-red-400' : 'text-green-400'} ${
                      newSolveId === solve.id ? 'pb-celebration' : ''
                    }`}>
                      {format(solve.time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {solve.penalty === '+2' && (
                      <span className="text-yellow-400 text-xs">+2</span>
                    )}
                    {solve.penalty === 'DNF' && (
                      <span className="text-red-400 text-xs">DNF</span>
                    )}
                    <button
                      onClick={() => deleteSolve(solve.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {solves.length === 0 && (
                <div className="text-center text-gray-400 py-2 sm:py-8 text-xs sm:text-base">
                  No solves yet
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Timer & Scramble */}
          <div className="col-span-6 bg-neutral-900/30 rounded-lg p-1 border border-neutral-700 shadow-xl">
            <div className="flex flex-col items-center justify-start pt-0">
              {/* Scramble */}
              <div className="text-center mb-1 w-full">
                <div className={`${mobileShrink ? "text-[12px]" : "text-[20px]"} font-mono mb-1 bg-neutral-800/30 rounded-lg p-2 border border-neutral-600/50`}>
                  {scramble}
                </div>
                <div className="flex justify-center gap-1 relative">
                  <button 
                    onClick={() => setIsScrambleLocked(!isScrambleLocked)}
                    className={`p-1 transition-colors ${isScrambleLocked ? 'text-red-400' : 'text-gray-400 hover:text-white'} ${mobileShrink ? 'p-2' : 'p-1'}`}
                    title={isScrambleLocked ? "Scramble bị khóa" : "Khóa scramble"}
                  >
                    <svg className={`${mobileShrink ? "w-5 h-5" : "w-5 h-5"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isScrambleLocked ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      )}
                    </svg>
                  </button>
                  <button 
                    onClick={copyScrambleToClipboard}
                    className={`p-1 text-gray-400 hover:text-white transition-colors ${mobileShrink ? 'p-2' : 'p-1'}`}
                    title="Copy scramble"
                  >
                    <svg className={`${mobileShrink ? "w-5 h-5" : "w-5 h-5"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button 
                    onClick={forceGenerateNewScramble}
                    className={`p-1 text-gray-400 hover:text-white transition-colors ${mobileShrink ? 'p-2' : 'p-1'}`}
                    title="Tạo scramble mới"
                  >
                    <svg className={`${mobileShrink ? "w-5 h-5" : "w-5 h-5"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  
                  {/* Thông báo "Copied" */}
                  {showCopiedMessage && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-500 text-white text-xs px-2 py-1 rounded shadow-lg animate-fade-in">
                      Copied!
                    </div>
                  )}
                </div>
              </div>

              {/* Timer hoặc Typing Input - Chỉ vùng này mới có touch events */}
              <div
                className="w-full"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                {inspection && inspectionActive ? (
                          <div className="text-center mb-1">
            <div
              className={`${mobileShrink ? "text-[100px]" : "text-[160px]"} select-none ${
                ready ? 'text-green-400' : 'text-white'
              }`}
              style={{ fontFamily: 'Digital7Mono, monospace', letterSpacing: '0.05em' }}
            >
              {inspectionTime}
            </div>
                       <div className={`${mobileShrink ? "text-[12px]" : "text-[14px]"} text-gray-400 mb-1 bg-neutral-800/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-neutral-600/50 inline-block`}>
               {ready ? 'Thả để bắt đầu' : 'Giữ để chuẩn bị'}
             </div>
          </div>
                ) : isTypingMode ? (
                  /* Chế độ typing: hiện trường nhập thời gian */
                  <div className="text-center mb-1">
                    <form onSubmit={handleTypingSubmit} className="flex flex-col items-center gap-1">
                      <input
                        type="text"
                        value={typingInput}
                        onChange={handleTypingInputChange}
                        placeholder=" "
                        className={`${mobileShrink ? "px-2 py-1 text-sm" : "px-4 py-3 text-2xl"} bg-neutral-800/50 text-white border-2 border-blue-500 rounded-lg focus:outline-none focus:border-blue-400 text-center font-mono`}
                        style={{ 
                          width: mobileShrink ? '160px' : '280px',
                          fontSize: mobileShrink ? '14px' : '24px'
                        }}
                        maxLength={5}
                        autoFocus
                      />
                    </form>
                    <div className={`${mobileShrink ? "text-[10px]" : "text-sm"} text-gray-400 mt-1 text-center`}>
                      Để trống = DNF, Enter để gửi.
                    </div>
                  </div>
                ) : (
                  /* Chế độ timer: hiện timer bình thường */
                  <div className="text-center mb-1">
                    <div
                      className={`${mobileShrink ? "text-[100px]" : "text-[160px]"} select-none transition-colors ${
                        ready && !running ? 'text-green-400' :
                        running ? 'text-green-400' :
                        spaceHeld && !running ? 'text-yellow-400' :
                        'text-white'
                      }`}
                      style={{ fontFamily: 'Digital7Mono, monospace', letterSpacing: '0.05em' }}
                    >
                      {format(time)}
                    </div>
                    {/* Status Text */}
                    <div className={`${mobileShrink ? "text-[12px]" : "text-[14px]"} text-gray-400 mb-1 bg-neutral-800/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-neutral-600/50 inline-block`}>
                      {ready && !running ? 'Sẵn sàng! Thả để bắt đầu' :
                        running ? 'Đang giải... Nhấn để dừng' :
                        spaceHeld && !running ? 'Giữ để chuẩn bị...' :
                        'Giữ ≥300ms rồi thả để bắt đầu'}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 justify-center">
                      {/* Đã xóa nút Inspection và Reset All */}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Statistics Grid */}
          <div className="col-span-3 bg-neutral-900/30 rounded-lg p-1 sm:p-4 border border-neutral-700 shadow-xl stats-container" style={{ overflow: 'hidden' }}>
            <h3 className="text-xs sm:text-lg font-semibold text-white mb-1 sm:mb-4">Statistics</h3>
            <div className={`${mobileShrink ? "grid gap-1" : "flex flex-col gap-1 sm:gap-3"} h-[200px] sm:h-[calc(100vh-200px)]`}
                 style={mobileShrink ? {
                   gridTemplateColumns: 'repeat(3, 1fr)',
                   gridTemplateRows: 'repeat(3, 1fr)',
                   width: '100%',
                   overflow: 'visible'
                 } : {}}>
              
              {/* Mobile: Grid 3x3 với 7 ô thống kê */}
              {mobileShrink ? (
                <>
                  <div className={`bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 min-w-0 w-full aspect-square`}
                       style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="text-gray-400 mb-0 text-[8px]">pb</div>
                    <div className="font-bold text-green-400 text-[10px]">
                      {stats ? format(stats.best) : '-'}
                    </div>
                  </div>
                  
                  <div className={`bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 min-w-0 w-full aspect-square`}
                       style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="text-gray-400 mb-0 text-[8px]">worst</div>
                    <div className="font-bold text-red-400 text-[10px]">
                      {stats ? format(stats.worst) : '-'}
                    </div>
                  </div>
                  
                  <div className={`bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 min-w-0 w-full aspect-square`}
                       style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="text-gray-400 mb-0 text-[8px]">avg</div>
                    <div className="font-bold text-blue-400 text-[10px]">
                      {stats ? format(Math.round(stats.mean)) : '-'}
                    </div>
                  </div>
                  
                  <div className={`bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 min-w-0 w-full aspect-square`}>
                    <div className="text-gray-400 mb-0 text-[8px]">ao5</div>
                    <div className="font-bold text-yellow-400 text-[10px]">
                      {stats?.ao5 ? format(Math.round(stats.ao5)) : '-'}
                    </div>
                  </div>
                  
                  <div className={`bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 min-w-0 w-full aspect-square`}
                       style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="text-gray-400 mb-0 text-[8px]">ao12</div>
                    <div className="font-bold text-purple-400 text-[10px]">
                      {stats?.ao12 ? format(Math.round(stats.ao12)) : '-'}
                    </div>
                  </div>
                  
                  <div className={`bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 min-w-0 w-full aspect-square`}
                       style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="text-gray-400 mb-0 text-[8px]">ao5pb</div>
                    <div className="font-bold text-pink-400 text-[10px]">
                      {stats?.ao5 ? format(Math.round(stats.ao5)) : '-'}
                    </div>
                  </div>
                  
                  <div className={`bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 min-w-0 w-full aspect-square`}
                       style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="text-gray-400 mb-0 text-[8px]">ao12pb</div>
                    <div className="font-bold text-indigo-400 text-[10px]">
                      {stats?.ao12 ? format(Math.round(stats.ao12)) : '-'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Desktop: Hàng 1 - 4 ô */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-2">
                    <div className="bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 sm:p-2 w-8 h-8 sm:w-20 sm:h-20">
                      <div className="text-gray-400 mb-0 sm:mb-1 text-[7px] sm:text-xs">pb</div>
                      <div className="font-bold text-green-400 text-[7px] sm:text-sm">
                        {stats ? format(stats.best) : '-'}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 sm:p-2 w-8 h-8 sm:w-20 sm:h-20">
                      <div className="text-gray-400 mb-0 sm:mb-1 text-[7px] sm:text-xs">worst</div>
                      <div className="font-bold text-red-400 text-[7px] sm:text-sm">
                        {stats ? format(stats.worst) : '-'}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 sm:p-2 w-8 h-8 sm:w-20 sm:h-20">
                      <div className="text-gray-400 mb-0 sm:mb-1 text-[7px] sm:text-xs">avg</div>
                      <div className="font-bold text-blue-400 text-[7px] sm:text-sm">
                        {stats ? format(Math.round(stats.mean)) : '-'}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 sm:p-2 w-8 h-8 sm:w-20 sm:h-20">
                      <div className="text-gray-400 mb-0 sm:mb-1 text-[7px] sm:text-xs">ao5</div>
                      <div className="font-bold text-yellow-400 text-[7px] sm:text-sm">
                        {stats?.ao5 ? format(Math.round(stats.ao5)) : '-'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Desktop: Hàng 2 - 3 ô */}
                  <div className="grid grid-cols-4 gap-1 sm:gap-2">
                    <div className="bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 sm:p-2 w-8 h-8 sm:w-20 sm:h-20">
                      <div className="text-gray-400 mb-0 sm:mb-1 text-[7px] sm:text-xs">ao12</div>
                      <div className="font-bold text-purple-400 text-[7px] sm:text-sm">
                        {stats?.ao12 ? format(Math.round(stats.ao12)) : '-'}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 sm:p-2 w-8 h-8 sm:w-20 sm:h-20">
                      <div className="text-gray-400 mb-0 sm:mb-1 text-[7px] sm:text-xs">ao5pb</div>
                      <div className="font-bold text-pink-400 text-[7px] sm:text-sm">
                        {stats?.ao5 ? format(Math.round(stats.ao5)) : '-'}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-800/30 rounded-lg border border-neutral-600/50 flex flex-col items-start justify-center p-1 sm:p-2 w-8 h-8 sm:w-20 sm:h-20">
                      <div className="text-gray-400 mb-0 sm:mb-1 text-[7px] sm:text-xs">ao12pb</div>
                      <div className="font-bold text-indigo-400 text-[7px] sm:text-sm">
                        {stats?.ao12 ? format(Math.round(stats.ao12)) : '-'}
                      </div>
                    </div>
                    
                    <div className="bg-transparent border-transparent"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* CubeNetModal */}
      <CubeNetModal 
        key={`${scramble}-${String(cubeSize)}`} 
        scramble={scramble} 
        open={showCubeNet} 
        onClose={() => setShowCubeNet(false)} 
        size={cubeSize} 
      />
    </>
  );
}
