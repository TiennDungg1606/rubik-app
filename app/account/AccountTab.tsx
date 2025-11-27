// ...existing code...
import React, { useEffect, useState } from "react";

type AccountTabProps = {
	user: {
		email?: string;
		firstName?: string;
		lastName?: string;
		birthday?: string;
	} | null;
	loading?: boolean;
	onUserUpdated?: (user: { email?: string; firstName?: string; lastName?: string; birthday?: string }) => void;
};

export default function AccountTab({ user, loading, onUserUpdated }: AccountTabProps) {
	// State cho tab đang chọn
	const [activeTab, setActiveTab] = useState<'info' | 'security' | 'profile' | 'setup'>('info');
	// Đọc tab từ query string khi mount
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const tab = params.get('tab');
			if (tab === 'info' || tab === 'security' || tab === 'profile' || tab === 'setup') {
				setActiveTab(tab);
			}
		}
	}, []);
	  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
	  const [mobileShrink, setMobileShrink] = useState(false);
	// Import các component con
	const Info = require('./info').default;
	const Security = require('./security').default;
	const Profile = require('./profile').default;
	const Setup = require('./setup').default;
	useEffect(() => {
		function evaluateViewport() {
			const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
			const portrait = window.innerHeight > window.innerWidth;
			const mobileLandscape = mobile && !portrait && window.innerWidth < 1200;
			setIsMobileLandscape(mobileLandscape);
			const compactWidth = window.innerWidth < 768;
			setMobileShrink(compactWidth || mobileLandscape);
		}
	  
		if (typeof window !== "undefined") {
			evaluateViewport();
			window.addEventListener("resize", evaluateViewport);
			window.addEventListener("orientationchange", evaluateViewport);
			return () => {
			  window.removeEventListener("resize", evaluateViewport);
			  window.removeEventListener("orientationchange", evaluateViewport);
			};
		}
		}, []);
	// UI cải tiến dạng list bên trái
	// mobileShrink responsive variables
	const pxSize = mobileShrink ? "px-4" : "px-6";
	const pySize = mobileShrink ? "py-3" : "py-5";
	const gapSize = mobileShrink ? "gap-3" : "gap-3";
	const sidebarWidth = mobileShrink ? "w-36 min-w-[120px] max-w-[160px]" : "w-64 min-w-[220px] max-w-[280px]";
	const navGap = mobileShrink ? "gap-1" : "gap-2";
	const navTitleSize = mobileShrink ? "text-base mb-1" : "text-lg mb-2";
	const btnPadding = mobileShrink ? "px-2 py-1 text-sm" : "px-4 py-2";
	const mainGap = mobileShrink ? "gap-4" : "gap-8";
	return (
		<section className={`w-full ${pxSize} ${pySize} flex flex-row ${gapSize}`}>
			<aside className={sidebarWidth}>
				<nav className={`flex flex-col ${navGap}`}>
					<div className={`font-bold ${navTitleSize}`}>Cài đặt</div>
					<button
						className={`w-full text-left rounded-xl font-medium transition ${btnPadding} ${activeTab === 'info' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('info')}
					>Thông tin tài khoản</button>
					<button
						className={`w-full text-left rounded-xl font-medium transition ${btnPadding} ${activeTab === 'security' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('security')}
					>Bảo mật</button>
					<button
						className={`w-full text-left rounded-xl font-medium transition ${btnPadding} ${activeTab === 'profile' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('profile')}
					>Profile</button>
					<button
						className={`w-full text-left rounded-xl font-medium transition ${btnPadding} ${activeTab === 'setup' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('setup')}
					>Thiết lập</button>
				</nav>
			</aside>
			<main className="flex-1 overflow-y-auto max-h-[calc(100vh-40px)]">
				<div className={`flex flex-col ${mainGap}`}>
					{activeTab === 'info' && <Info user={user} />}
					{activeTab === 'security' && <Security />}
					{activeTab === 'profile' && <Profile />}
					{activeTab === 'setup' && <Setup />}
				</div>
			</main>
		</section>
	);
}
