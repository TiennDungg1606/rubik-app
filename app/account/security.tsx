import React, { useState } from "react";

export default function Security() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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
    } catch (err: any) {
      setPasswordError(err.message || "Có lỗi xảy ra");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-sm p-6">
      <h3 className="text-xl font-semibold mb-4">Bảo mật</h3>
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
  );
}
