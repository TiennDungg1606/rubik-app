import React, { useEffect, useState } from "react";
// Simple RSS to JSON parser (client-side, CORS must be allowed)
type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

function parseRSS(xml: string): NewsItem[] {
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const items = Array.from(doc.querySelectorAll("item"));
  return items.map(item => ({
    title: item.querySelector("title")?.textContent || "",
    link: item.querySelector("link")?.textContent || "",
    pubDate: item.querySelector("pubDate")?.textContent || "",
    description: item.querySelector("description")?.textContent || ""
  }));
}

export default function NewTab() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("https://cdn.feedcontrol.net/11035/20000-RO4SzrWdyOieK.xml")
      .then(res => {
        if (!res.ok) throw new Error("Không thể tải RSS feed");
        return res.text();
      })
      .then(xml => {
        setNews(parseRSS(xml));
        setLoading(false);
      })
      .catch(e => {
        setError("Không thể tải tin tức Rubik quốc tế.");
        setLoading(false);
      });
  }, []);

  return (
    <section className="w-full max-w-2xl p-6 mt-2 mb-4">
      <h2 className="text-2xl font-extrabold text-yellow-400 mb-4 drop-shadow-lg">Tin tức & Cập nhật</h2>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-blue-300 drop-shadow">Cập nhật website</h3>
        <ul className="list-disc list-inside text-white font-semibold text-base ml-4">
          <li>Thêm tab New để xem tin tức mới nhất về website và cộng đồng Rubik.</li>
          <li>Cải thiện giao diện và trải nghiệm người dùng trên mobile.</li>
          <li>Sửa các lỗi nhỏ và tối ưu hiệu năng.</li>
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-purple-400 drop-shadow">Bản cập nhật kế tiếp</h3>
        <ul className="list-disc list-inside text-white font-semibold text-base ml-4">
          <li>Thêm tính năng xếp hạng huy hiệu rank từ Đồng I đến Thách Đấu.</li>
          <li>Thêm phòng chơi thường và chơi xếp hạng.</li>
          <li>Thêm bảng xếp hạng thành tích toàn server.</li>
          <li>Thêm các gian hàng về rubik giá cả hợp lý.</li>
          <li>Thay đổi backend server vào tháng 9 (có thể không).</li>          
          <li>Hỗ trợ nhiều loại sự kiện Rubik hơn.</li>
          <li>Cập nhật giao diện đẹp hơn.</li>
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-bold text-green-300 drop-shadow">Tin tức Rubik quốc tế</h3>
        {loading && <div className="text-white font-semibold">Đang tải tin tức...</div>}
        {error && <div className="text-red-400 font-semibold">{error}</div>}
        {!loading && !error && (
          <ul className="list-disc list-inside text-white font-semibold text-base ml-4">
            {news.slice(0, 8).map((item, idx) => (
              <li key={idx} className="mb-2">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline font-bold drop-shadow">{item.title}</a>
                <div className="text-xs text-gray-400 font-normal">{item.pubDate && new Date(item.pubDate).toLocaleString()}</div>
                {/* <div className="text-xs text-gray-300">{item.description}</div> */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
