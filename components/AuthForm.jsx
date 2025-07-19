import { useState } from "react";

export default function AuthForm({ type = "login" }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    birthday: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setSuccess("");
    const url = type === "register" ? "/api/user/register" : "/api/user/login";
    const body = type === "register"
      ? { ...form }
      : { email: form.email, password: form.password };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Có lỗi xảy ra");
    else setSuccess(type === "register" ? "Đăng ký thành công!" : "Đăng nhập thành công!");
    if (type === "login" && res.ok) window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-2">{type === "register" ? "Đăng ký" : "Đăng nhập"}</h2>
      <input name="email" type="email" placeholder="Email" required value={form.email} onChange={handleChange} className="mb-2 w-full p-2 border" />
      <input name="password" type="password" placeholder="Mật khẩu" required value={form.password} onChange={handleChange} className="mb-2 w-full p-2 border" />
      {type === "register" && (
        <>
          <input name="firstName" placeholder="Họ" required value={form.firstName} onChange={handleChange} className="mb-2 w-full p-2 border" />
          <input name="lastName" placeholder="Tên" required value={form.lastName} onChange={handleChange} className="mb-2 w-full p-2 border" />
          <input name="birthday" type="date" required value={form.birthday} onChange={handleChange} className="mb-2 w-full p-2 border" />
        </>
      )}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-500 mb-2">{success}</div>}
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
        {type === "register" ? "Đăng ký" : "Đăng nhập"}
      </button>
    </form>
  );
}
