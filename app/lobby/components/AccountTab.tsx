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
  // State hiển thị mật khẩu
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Trường xác nhận mật khẩu mới sẽ đồng bộ với trường mật khẩu mới
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
  const NAME_MAX_LENGTH = 7;
  const clampName = (value?: string | null) => (value || "").slice(0, NAME_MAX_LENGTH);
  const [firstNameInput, setFirstNameInput] = useState(clampName(user?.firstName));
  const [lastNameInput, setLastNameInput] = useState(clampName(user?.lastName));
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  // Đồng bộ input khi prop user thay đổi
  useEffect(() => {
    if (user) {
      setFirstNameInput(clampName(user.firstName));
      setLastNameInput(clampName(user.lastName));
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
      if (!res.ok) throw new Error("Mật khẩu hiện tại không đúng");
      setPasswordSuccess("Đổi mật khẩu thành công!");
      // Không tự động đóng form, chỉ đóng khi người dùng bấm nút Đóng
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
    const trimmedFirst = firstNameInput.trim();
    const trimmedLast = lastNameInput.trim();
    if (!trimmedFirst || !trimmedLast) {
      setNameError("Vui lòng nhập đủ họ và tên");
      setNameLoading(false);
      return;
    }
    if (trimmedFirst.length > NAME_MAX_LENGTH || trimmedLast.length > NAME_MAX_LENGTH) {
      setNameError(`Họ và tên không được vượt quá ${NAME_MAX_LENGTH} ký tự`);
      setNameLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/user/change-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: trimmedFirst, lastName: trimmedLast }),
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
    <section className="w-full px-6 py-10 flex flex-row gap-8">
      <aside className="w-64 min-w-[220px] max-w-[280px]">
        <nav className="flex flex-col gap-2">
          <div className="font-bold text-lg mb-2">Cài đặt</div>
          <button className="text-left px-4 py-2 rounded-lg hover:bg-blue-600/10 transition font-medium">Thông tin tài khoản</button>
          <button className="text-left px-4 py-2 rounded-lg hover:bg-yellow-600/10 transition font-medium">Bảo mật</button>
          <button className="text-left px-4 py-2 rounded-lg hover:bg-emerald-600/10 transition font-medium">Profile</button>
          <button className="text-left px-4 py-2 rounded-lg hover:bg-gray-600/10 transition font-medium">Thiết lập</button>
        </nav>
      </aside>
      <main className="flex-1">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Cài đặt tài khoản</h2>
          <p className="text-sm text-gray-400 mt-2">Quản lý thông tin cá nhân và bảo mật của bạn.</p>
        </div>
        <div className="flex flex-col gap-8">
          {/* Thông tin tài khoản */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4">Thông tin tài khoản</h3>
            {user ? (
              <ul className="space-y-3">
                <li><span className="font-medium text-gray-400">Họ:</span> <span className="text-gray-200">{user.firstName || "Chưa cập nhật"}</span></li>
                <li><span className="font-medium text-gray-400">Tên:</span> <span className="text-gray-200">{user.lastName || "Chưa cập nhật"}</span></li>
                <li><span className="font-medium text-gray-400">Ngày sinh:</span> <span className="text-gray-200">{user.birthday ? formatBirthday(user.birthday) : "Chưa cập nhật"}</span></li>
                <li><span className="font-medium text-gray-400">Email:</span> <span className="text-gray-200">{user.email || "Chưa cập nhật"}</span></li>
              </ul>
            ) : (
              <div className="text-gray-400">Không có thông tin tài khoản.</div>
            )}
          </section>
          {/* Bảo mật */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-sm p-6">
            <h3 className="text-xl font-semibold mb-4">Bảo mật</h3>
            {/* Form đổi mật khẩu giữ nguyên logic cũ */}
            <form className="pt-2" onSubmit={handlePasswordChange}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-300" htmlFor="oldPwd">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      id="oldPwd"
                      type={showOldPassword ? "text" : "password"}
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full pr-10"
                      placeholder="Nhập mật khẩu hiện tại"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-2 text-gray-400 hover:text-yellow-500"
                      onClick={() => setShowOldPassword((v) => !v)}
                    >
                      {showOldPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587A3 3 0 0014.415 14.42M9.88 9.88A3 3 0 0114.12 14.12M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-300" htmlFor="newPwd">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      id="newPwd"
                      type={showNewPassword ? "text" : "password"}
                      className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full pr-10"
                      placeholder="Tối thiểu 6 ký tự"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-2 top-2 text-gray-400 hover:text-yellow-500"
                      onClick={() => setShowNewPassword((v) => !v)}
                    >
                      {showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587A3 3 0 0014.415 14.42M9.88 9.88A3 3 0 0114.12 14.12M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-sm text-gray-300" htmlFor="confirmPwd">Xác nhận mật khẩu mới</label>
                  <input
                    id="confirmPwd"
                    type={showNewPassword ? "text" : "password"}
                    className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
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
                  onClick={() => {
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
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
          </section>
        </div>
      </main>
    </section>
  );
}
  