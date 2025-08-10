"use client";
import { useState } from "react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/user/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.error || "Không gửi được email. Vui lòng thử lại.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 rounded-2xl shadow-2xl px-8 py-10 flex flex-col items-center border border-gray-200 mt-10">
      <div className="flex flex-col items-center mb-6">
        <span className="mb-2">
          <svg width="32" height="32" viewBox="0 0 64 64" fill="none" className="mr-2 drop-shadow-lg" style={{marginLeft: -8}} xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="2" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="2" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
            <rect x="2" y="23" width="18" height="18" rx="3" fill="#FDE047" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="23" width="18" height="18" rx="3" fill="#22D3EE" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="23" width="18" height="18" rx="3" fill="#22C55E" stroke="#222" strokeWidth="2"/>
            <rect x="2" y="44" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="44" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="44" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2"/>
          </svg>
        </span>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Forgot your password?</h2>
        <div className="text-gray-500 text-sm text-center">Nhập email để nhận liên kết đặt lại mật khẩu.</div>
      </div>
      {sent ? (
        <div className="text-green-600 font-semibold text-center">Đã gửi email hướng dẫn đặt lại mật khẩu!<br/>Vui lòng kiểm tra hộp thư.</div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label className="block mb-1 text-gray-700 font-semibold">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nhập email của bạn"
            />
          </div>
          {error && <div className="text-red-500 mb-2 text-center font-semibold">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-lg shadow transition-all duration-150 disabled:opacity-60">
            {loading ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu"}
          </button>
        </form>
      )}
    </div>
  );
}
