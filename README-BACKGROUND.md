# Cài đặt Custom Background

## Bước 1: Tạo file .env.local

Tạo file `.env.local` trong thư mục `rubik-app/` với nội dung:

```bash
MONGODB_URI=mongodb://localhost:27017/rubik-app
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

## Bước 2: Cài đặt MongoDB

### Option A: Local MongoDB
1. Tải MongoDB Community Server từ https://www.mongodb.com/try/download/community
2. Cài đặt và khởi động MongoDB service

### Option B: Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Option C: MongoDB Atlas (Cloud)
1. Tạo tài khoản tại https://cloud.mongodb.com
2. Tạo cluster và lấy connection string
3. Thay thế MONGODB_URI trong .env.local

## Bước 3: Khởi động lại ứng dụng

```bash
cd rubik-app
npm run dev
```

## Bước 4: Test tính năng

1. Đăng nhập vào ứng dụng
2. Vào Lobby → Click profile button (👤)
3. Chọn "Change background" → Upload ảnh ngang
4. Kiểm tra console browser để xem logs

## Troubleshooting

- **Lỗi "Unauthorized"**: Kiểm tra JWT token trong cookie
- **Lỗi "MongoDB connection"**: Kiểm tra MONGODB_URI và khởi động MongoDB
- **Ảnh không hiển thị**: Kiểm tra console browser và network tab

## Lưu ý

- Ảnh phải là **ngang** (width > height)
- Ảnh sẽ được **resize về 1920x1080** và **crop 16:9**
- **Fallback background**: `/images.jpg` (trong thư mục public)
