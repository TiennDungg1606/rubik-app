# Hướng dẫn sử dụng Google AdSense an toàn

## Vấn đề và giải pháp

### Vấn đề thường gặp:
- Trình duyệt chặn quảng cáo khiến một số chức năng website không hoạt động
- Quảng cáo không hiển thị được
- User experience bị ảnh hưởng
- **Lỗi đỏ trong Network tab của DevTools**

### Giải pháp đã triển khai:

#### 1. Component GoogleAdScript
- Load script Google AdSense một cách an toàn
- Xử lý lỗi khi script không load được
- Tự động thử lại nếu cần
- **Timeout protection để tránh treo**

#### 2. Component GoogleAd
- Phát hiện khi quảng cáo bị chặn
- Hiển thị fallback content khi cần
- Loading state để user biết quảng cáo đang tải
- **Kiểm tra script sẵn sàng trước khi load quảng cáo**

#### 3. Component SmartAdWrapper
- Chỉ hiển thị quảng cáo sau khi user tương tác với website
- Có thể tùy chỉnh fallback content
- Không ảnh hưởng đến chức năng chính của website

## Cách sử dụng

### 1. Trong layout chính (đã tích hợp sẵn)
```tsx
// rubik-app/app/layout.tsx
import GoogleAdScript from "@/components/GoogleAdScript";

// Script sẽ tự động load khi website khởi động
<GoogleAdScript />
```

### 2. Hiển thị quảng cáo cơ bản
```tsx
import GoogleAd from "@/components/GoogleAd";

// Trong component của bạn
<GoogleAd adSlot="YOUR_AD_SLOT_ID" />
```

### 3. Hiển thị quảng cáo thông minh
```tsx
import SmartAdWrapper from "@/components/SmartAdWrapper";

// Chỉ hiển thị sau khi user tương tác
<SmartAdWrapper 
  adSlot="YOUR_AD_SLOT_ID"
  fallbackContent={<div>Nội dung thay thế</div>}
/>
```

### 4. Test quảng cáo
```tsx
// Truy cập trang test: /test-ad
// Hoặc import component test
import AdTest from "@/components/AdTest";
<AdTest />
```

## Các tính năng bảo vệ

### 1. Phát hiện trình chặn quảng cáo
- Tự động kiểm tra xem quảng cáo có bị chặn không
- Hiển thị thông báo phù hợp cho user

### 2. Fallback content
- Khi quảng cáo bị chặn, hiển thị nội dung thay thế
- Không để trống màn hình

### 3. Không ảnh hưởng chức năng
- CSS đảm bảo các button, link vẫn hoạt động
- Z-index được quản lý đúng cách
- Pointer events được xử lý phù hợp

### 4. Lazy loading
- Quảng cáo chỉ hiển thị sau khi user tương tác
- Tiết kiệm bandwidth và cải thiện performance

### 5. **Error handling nâng cao**
- Timeout protection (10 giây)
- Retry mechanism với giới hạn số lần thử
- Graceful fallback khi có lỗi

## Cấu hình

### 1. Thay đổi Publisher ID
Trong `GoogleAdScript.tsx`:
```tsx
script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID';
```

### 2. Thay đổi Ad Slot
Trong component sử dụng:
```tsx
<GoogleAd adSlot="YOUR_AD_SLOT_ID" />
```

### 3. Tùy chỉnh fallback content
```tsx
<SmartAdWrapper 
  adSlot="YOUR_AD_SLOT_ID"
  fallbackContent={
    <div className="p-4 text-center">
      <h3>Hỗ trợ website</h3>
      <p>Vui lòng tắt trình chặn quảng cáo</p>
    </div>
  }
/>
```

## Lưu ý quan trọng

1. **Không spam quảng cáo**: Chỉ hiển thị ở những vị trí phù hợp
2. **User experience**: Đảm bảo quảng cáo không làm chậm website
3. **Mobile friendly**: Quảng cáo phải responsive trên mobile
4. **Testing**: Test kỹ trên các trình duyệt khác nhau
5. **Compliance**: Tuân thủ chính sách của Google AdSense

## **Troubleshooting chi tiết**

### **Lỗi đỏ trong Network tab:**

#### 1. **CORS Policy Error**
```
Access to script at 'https://pagead2.googlesyndication.com/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**Giải pháp:**
- Đảm bảo website chạy trên HTTPS hoặc localhost
- Kiểm tra crossOrigin attribute trong script tag
- Test trên production domain thay vì localhost

#### 2. **Script Load Timeout**
```
Google AdSense script load timeout
```
**Giải pháp:**
- Kiểm tra kết nối internet
- Tăng timeout value trong GoogleAdScript.tsx
- Kiểm tra firewall/antivirus có chặn không

#### 3. **Script Load Failed**
```
Failed to load Google AdSense script
```
**Giải pháp:**
- Kiểm tra URL script có đúng không
- Kiểm tra Publisher ID
- Test trên trình duyệt khác
- Kiểm tra ad blocker

#### 4. **Ad Block Detection**
```
Quảng cáo bị chặn
```
**Giải pháp:**
- Tắt ad blocker
- Tắt uBlock Origin
- Tắt Privacy Badger
- Kiểm tra browser extensions

### **Debug steps:**

1. **Mở DevTools (F12)**
2. **Chuyển sang Console tab**
3. **Chuyển sang Network tab**
4. **Refresh trang**
5. **Quan sát các request có status đỏ**
6. **Click vào request lỗi để xem chi tiết**
7. **Kiểm tra Response và Headers**

### **Console logs để theo dõi:**

```javascript
// Logs thành công
"Google AdSense script loaded successfully"

// Logs cảnh báo
"Failed to load Google AdSense script"
"Google AdSense script load timeout"
"Error checking ad block"
"Error loading ad"

// Logs lỗi
"Error creating Google AdSense script"
```

### **Kiểm tra Network tab:**

1. **Filter by "Failed"** để chỉ hiển thị lỗi
2. **Kiểm tra Status code** (4xx, 5xx)
3. **Kiểm tra Response** để xem thông báo lỗi
4. **Kiểm tra Headers** để xem CORS issues

### **Performance issues:**

- Sử dụng SmartAdWrapper để lazy load
- Kiểm tra network tab trong DevTools
- Tối ưu hóa kích thước quảng cáo
- **Kiểm tra Waterfall chart** để xem thứ tự load

### **Mobile testing:**

- Test trên mobile browser
- Kiểm tra responsive design
- Test với mobile ad blockers
- Kiểm tra touch events
