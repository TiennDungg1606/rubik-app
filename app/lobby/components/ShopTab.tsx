import React from "react";

export default function ShopTab() {
  return (
  <section className="w-full max-w-7xl p-15 mt-2 mb-4 rounded-xl bg-neutral-900/30 backdrop-blur-sm shadow-xl border border-neutral-700 mx-auto">
  <h2 className="text-3xl font-extrabold text-white mb-6 flex items-center gap-2">
        🛒 Shop Rubik
      </h2>
  <div className="text-white text-base font-normal mb-8">
        Khám phá các sản phẩm Rubik, Timer, Thảm, Phụ kiện lube, sticker, túi đựng!
      </div>
  <div className="flex flex-col gap-6">
    {/* Mục Rubik */}
  <div className="bg-neutral-800/10 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-neutral-700 w-full">
          <h3 className="text-lg font-bold text-blue-300 mb-2">I. Rubik</h3>
          <div className="flex flex-col gap-2">
            <ul className="list-disc list-inside text-base ml-4 mb-2">
              <li>
                <a
                  href="https://vt.tiktok.com/ZSSqEYYb8/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                >
                  QiYi X-Man Tornado V3M Pioneer UV 3x3x3 Maglev Magnetic Magic Speed Cube Qiyi XMD Tornado V3 M Pioneer UV Puzzle Toys tornado v3
                </a>
              </li>
              <li>
                <a
                  href="https://vt.tiktok.com/ZSSpDtyWv/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                >
                  QZCUBE Tianma X3 3x3 Core Magnetic Cube Professional 3x3x3 Puzzle Toys Speed Cube
                </a>
              </li> 
              <li>
                <a
                  href="https://vt.tiktok.com/ZSSpUytcr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                >
                  [XT3] Rubik 3x3 QiYi XT3 V1 M XMD X-Man 2024 Flagship Rubic Nam Châm 
                </a>
              </li>  
              <li>
                <a
                  href="https://vt.tiktok.com/ZSSpUYNmq/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                > 
                  Khối Từ Tính, GAN Swift Block, 3x3, 355mm, Khối Tốc Độ 3x3 Từ Tính, Đổ Chơi Rubik, Rubik 3x3, Rubik Cube
                </a>
              </li> 
              <li>
                <a
                  href="https://vt.tiktok.com/ZSSpUqSJy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                > 
                  Rubik 3x3 Gan 356 ME 3x3 Magnetic Rubic 3 Tầng Có Nam Châm Gan 356M E Stickerless Đồ Chơi Trí Tuệ 3x3x3
                </a>
              </li>                           
            </ul>
          </div>
        </div>
    {/* Mục Timer + Thảm */}
  <div className="bg-neutral-800/10 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-neutral-700 w-full">
          <h3 className="text-lg font-bold text-blue-300 mb-2">II. Timer, thảm</h3>
          <ul className="list-disc list-inside text-white text-base ml-4 mb-2">
            <li>
              <a
                href="https://vt.tiktok.com/ZSSbJMWfC/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline font-semibold"
              >
                Thảm Rubik Mat Size Nhỏ Và Size Lớn Rubik Đồ Chơi Trí Tuệ
              </a>
            </li>
          </ul>
        </div>
    {/* Mục Phụ kiện */}
  <div className="bg-neutral-800/10 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-neutral-700 w-full">
          <h3 className="text-lg font-bold text-blue-300 mb-2">III. Phụ kiện</h3>
          <ul className="list-disc list-inside text-white text-base ml-4 mb-2">
            <li>
              <a
                href="https://vt.tiktok.com/ZSSbJgJua/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline font-semibold"
              >
                Silicon Dầu Bôi Trơn Rubik Lube V1/V2 5ml Rubic
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
