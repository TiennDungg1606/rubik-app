import React, { useState } from "react";

export default function Profile() {
  const [bio, setBio] = useState("");
  const [method, setMethod] = useState("");
  const [goal, setGoal] = useState("");
  const [cube, setCube] = useState("");
  const [event, setEvent] = useState("");

  // TODO: Lấy userId từ context đăng nhập hoặc props
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/user/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          md33: method,
          goal33: goal,
          main33: cube,
          Feevent: event,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Cập nhật thành công!");
      } else {
        setMessage(data.error || "Có lỗi xảy ra.");
      }
    } catch (err) {
      setMessage("Có lỗi xảy ra.");
    }
    setLoading(false);
  };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-sm p-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-4">Edit Profile</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-lg font-semibold mb-2">Bio</label>
          <textarea
            className="w-full bg-neutral-800 text-white rounded-lg p-3 resize-none border-none outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            maxLength={250}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Bio..."
          />
          <div className="text-xs text-gray-400 mt-1">{bio.length}/250</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">3x3 Method</label>
            <input
              className="w-full bg-neutral-800 text-white rounded-lg p-2 border-none outline-none focus:ring-2 focus:ring-blue-500"
              value={method}
              onChange={e => setMethod(e.target.value)}
              placeholder="Ex: CFOP, ROUX"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">3x3 Goal</label>
            <input
              className="w-full bg-neutral-800 text-white rounded-lg p-2 border-none outline-none focus:ring-2 focus:ring-blue-500"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="Ex: Sub 10"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Main 3x3 Cube</label>
            <input
              className="w-full bg-neutral-800 text-white rounded-lg p-2 border-none outline-none focus:ring-2 focus:ring-blue-500"
              value={cube}
              onChange={e => setCube(e.target.value)}
              placeholder="Ex: GAN 11 M Pro 3x3"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Favorite Event</label>
            <input
              className="w-full bg-neutral-800 text-white rounded-lg p-2 border-none outline-none focus:ring-2 focus:ring-blue-500"
              value={event}
              onChange={e => setEvent(e.target.value)}
              placeholder="Ex: Pyraminx"
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow mt-2"
            disabled={loading}
          >
            {loading ? "Đang cập nhật..." : "Update Profile"}
          </button>
          {message && <div className="mt-2 text-sm text-blue-400">{message}</div>}
        </div>
      </form>
    </section>
  );
}
