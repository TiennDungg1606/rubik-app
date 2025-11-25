
import React, { useState } from "react";
export default function Info({ user }: { user: { email?: string; firstName?: string; lastName?: string; birthday?: string } | null }) {
  const formatBirthday = (isoDate?: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // State cho form chỉnh sửa
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [birthday, setBirthday] = useState(user?.birthday ? user.birthday.slice(0, 10) : "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleEdit = () => {
    setEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditing(false);
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setBirthday(user?.birthday ? user.birthday.slice(0, 10) : "");
    setEmail(user?.email || "");
    setError("");
    setSuccess("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // Đổi họ tên
      const nameRes = await fetch("/api/user/change-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      if (!nameRes.ok) throw new Error("Đổi họ tên thất bại");

      // Đổi ngày sinh
      const birthdayRes = await fetch("/api/user/change-birthday", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday }),
      });
      if (!birthdayRes.ok) throw new Error("Đổi ngày sinh thất bại");

      // Đổi email (nếu có API, nếu không thì bỏ qua)
      // const emailRes = await fetch("/api/user/change-email", {
      //   method: "PATCH",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email }),
      // });
      // if (!emailRes.ok) throw new Error("Đổi email thất bại");

      setSuccess("Cập nhật thành công!");
      setEditing(false);
      setTimeout(() => {
        window.location.reload();
      }, 800); // Đợi 0.8s để hiển thị thông báo thành công
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Thông tin tài khoản</h3>
        {!editing && user && (
          <button
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
            onClick={handleEdit}
          >Chỉnh sửa</button>
        )}
      </div>
      {user ? (
        editing ? (
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">Họ</label>
              <input
                type="text"
                className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">Tên</label>
              <input
                type="text"
                className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">Ngày sinh</label>
              <input
                type="date"
                className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">Email</label>
              <input
                type="email"
                className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-gray-100"
                value={email}
                disabled
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-neutral-700 text-gray-300 hover:bg-neutral-800 transition"
                onClick={handleCancel}
                disabled={loading}
              >Hủy</button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >Lưu thay đổi</button>
            </div>
            {error && <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">{error}</div>}
            {success && <div className="mt-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 text-sm px-3 py-2">{success}</div>}
          </form>
        ) : (
          <ul className="space-y-3">
            <li><span className="font-medium text-gray-400">Họ:</span> <span className="text-gray-200">{user.firstName || "Chưa cập nhật"}</span></li>
            <li><span className="font-medium text-gray-400">Tên:</span> <span className="text-gray-200">{user.lastName || "Chưa cập nhật"}</span></li>
            <li><span className="font-medium text-gray-400">Ngày sinh:</span> <span className="text-gray-200">{user.birthday ? formatBirthday(user.birthday) : "Chưa cập nhật"}</span></li>
            <li><span className="font-medium text-gray-400">Email:</span> <span className="text-gray-200">{user.email || "Chưa cập nhật"}</span></li>
          </ul>
        )
      ) : (
        <div className="text-gray-400">Không có thông tin tài khoản.</div>
      )}
    </section>
  );
}
