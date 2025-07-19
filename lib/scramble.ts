// lib/scramble.ts
// Hàm tạo scramble Rubik 3x3 chuẩn WCA sử dụng thư viện scrambler
// Nếu chưa cài: npm install scrambler


// Lấy scramble chuẩn từ API cubing.net (cstimer không có public API chính thức)
// API: https://scramble.cubing.net/api/v0/scramble/333
export async function fetchWcaScramble(): Promise<string> {
  const res = await fetch("https://scramble.cubing.net/api/v0/scramble/333");
  if (!res.ok) throw new Error("Failed to fetch scramble");
  const data = await res.json();
  return data.scramble;
}
