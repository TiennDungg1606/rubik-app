  import React from "react";
import { useState } from "react";

type AccountTabProps = {
  user: {
    email?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
  } | null;
  loading?: boolean;
};

export default function AccountTab({ user, loading }: AccountTabProps) {
  // Hàm định dạng ngày sinh ISO sang dd/mm/yyyy
  const formatBirthday = (isoDate?: string) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // State cho form đổi ngày sinh
  const [showBirthdayForm, setShowBirthdayForm] = useState(false);
  const [newBirthday, setNewBirthday] = useState("");
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [birthdayError, setBirthdayError] = useState("");
  const [birthdaySuccess, setBirthdaySuccess] = useState("");

  // State cho form đổi mật khẩu
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Hàm xử lý đổi ngày sinh
  const handleBirthdayChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setBirthdayLoading(true);
    setBirthdayError("");
    setBirthdaySuccess("");
    try {
      const res = await fetch("/api/user/change-birthday", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: newBirthday }),
      });
      if (!res.ok) throw new Error("Đổi ngày sinh thất bại");
      setBirthdaySuccess("Đổi ngày sinh thành công!");
      setShowBirthdayForm(false);
    } catch (err: any) {
      setBirthdayError(err.message || "Có lỗi xảy ra");
    } finally {
      setBirthdayLoading(false);
    }
  };

  // Hàm xử lý đổi mật khẩu
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới không khớp");
      setPasswordLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) throw new Error("Đổi mật khẩu thất bại");
      setPasswordSuccess("Đổi mật khẩu thành công!");
      setShowPasswordForm(false);
    } catch (err: any) {
      setPasswordError(err.message || "Có lỗi xảy ra");
    } finally {
      setPasswordLoading(false);
    }
  };
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <h2 className="text-3xl font-extrabold mb-8 text-blue-500 tracking-wide drop-shadow">Thông tin tài khoản</h2>
      {loading ? (
        <div className="text-gray-400">Đang tải thông tin...</div>
      ) : user ? (
        <div className="bg-gradient-to-br from-gray-900/10 via-gray-800/5 to-gray-700/10 shadow-2xl border border-blue-500 rounded-2xl p-8 w-full max-w-md flex flex-col gap-4 backdrop-blur-lg">
          <div className="flex items-center gap-3 text-lg">
            <span className="inline-block w-6 h-6 text-blue-400">📧</span>
            <span className="font-semibold text-gray-200">Email:</span>
            <span className="text-gray-100">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-lg">
            <span className="inline-block w-6 h-6 text-green-400">👤</span>
            <span className="font-semibold text-gray-200">Tên:</span>
            <span className="text-gray-100">{user.firstName} {user.lastName}</span>
          </div>
          <div className="flex items-center gap-3 text-lg">
            <span className="inline-block w-6 h-6 text-pink-400">🎂</span>
            <span className="font-semibold text-gray-200">Ngày sinh:</span>
            <span className="text-gray-100">{user.birthday ? formatBirthday(user.birthday) : <span className="text-gray-400">Chưa cập nhật</span>}</span>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-all duration-150 shadow text-white rounded-xl font-bold text-base" onClick={() => setShowBirthdayForm(v => !v)}>
            <span className="mr-2">🎂</span>Thay đổi ngày sinh
          </button>
          {showBirthdayForm && (
            <form className="flex flex-col gap-2 mt-2 bg-gray-900 p-4 rounded-xl border border-blue-400" onSubmit={handleBirthdayChange}>
              <input type="date" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-600" value={newBirthday} onChange={e => setNewBirthday(e.target.value)} required />
              <button type="submit" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 transition-all duration-150 text-white rounded-lg font-semibold shadow" disabled={birthdayLoading}>Lưu</button>
              {birthdayError && <div className="text-red-400 text-sm">{birthdayError}</div>}
              {birthdaySuccess && <div className="text-green-400 text-sm">{birthdaySuccess}</div>}
            </form>
          )}
          <button className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 transition-all duration-150 shadow text-white rounded-xl font-bold text-base" onClick={() => setShowPasswordForm(v => !v)}>
            <span className="mr-2">🔒</span>Thay đổi mật khẩu
          </button>
          {showPasswordForm && (
            <form className="flex flex-col gap-2 mt-2 bg-gray-900 p-4 rounded-xl border border-yellow-400" onSubmit={handlePasswordChange}>
              <input type="password" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-600" placeholder="Mật khẩu cũ" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
              <input type="password" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-600" placeholder="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <input type="password" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-600" placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              <button type="submit" className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 transition-all duration-150 text-white rounded-lg font-semibold shadow" disabled={passwordLoading}>Lưu</button>
              {passwordError && <div className="text-red-400 text-sm">{passwordError}</div>}
              {passwordSuccess && <div className="text-green-400 text-sm">{passwordSuccess}</div>}
            </form>
          )}
        </div>
      ) : (
        <div className="text-gray-400">Không có thông tin tài khoản.</div>
      )}
    </div>
  );
}
