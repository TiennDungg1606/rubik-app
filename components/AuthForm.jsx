
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState("login");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (tab === "register") {
      const hasNumber = /\d/;
      if (!form.firstName.trim() || hasNumber.test(form.firstName)) {
        setError("Họ không được chứa ký tự số");
        return;
      }
      if (!form.lastName.trim() || hasNumber.test(form.lastName)) {
        setError("First name must not contain numbers");
        return;
      }
      if (!form.password || form.password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }
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
          setSuccess("Registration successful! You can now log in.");
        setForm({ email: "", password: "", firstName: "", lastName: "", birthday: "" });
        setTimeout(() => {
          setTab("login");
          setSuccess("");
        }, 1500);
      } else {
        setSuccess("Login successful!");
        // Nếu là login, lấy firstName và lastName từ API trả về
        if (tab === "login" && data.user) {
          const userName = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim();
          if (typeof window !== 'undefined') {
            window.userName = userName;
          }
        }
        if (onLogin) onLogin();
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start pt-32">
      <div className="w-full max-w-sm mx-auto bg-white/90 rounded-2xl shadow-2xl px-4 py-8 flex flex-col items-center border border-gray-200 relative z-20 mt-0">
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Sign in to your account</h2>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-3">
            <label className="block mb-1 text-gray-700 font-semibold text-sm">Email</label>
            <input name="email" type="email" placeholder="Email" required value={form.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div className="mb-3">
            <label className="block mb-1 text-gray-700 font-semibold text-sm">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7zm9 3a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.5 0-9-7-9-7a17.6 17.6 0 013.16-4.19m3.12-2.54A8.96 8.96 0 0112 5c5.5 0 9 7 9 7a17.6 17.6 0 01-3.16 4.19m-2.12 1.54A8.96 8.96 0 0112 19c-1.07 0-2.09-.13-3.06-.37m-2.12-1.54A10.05 10.05 0 013.16 12.81m0 0L21 3" />
                  </svg>
                )}
              </button>
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
