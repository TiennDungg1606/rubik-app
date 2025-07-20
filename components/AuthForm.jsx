
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AuthForm({ onLogin }) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    birthday: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState("login");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setSuccess("");
    const url = tab === "register" ? "/api/user/register" : "/api/user/login";
    const body = tab === "register"
      ? { ...form }
      : { email: form.email, password: form.password };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Có lỗi xảy ra");
    } else {
      if (tab === "register") {
        setSuccess("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
        setForm({ email: "", password: "", firstName: "", lastName: "", birthday: "" });
        setTimeout(() => {
          setTab("login");
          setSuccess("");
        }, 1500);
      } else {
        setSuccess("Đăng nhập thành công!");
        if (onLogin) onLogin();
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ objectFit: 'cover' }}
      >
        <source src="/Backgound/[XT3] Rubik 3x3 QiYi XT3 V1 M XMD X-Man 2024 Flagship Rubic Nam Châm Đồ Chơi Trí Tuệ Trẻ Em - Shopee Việt Nam.mp4" type="video/mp4" />
      </video>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />
      <div className="w-full max-w-md mx-auto bg-white/90 rounded-2xl shadow-2xl px-8 py-10 flex flex-col items-center border border-gray-200 relative z-20">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Image src="/globe.svg" alt="Logo" width={48} height={48} className="mb-2" />
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Good to see you again</h2>
        </div>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label className="block mb-1 text-gray-700 font-semibold">Your email</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Z" stroke="#888" strokeWidth="1.5"/><path d="m3 7 8.25 6.5a2 2 0 0 0 2.5 0L21 7" stroke="#888" strokeWidth="1.5"/></svg>
              </span>
              <input name="email" type="email" placeholder="e.g. elon@tesla.com" required value={form.email} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-gray-700 font-semibold">Your password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="8" rx="2" stroke="#888" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#888" strokeWidth="1.5"/></svg>
              </span>
              <input name="password" type="password" placeholder="e.g. ilovemangools123" required value={form.password} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          {tab === "register" && (
            <>
              <div className="mb-4">
                <label className="block mb-1 text-gray-700 font-semibold">First name</label>
                <input name="firstName" placeholder="First name" required value={form.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-gray-700 font-semibold">Last name</label>
                <input name="lastName" placeholder="Last name" required value={form.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="mb-4">
                <label className="block mb-1 text-gray-700 font-semibold">Birthday</label>
                <input name="birthday" type="date" required value={form.birthday} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </>
          )}
          {error && <div className="text-red-500 mb-2 text-center font-semibold">{error}</div>}
          {success && <div className="text-green-500 mb-2 text-center font-semibold">{success}</div>}
          <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold text-lg shadow transition-all duration-150">
            {tab === "register" ? "Sign up" : "Sign in"}
          </button>
        </form>
        <div className="flex justify-between w-full mt-4 text-sm">
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => setTab(tab === "register" ? "login" : "register")}
          >
            {tab === "register" ? "Back to sign in" : "Don't have an account?"}
          </button>
          <a href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</a>
        </div>
        {/* Footer app links */}
        <div className="flex justify-center gap-4 mt-8 w-full flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/file.svg" alt="file" width={16} height={16}/> KWFinder</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/globe.svg" alt="globe" width={16} height={16}/> SERPChecker</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/window.svg" alt="window" width={16} height={16}/> SERPWatcher</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/vercel.svg" alt="vercel" width={16} height={16}/> LinkMiner</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/google.svg" alt="google" width={16} height={16}/> SiteProfiler</span>
        </div>
      </div>
    </div>
  );
}
