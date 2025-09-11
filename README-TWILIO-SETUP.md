# Twilio Video Setup Guide

## Cấu hình môi trường

Thêm các biến môi trường sau vào file `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_API_KEY=your_twilio_api_key
TWILIO_API_SECRET=your_twilio_api_secret
```

## Lấy thông tin Twilio

1. Đăng ký tài khoản tại [Twilio Console](https://console.twilio.com/)
2. Vào **Account** > **API Keys & Tokens**
3. Tạo API Key mới hoặc sử dụng Account SID
4. Copy các giá trị vào file `.env.local`

## Cài đặt dependencies

```bash
npm install twilio twilio-video
```

## Tính năng mới

- ✅ Hỗ trợ nhiều người trong 1 phòng (lên đến 50 người)
- ✅ Tương thích với format cũ (Stringee)
- ✅ Tự động chuyển đổi room name
- ✅ Quản lý cam/mic real-time
- ✅ Error handling và reconnection

## Migration từ Stringee

Code hiện tại đã được cập nhật để:
- Tự động detect format cũ và chuyển đổi
- Sử dụng Twilio cho video calls
- Giữ nguyên interface VideoCall component

## Testing

1. Cấu hình Twilio credentials
2. Chạy `npm run dev`
3. Vào room và test video call
4. Kiểm tra console để debug

## Troubleshooting

- Kiểm tra Twilio credentials
- Đảm bảo HTTPS cho production
- Check browser permissions cho camera/mic
