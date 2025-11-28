import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type User = {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  md33?: string;
  goal33?: string;
  main33?: string;
  Feevent?: string;
  customBg?: string;
  username?: string;
};

export default function PublicProfilePage() {
  const { username: userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/user/public-profile?userId=${userId}`);
      const data = await res.json();
      setUser(data.user);
    }
    fetchUser();
  }, [userId]);

  if (!user) return <div className="text-center text-white py-20">Loading...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex flex-col py-10 px-10">
      <div className="w-full rounded-3xl overflow-hidden relative mb-8" style={{ background: "#181926" }}>
        <img src={user.customBg || "/profile-bg.jpg"} alt="Profile background" className="w-full h-[260px] object-cover opacity-80" />
        <div className="absolute left-8 top-8 flex items-center gap-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold border-4 border-white shadow text-5xl">
            {user.avatar || `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()}
          </div>
          <div>
            <h1 className="text-5xl font-bold text-white drop-shadow">{user.firstName} {user.lastName}</h1>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h2 className="text-3xl font-extrabold text-white mb-6">About me</h2>
          <div className="mb-4">
            <span className="bg-neutral-800 text-white px-4 py-2 rounded-full font-semibold mr-2">Bio</span>
          </div>
          <div className="text-lg italic text-white/70 ml-2">{user.bio || "No bio yet"}</div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">3x3 Method</span>
            <div className="text-lg text-white mt-2">{user.md33 || "-"}</div>
          </div>
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">3x3 Goal</span>
            <div className="text-lg text-white mt-2">{user.goal33 || "-"}</div>
          </div>
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">Main 3x3 Cube</span>
            <div className="text-lg text-white mt-2">{user.main33 || "-"}</div>
          </div>
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">Favorite Event</span>
            <div className="text-lg text-white mt-2">{user.Feevent || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
