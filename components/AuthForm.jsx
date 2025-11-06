
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AuthForm({ onLogin }) {
  const recaptchaRef = useRef(null);
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    birthday: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState("login");


  // Thêm script reCAPTCHA khi mount
  useEffect(() => {
    if (typeof window !== "undefined" && tab === "register") {
      if (!document.getElementById("recaptcha-script")) {
        const script = document.createElement("script");
        script.id = "recaptcha-script";
        script.src = "https://www.google.com/recaptcha/api.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      } else if (window.grecaptcha && recaptchaRef.current) {
        window.grecaptcha.render(recaptchaRef.current, {
          sitekey: "YOUR_SITE_KEY"
        });
      }
    }
  }, [tab]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setSuccess("");
    let recaptchaToken = "";
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
      if (form.password !== confirmPassword) {
        setError("Mật khẩu nhập lại không khớp");
        return;
      }
      // Lấy token reCAPTCHA v2 (checkbox)
      if (window.grecaptcha) {
        recaptchaToken = window.grecaptcha.getResponse();
        if (!recaptchaToken) {
          setError("Vui lòng xác thực captcha");
          return;
        }
      } else {
        setError("Captcha chưa sẵn sàng, vui lòng thử lại");
        return;
      }
    }
    const url = tab === "register" ? "/api/user/register" : "/api/user/login";
    const body = tab === "register"
      ? { ...form, "g-recaptcha-response": recaptchaToken }
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
  setConfirmPassword("");
        // Reset reCAPTCHA v2 nếu có
        if (window.grecaptcha && recaptchaRef.current) {
          window.grecaptcha.reset();
        }
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
    <div className="relative flex flex-col items-center justify-start pt-15">
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
          {tab === "register" && (
            <div className="mb-3">
              <label className="block mb-1 text-gray-700 font-semibold text-sm">Re-enter password</label>
              <input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          )}
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
              {/* Widget reCAPTCHA v2 (nếu dùng v2) */}
              <div className="mb-4">
                <div ref={recaptchaRef} className="g-recaptcha" data-sitekey="6Ld2h5srAAAAADRQnuz8QkFjjWKvxGfmONFZHycz"></div>
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
        <div className="flex justify-center gap-8 mt-6 w-full flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/vercel.svg" alt="file" width={16} height={16}/> Vercel</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/railway.png" alt="globe" width={16} height={16}/> Railway</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/mongodb.png" alt="window" width={16} height={16}/> MongoDB</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/stringee.png" alt="nextjs" width={16} height={16}/> Stringee</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><Image src="/dailyco.png" alt="nextjs" width={16} height={16}/> Daily.co</span>

        </div>
      </div>
    </div>
  );
}
