import React from "react";

export default function ShopTab() {
  return (
    <section className="w-full max-w-2xl p-6 mt-2 mb-4">
      <h2 className="text-2xl font-extrabold text-yellow-400 mb-4 drop-shadow-lg">Shop Rubik</h2>
      <div className="text-white text-base font-semibold mb-2">Chức năng Shop sẽ sớm ra mắt! Bạn sẽ có thể mua Rubik, phụ kiện, timer, lube và nhiều sản phẩm khác ngay tại đây.</div>
      <ul className="list-disc list-inside text-white text-base ml-4 mb-2">
        <li>Sản phẩm Rubik chính hãng, giá tốt.</li>
        <li>Phụ kiện: timer, lube, túi đựng, sticker, ...</li>
        <li>Thanh toán và giao hàng toàn quốc.</li>
        <li>Ưu đãi cho thành viên sử dụng app.</li>
      </ul>
    </section>
  );
}
