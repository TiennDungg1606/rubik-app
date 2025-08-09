import React, { useEffect } from "react";
import { useState } from "react";

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
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = (firstName || "").trim();
    const last = (lastName || "").trim();
    if (!first && !last) return "?";
    const a = first ? first[0] : "";
    const b = last ? last[0] : "";
    return (a + b || a || b).toUpperCase();
  };

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

  // State cho form đổi họ tên
  const [showNameForm, setShowNameForm] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState(user?.firstName || "");
  const [lastNameInput, setLastNameInput] = useState(user?.lastName || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  // Đồng bộ input khi prop user thay đổi
  useEffect(() => {
    if (user) {
      setFirstNameInput(user.firstName || "");
      setLastNameInput(user.lastName || "");
    }
  }, [user]);

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
      // Refetch user
      try {
        const me = await fetch('/api/user/me', { credentials: 'include', cache: 'no-store' });
        if (me.ok) {
          const data = await me.json();
          if (data?.user && onUserUpdated) onUserUpdated(data.user);
        }
      } catch {}
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

  // Hàm xử lý đổi họ tên
  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true);
    setNameError("");
    setNameSuccess("");
    try {
      const res = await fetch("/api/user/change-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstNameInput, lastName: lastNameInput }),
      });
      if (!res.ok) throw new Error("Đổi họ tên thất bại");
      setNameSuccess("Đổi họ tên thành công!");
      setShowNameForm(false);
      // Refetch user
      try {
        const me = await fetch('/api/user/me', { credentials: 'include', cache: 'no-store' });
        if (me.ok) {
          const data = await me.json();
          if (data?.user && onUserUpdated) onUserUpdated(data.user);
        }
      } catch {}
    } catch (err: any) {
      setNameError(err.message || "Có lỗi xảy ra");
    } finally {
      setNameLoading(false);
    }
  };
  return (
    <section className="w-full px-6 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Cài đặt tài khoản</h2>
        <p className="text-sm text-gray-400 mt-2">Quản lý thông tin cá nhân và bảo mật của bạn.</p>
      </div>

      {loading ? (
        <div className="w-full animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-neutral-900/40 border border-neutral-800" />
          <div className="h-40 rounded-xl bg-neutral-900/40 border border-neutral-800" />
          <div className="h-64 rounded-xl bg-neutral-900/40 border border-neutral-800" />
        </div>
      ) : user ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6">
          {/* Header card */}
          <div className="xl:col-span-12 md:col-span-2 col-span-1 rounded-2xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm shadow-sm">
            <div className="p-6 flex items-center gap-5">
              <div className="size-14 md:size-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center font-semibold">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="min-w-0">
                <div className="text-base md:text-lg font-semibold truncate">
                  {user.firstName || user.lastName ? (
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                  ) : (
                    <span>Người dùng</span>
                  )}
                </div>
                <div className="text-sm text-gray-400 truncate">{user.email || "Chưa có email"}</div>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-3 text-sm text-gray-400">
                <div className="px-3 py-1 rounded-full border border-neutral-700 bg-neutral-900/50">Tài khoản</div>
              </div>
            </div>
            <div className="border-t border-neutral-800 px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span>📧</span>
                <div className="text-gray-400">Email</div>
                <div className="ml-auto text-gray-200 truncate">{user.email || "Chưa cập nhật"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span>👤</span>
                <div className="text-gray-400">UserName</div>
                <div className="ml-auto text-gray-200 truncate">
                  {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Chưa cập nhật"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>🎂</span>
                <div className="text-gray-400">Ngày sinh</div>
                <div className="ml-auto text-gray-200 truncate">
                  {user.birthday ? formatBirthday(user.birthday) : "Chưa cập nhật"}
                </div>
              </div>
            </div>
          </div>

          {/* Birthday settings */}
          <div className="xl:col-span-6 md:col-span-1 col-span-1 rounded-2xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm shadow-sm">
            <div className="px-6 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Ngày sinh</h3>
                  <p className="text-sm text-gray-400 mt-1">Cập nhật ngày sinh đúng.</p>
                </div>
                <button
                  className="px-3 py-2 text-sm rounded-lg border border-blue-500/30 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition"
                  onClick={() => setShowBirthdayForm((v) => !v)}
                >
                  {showBirthdayForm ? "Đóng" : "Thay đổi"}
                </button>
              </div>
            </div>

            {showBirthdayForm && (
              <form className="px-6 pb-6 pt-4" onSubmit={handleBirthdayChange}>
                <div className="grid grid-cols-1 sm:max-w-md gap-3">
                  <label className="text-sm text-gray-300" htmlFor="birthday">Chọn ngày sinh</label>
                  <input
                    id="birthday"
                    type="date"
                    className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newBirthday}
                    onChange={(e) => setNewBirthday(e.target.value)}
                    required
                  />
                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-neutral-700 text-gray-300 hover:bg-neutral-800 transition"
                      onClick={() => setShowBirthdayForm(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={birthdayLoading}
                    >
                      {birthdayLoading && (
                        <span className="inline-block size-4 border-2 border-white/60 border-l-transparent rounded-full animate-spin" />
                      )}
                      Lưu thay đổi
                    </button>
                  </div>
                  {birthdayError && (
                    <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
                      {birthdayError}
                    </div>
                  )}
                  {birthdaySuccess && (
                    <div className="mt-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 text-sm px-3 py-2">
                      {birthdaySuccess}
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Security settings */}
          <div className="xl:col-span-6 md:col-span-1 col-span-1 rounded-2xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm shadow-sm">
            <div className="px-6 pt-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Bảo mật</h3>
                <p className="text-sm text-gray-400 mt-1">Đổi mật khẩu để bảo vệ tài khoản của bạn.</p>
              </div>
              <button
                className="px-3 py-2 text-sm rounded-lg border border-yellow-500/30 bg-yellow-600/10 text-yellow-300 hover:bg-yellow-600/20 transition"
                onClick={() => setShowPasswordForm((v) => !v)}
              >
                {showPasswordForm ? "Đóng" : "Thay đổi"}
              </button>
            </div>

            {showPasswordForm && (
              <form className="px-6 pb-6 pt-4" onSubmit={handlePasswordChange}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-300" htmlFor="oldPwd">Mật khẩu hiện tại</label>
                    <input
                      id="oldPwd"
                      type="password"
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Nhập mật khẩu hiện tại"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-300" htmlFor="newPwd">Mật khẩu mới</label>
                    <input
                      id="newPwd"
                      type="password"
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Tối thiểu 6 ký tự"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm text-gray-300" htmlFor="confirmPwd">Xác nhận mật khẩu mới</label>
                    <input
                      id="confirmPwd"
                      type="password"
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-neutral-700 text-gray-300 hover:bg-neutral-800 transition"
                    onClick={() => setShowPasswordForm(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-medium transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={passwordLoading || !newPassword || newPassword !== confirmPassword}
                  >
                    {passwordLoading && (
                      <span className="inline-block size-4 border-2 border-black/60 border-l-transparent rounded-full animate-spin" />
                    )}
                    Lưu thay đổi
                  </button>
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
                    Mật khẩu mới không khớp
                  </div>
                )}
                {passwordError && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 text-sm px-3 py-2">
                    {passwordSuccess}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Name settings */}
          <div className="xl:col-span-12 rounded-2xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm shadow-sm">
            <div className="px-6 pt-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Họ và tên</h3>
                <p className="text-sm text-gray-400 mt-1">Cập nhật họ và tên hiển thị của bạn.</p>
              </div>
              <button
                className="px-3 py-2 text-sm rounded-lg border border-emerald-500/30 bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20 transition"
                onClick={() => setShowNameForm((v) => !v)}
              >
                {showNameForm ? "Đóng" : "Thay đổi"}
              </button>
            </div>
            {showNameForm && (
              <form className="px-6 pb-6 pt-4" onSubmit={handleNameChange}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-300" htmlFor="firstName">Họ</label>
                    <input
                      id="firstName"
                      type="text"
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nhập họ"
                      value={firstNameInput}
                      onChange={(e) => setFirstNameInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-300" htmlFor="lastName">Tên</label>
                    <input
                      id="lastName"
                      type="text"
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nhập tên"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-neutral-700 text-gray-300 hover:bg-neutral-800 transition"
                    onClick={() => setShowNameForm(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-medium transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={nameLoading || !firstNameInput || !lastNameInput}
                  >
                    {nameLoading && (
                      <span className="inline-block size-4 border-2 border-black/60 border-l-transparent rounded-full animate-spin" />
                    )}
                    Lưu thay đổi
                  </button>
                </div>
                {nameError && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
                    {nameError}
                  </div>
                )}
                {nameSuccess && (
                  <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 text-sm px-3 py-2">
                    {nameSuccess}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-400">Không có thông tin tài khoản.</div>
      )}
    </section>
  );
}
  