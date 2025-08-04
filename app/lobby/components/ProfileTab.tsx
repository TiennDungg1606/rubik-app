import React, { useState, useEffect } from "react";

interface ProfileTabProps {
  user: {
    email?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
  } | null;
  onLogout: () => void;
  onThemeSwitch?: () => void;
  onBgUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBgRemove?: () => void;
  hasCustomBg?: boolean;
}


const ProfileTab: React.FC<ProfileTabProps> = ({ user, onLogout, onThemeSwitch, onBgUpload, onBgRemove, hasCustomBg }) => {
  return (
    <div className="mt-4 mr-4 w-[340px] max-w-full bg-[#181926] rounded-2xl shadow-2xl border border-blue-700 flex flex-col items-center p-0 relative">
      {/* Avatar lớn */}
      <div className="w-full flex flex-col items-center pt-6 pb-2 border-b border-gray-700">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow mb-2">
          {user && (user.firstName || user.lastName)
            ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
            : <span>👤</span>}
        </div>
        <div className="text-lg font-semibold text-white mb-1">{user?.email || ""}</div>
      </div>
      {/* Account Setting và Logout */}
      <div className="w-full flex flex-col gap-2 px-6 py-4 border-t border-gray-700 mt-auto">
        <button
          className="flex items-center gap-2 text-blue-400 hover:text-blue-600 font-bold transition text-base justify-start"
          onClick={() => window.location.href = '/account'}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.418 0-8 2.239-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.761-3.582-5-8-5Z"/></svg>
          Account Setting
        </button>
        {/* Đổi ảnh nền cá nhân hóa - cùng style với Account Setting, icon hình bức ảnh */}
        <label className="flex items-center gap-2 text-blue-400 hover:text-blue-600 font-bold transition text-base justify-start cursor-pointer mt-1">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="8" cy="10" r="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 19l-5.5-7-4.5 6-3-4-4 5" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          Đổi ảnh nền
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              console.log('ProfileTab input file onChange', e.target.files?.[0]);
              if (onBgUpload) onBgUpload(e);
            }}
            style={{ display: 'none' }}
          />
        </label>
        {hasCustomBg && (
          <button
            className="ml-2 text-xs text-red-300 underline hover:text-red-500"
            onClick={onBgRemove}
            title="Xóa ảnh nền cá nhân hóa"
          >
            Xóa nền
          </button>
        )}
        <button
          className="flex items-center gap-2 text-red-400 hover:text-red-600 font-bold transition text-base justify-start mt-2"
          onClick={onLogout}
        >Logout <img src="/power.svg" alt="logout" className="w-6 h-6 inline-block align-middle ml-1" /></button>
      </div>
    </div>
  );
};

export default ProfileTab;


