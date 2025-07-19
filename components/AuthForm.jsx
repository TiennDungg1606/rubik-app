import { useState } from "react";

export default function AuthForm() {
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
        window.location.reload();
      }
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 bg-white rounded shadow">
      <div className="flex mb-4">
        <button
          className={`flex-1 py-2 font-bold rounded-l ${tab === "login" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setTab("login")}
        >Đăng nhập</button>
        <button
          className={`flex-1 py-2 font-bold rounded-r ${tab === "register" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          onClick={() => setTab("register")}
        >Đăng ký</button>
      </div>
      <form onSubmit={handleSubmit}>
        <label className="block mb-1 text-gray-700 font-semibold">Email</label>
        <input name="email" type="email" placeholder="Email" required value={form.email} onChange={handleChange} className="mb-3 w-full p-2 border rounded bg-gray-100 text-gray-900" />
        <label className="block mb-1 text-gray-700 font-semibold">Mật khẩu</label>
        <input name="password" type="password" placeholder="Mật khẩu" required value={form.password} onChange={handleChange} className="mb-3 w-full p-2 border rounded bg-gray-100 text-gray-900" />
        {tab === "register" && (
          <>
            <label className="block mb-1 text-gray-700 font-semibold">Họ</label>
            <input name="firstName" placeholder="Họ" required value={form.firstName} onChange={handleChange} className="mb-3 w-full p-2 border rounded bg-gray-100 text-gray-900" />
            <label className="block mb-1 text-gray-700 font-semibold">Tên</label>
            <input name="lastName" placeholder="Tên" required value={form.lastName} onChange={handleChange} className="mb-3 w-full p-2 border rounded bg-gray-100 text-gray-900" />
            <label className="block mb-1 text-gray-700 font-semibold">Ngày sinh</label>
            <input name="birthday" type="date" required value={form.birthday} onChange={handleChange} className="mb-3 w-full p-2 border rounded bg-gray-100 text-gray-900" />
          </>
        )}
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-500 mb-2">{success}</div>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold">
          {tab === "register" ? "Đăng ký" : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
