# Daily.co Setup Guide

## Cấu hình môi trường

Thêm các biến môi trường sau vào file `.env.local`:

```env
# Daily.co Configuration
NEXT_PUBLIC_DAILY_DOMAIN=your-domain.daily.co
DAILY_API_KEY=your_daily_api_key
```

## Lấy thông tin Daily.co

1. Đăng ký tài khoản tại [Daily.co](https://daily.co)
2. Vào **Dashboard** → **Settings** → **API Keys**
3. Tạo API key mới hoặc sử dụng key có sẵn
4. Copy **Domain** và **API Key** vào file `.env.local`

## Cài đặt dependencies

```bash
npm install @daily-co/daily-js
```

## Tính năng mới

- ✅ Hỗ trợ nhiều người trong 1 phòng (lên đến 1,000 người)
- ✅ Không cần server-side token generation
- ✅ Tự động tạo room khi cần
- ✅ Quản lý cam/mic real-time
- ✅ Error handling và reconnection

## Migration từ Twilio

Code hiện tại đã được cập nhật để:
- Sử dụng Daily.co thay vì Twilio Video
- Tự động tạo room name từ roomId
- Giữ nguyên interface VideoCall component

## Testing

1. Cấu hình Daily.co credentials
2. Chạy `npm run dev`
3. Vào room và test video call
4. Kiểm tra console để debug

## Troubleshooting

- Kiểm tra Daily.co credentials
- Đảm bảo domain đúng format
- Check browser permissions cho camera/mic
- Kiểm tra network connection

## Pricing

- **Free Plan**: 2 phòng, 2 giờ/ngày, tối đa 2 người
- **Paid Plans**: Từ $0.004/phút/người
