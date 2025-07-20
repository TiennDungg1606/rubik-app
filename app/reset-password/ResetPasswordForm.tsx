
"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params?.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password || password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/user/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) {
      setSuccess("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập lại.");
      setTimeout(() => router.push("/"), 2000);
    } else {
      const data = await res.json();
      setError(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 rounded-2xl shadow-2xl px-8 py-10 flex flex-col items-center border border-gray-200 mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Đặt lại mật khẩu</h2>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-4">
          <label className="block mb-1 text-gray-700 font-semibold">Mật khẩu mới</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nhập mật khẩu mới"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-gray-700 font-semibold">Nhập lại mật khẩu</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nhập lại mật khẩu"
          />
        </div>
        {error && <div className="text-red-500 mb-2 text-center font-semibold">{error}</div>}
        {success && <div className="text-green-500 mb-2 text-center font-semibold">{success}</div>}
        <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg shadow transition-all duration-150 disabled:opacity-60">
          {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
        </button>
      </form>
    </div>
  );
}
