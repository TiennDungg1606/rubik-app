# Cấu hình Daily.co cho chế độ 2vs2

## 1. Lấy API Key từ Daily.co

1. Truy cập https://dashboard.daily.co/developers
2. Đăng nhập vào tài khoản Daily.co
3. Tạo API key mới
4. Copy API key

## 2. Cấu hình Environment Variables

Thêm vào file `.env.local`:

```env
# Daily.co API Keys
DAILY_API_KEY_1=your_daily_api_key_1_here
DAILY_API_KEY_2=your_daily_api_key_2_here
```

## 3. Cấu hình Domain

1. Vào https://dashboard.daily.co/developers
2. Thêm domain `rubik-app.daily.co` vào danh sách allowed domains
3. Hoặc sử dụng domain mặc định của Daily.co

## 4. Test

1. Tạo phòng với chế độ 2vs2
2. Kiểm tra console để xem có lỗi API không
3. Kiểm tra xem video call có hoạt động không

## Lưu ý

- Chế độ 1vs1 vẫn sử dụng Stringee (không cần cấu hình gì thêm)
- Chế độ 2vs2 sử dụng Daily.co (cần cấu hình API key)
- Room được tạo tự động trên Daily.co khi chọn chế độ 2vs2
