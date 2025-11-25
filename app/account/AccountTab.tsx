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

	// Import các component con
	const Info = require('./info').default;
	const Security = require('./security').default;
	const Profile = require('./profile').default;
	const Setup = require('./setup').default;
	// UI cải tiến dạng list bên trái
	return (
		<section className="w-full px-6 py-5 flex flex-row gap-3">
			<aside className="w-64 min-w-[220px] max-w-[280px]">
				<nav className="flex flex-col gap-2">
					<div className="font-bold text-lg mb-2">Cài đặt</div>
					<button
						className={`w-full text-left px-4 py-2 rounded-xl font-medium transition
							${activeTab === 'info' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('info')}
					>Thông tin tài khoản</button>
					<button
						className={`w-full text-left px-4 py-2 rounded-xl font-medium transition
							${activeTab === 'security' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('security')}
					>Bảo mật</button>
					<button
						className={`w-full text-left px-4 py-2 rounded-xl font-medium transition
							${activeTab === 'profile' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('profile')}
					>Profile</button>
					<button
						className={`w-full text-left px-4 py-2 rounded-xl font-medium transition
							${activeTab === 'setup' ? 'bg-blue-500 text-white shadow font-bold' : 'text-white-900 hover:bg-blue-400'}`}
						onClick={() => setActiveTab('setup')}
					>Thiết lập</button>
				</nav>
			</aside>
			<main className="flex-1 overflow-y-auto max-h-[calc(100vh-40px)]">
				<div className="flex flex-col gap-8">
					{activeTab === 'info' && <Info user={user} />}
					{activeTab === 'security' && <Security />}
					{activeTab === 'profile' && <Profile />}
					{activeTab === 'setup' && <Setup />}
				</div>
			</main>
		</section>
	);
}
