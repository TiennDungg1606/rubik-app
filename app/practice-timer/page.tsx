"use client";
import React, { useState, useRef, useEffect, Suspense } from "react";
// Thêm font Digital-7 Mono cho timer
import '../../globals.css';
// Thêm style cho font Digital-7 Mono
const digitalFontStyle = `
@font-face {
	font-family: 'Digital7Mono';
	src: url('/digital-7-mono.ttf') format('truetype');
	font-weight: normal;
	font-style: normal;
}

/* Responsive styles */
@media (max-width: 768px) {
	.stats-grid {
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}
	
	.stats-box {
		padding: 0.5rem;
	}
	
	.stats-label {
		font-size: 0.75rem;
	}
	
	.stats-value {
		font-size: 0.875rem;
	}
	
	.sidebar {
		width: 100%;
		max-width: none;
	}
	
	.main-content {
		flex-direction: column;
	}
	
	.timer-container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
}
`;
import { useSearchParams, useRouter } from "next/navigation";

function PracticeTimerContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const alg = searchParams?.get("alg") || "";
	const name = searchParams?.get("name") || "";
	const [time, setTime] = useState(0);
	const [running, setRunning] = useState(false);
	const [ready, setReady] = useState(false); // trạng thái sẵn sàng sau khi giữ space >=100ms
	const [spaceHeld, setSpaceHeld] = useState(false); // đang giữ space
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const [times, setTimes] = useState<number[]>([]);
	const spaceHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
	
	// Mobile detection
	const [isMobile, setIsMobile] = useState(false);
	
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 1000);
		};
		
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

		// Xử lý phím Space giống csTimer và cảm ứng trên điện thoại
		useEffect(() => {
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.code === 'Space') {
					e.preventDefault();
					if (!spaceHeld && !running && !ready) {
						setSpaceHeld(true);
						// Sau 100ms thì chuyển sang trạng thái ready
						spaceHoldTimerRef.current = setTimeout(() => {
							setReady(true);
						}, 100);
					}
					// Nếu đang chạy, nhấn Space để dừng
					if (running) {
						setRunning(false);
						setTimes(prev => [time, ...prev.slice(0, 19)]);
					}
				}
			};

			const handleKeyUp = (e: KeyboardEvent) => {
				if (e.code === 'Space') {
					e.preventDefault();
					// Nếu đang ở trạng thái ready (đã giữ >=100ms), thả ra thì bắt đầu timer
					if (ready && !running) {
						setTime(0);
						setRunning(true);
						setReady(false);
						setSpaceHeld(false);
					} else {
						// Nếu thả ra trước 100ms thì hủy ready
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
			// eslint-disable-next-line
		}, [spaceHeld, running, ready, time]);

		// Xử lý cảm ứng trên vùng timer
		const handleTouchStart = (e: React.TouchEvent) => {
			e.preventDefault();
			if (!spaceHeld && !running && !ready) {
				setSpaceHeld(true);
				spaceHoldTimerRef.current = setTimeout(() => {
					setReady(true);
				}, 100);
			}
			if (running) {
				setRunning(false);
				setTimes(prev => [time, ...prev.slice(0, 19)]);
			}
		};

		const handleTouchEnd = (e: React.TouchEvent) => {
			e.preventDefault();
			if (ready && !running) {
				setTime(0);
				setRunning(true);
				setReady(false);
				setSpaceHeld(false);
			} else {
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
		if (running) {
			intervalRef.current = setInterval(() => {
				setTime((t) => t + 10);
			}, 10);
		} else if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [running]);

	const handleReset = () => {
		setTime(0);
		setRunning(false);
		setSpaceHeld(false);
		setReady(false);
		setTimes([]); // Xóa tất cả thời gian
		if (spaceHoldTimerRef.current) {
			clearTimeout(spaceHoldTimerRef.current);
			spaceHoldTimerRef.current = null;
		}
	};

	// Format time mm:ss:cs
	const format = (ms: number) => {
		const cs = Math.floor((ms % 1000) / 10)
		const s = Math.floor((ms / 1000) % 60);
		const m = Math.floor(ms / 60000);
		return `${m > 0 ? m + ":" : ""}${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
	};

	// Nếu không có thông tin OLL, hiển thị thông báo
	if (!alg || !name) {
		return (
			<div className="min-h-screen bg-[#131522] flex flex-col items-center justify-center text-white">
				<div className="text-center">
					<div className="text-2xl font-bold mb-4 text-red-400">Không tìm thấy thông tin OLL</div>
					<button 
						onClick={() => router.push('/lobby?tab=practice')} 
						className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-lg font-bold transition-colors"
					>
						Quay lại Practice
					</button>
				</div>
			</div>
		);
	}

	return (
		<>
			<style>{digitalFontStyle}</style>
			<div className="min-h-screen bg-[#131522] text-white">
			{/* Header với nút Back */}
			<div className="absolute top-6 left-6 z-10">
				<button 
					onClick={() => router.push('/lobby?tab=practice')} 
					className="text-gray-400 hover:text-white text-2xl font-bold hover:scale-105 transition-transform"
				>
					← Back
				</button>
			</div>

			{/* Main Content */}
			<div className={`flex h-screen ${isMobile ? 'main-content' : ''}`}>
				{/* Left Content - Scramble và Timer */}
				<div className={`flex-1 flex flex-col items-center justify-center ${isMobile ? 'timer-container' : ''}`}>
					{/* Scramble Sequence */}
					<div className={`${isMobile ? 'mb-4' : 'mb-8'} text-center`}>
						<div className={`${isMobile ? 'text-sm' : 'text-lg'} font-mono mb-2 text-gray-300`}>{alg}</div>
						<div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold mb-4 text-white`}>OLL {name}</div>
					</div>

					{/* Timer - Mở rộng vùng cảm ứng */}
					<div 
						className={`text-center ${isMobile ? 'w-full h-full flex flex-col justify-center items-center' : ''}`}
						onTouchStart={handleTouchStart}
						onTouchEnd={handleTouchEnd}
						onTouchCancel={handleTouchEnd}
					>
						<div
							className={`${isMobile ? 'text-[80px]' : 'text-[120px]'} mb-8 select-none transition-colors ${
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
						<div className={`${isMobile ? 'text-sm' : 'text-lg'} text-gray-400 mb-4`}>
							{ready && !running ? 'Sẵn sàng! Thả Space/chạm để bắt đầu' :
								running ? 'Đang giải... Nhấn Space/chạm để dừng' :
								spaceHeld && !running ? 'Giữ Space/giữ chạm để chuẩn bị...' :
								'Giữ ≥100ms rồi thả ra để bắt đầu timer'}
						</div>
					</div>
				</div>

				{/* Right Sidebar - Statistics */}
				<div className={`${isMobile ? 'sidebar' : 'w-80'} bg-gray-900 p-6 overflow-y-auto`}>
					<h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 text-white`}>Thống kê</h3>
					{/* Recent Times */}
					<div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
						<h4 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-3 text-gray-300`}>Thời gian gần đây</h4>
						<div className="space-y-2">
							{times.map((t, index) => (
								<div key={index} className="flex justify-between items-center text-sm">
									<span className="text-gray-400">{times.length - index}.</span>
									<span className="text-green-400 font-mono">{format(t)}</span>
									<button 
										onClick={() => setTimes(prev => prev.filter((_, i) => i !== index))}
										className="text-red-400 hover:text-red-300 text-xs"
									>
										×
									</button>
								</div>
							))}
							{times.length === 0 && (
								<div className="text-gray-500 text-sm">Chưa có thời gian nào</div>
							)}
						</div>
					</div>

					{/* Statistics Grid */}
					<div className={`grid grid-cols-2 gap-4 stats-grid`}>
						<div className="bg-gray-800 p-3 rounded stats-box">
							<div className={`text-gray-400 stats-label`}>pb</div>
							<div className={`font-bold text-green-400 stats-value`}>
								{times.length > 0 ? format(Math.min(...times)) : '-'}
							</div>
						</div>
						<div className="bg-gray-800 p-3 rounded stats-box">
							<div className={`text-gray-400 stats-label`}>worst</div>
							<div className={`font-bold text-red-400 stats-value`}>
								{times.length > 0 ? format(Math.max(...times)) : '-'}
							</div>
						</div>
						<div className="bg-gray-800 p-3 rounded stats-box">
							<div className={`text-gray-400 stats-label`}>avg</div>
							<div className={`font-bold text-blue-400 stats-value`}>
								{times.length > 0 ? format(Math.round(times.reduce((a, b) => a + b, 0) / times.length)) : '-'}
							</div>
						</div>
						<div className="bg-gray-800 p-3 rounded stats-box">
							<div className={`text-gray-400 stats-label`}>ao5</div>
							<div className={`font-bold text-yellow-400 stats-value`}>
								{times.length >= 5 ? format(Math.round(times.slice(0, 5).reduce((a, b) => a + b, 0) / 5)) : '-'}
							</div>
						</div>
					</div>

					{/* Reset Button */}
					<button 
						onClick={handleReset}
						className={`w-full ${isMobile ? 'mt-4' : 'mt-6'} bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors`}
					>
						Reset All
					</button>
				</div>
			</div>
			</div>
		</>
	);
}

export default function PracticeTimerPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-[#131522] flex items-center justify-center text-white">
				<div className="text-2xl font-bold text-blue-400">Đang tải...</div>
			</div>
		}>
			<PracticeTimerContent />
		</Suspense>
	);
}
