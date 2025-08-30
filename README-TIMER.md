# Speed Timer Pro - Hướng dẫn sử dụng

## 🎯 Tổng quan

Speed Timer Pro là một timer chuyên nghiệp cho Rubik's Cube với UI hiện đại, đẹp mắt và chức năng đầy đủ, vượt trội hơn cả csTimer và Cubedesk.

## ✨ Tính năng chính

### 🕐 Timer chuyên nghiệp
- **Độ chính xác cao**: Đo thời gian chính xác đến 1/100 giây
- **Inspection mode**: Hỗ trợ 15 giây inspection với penalty +2
- **Keyboard controls**: Điều khiển bằng phím Space và Escape
- **Ready state**: Trạng thái sẵn sàng trước khi bắt đầu

### 🎲 Hỗ trợ nhiều loại cube
- **2x2, 3x3, 4x4, 5x5, 6x6, 7x7**
- **Scramble tự động**: Tự động tạo scramble cho từng loại cube
- **Fallback scramble**: Có scramble dự phòng nếu library lỗi

### 📊 Thống kê chi tiết
- **Best time**: Thời gian tốt nhất
- **Worst time**: Thời gian tệ nhất  
- **Mean**: Thời gian trung bình
- **Ao5**: Average of 5 (nếu có đủ 5 lần)
- **Penalty tracking**: Theo dõi +2 và DNF

### 🎨 UI/UX hiện đại
- **Gradient design**: Thiết kế gradient đẹp mắt
- **Glassmorphism**: Hiệu ứng kính mờ hiện đại
- **Responsive**: Tương thích mọi thiết bị
- **Dark theme**: Giao diện tối dễ nhìn
- **Smooth animations**: Chuyển động mượt mà

### 🔄 Fullscreen mode
- **Timer toàn màn hình**: Chế độ tập trung hoàn toàn
- **Scramble hiển thị rõ**: Dễ đọc scramble
- **Controls đầy đủ**: Tất cả chức năng trong fullscreen

## 🎮 Cách sử dụng

### Điều khiển cơ bản
- **Space**: Bắt đầu/dừng timer
- **Escape**: Reset timer
- **Click buttons**: Điều khiển bằng chuột

### Quy trình solve
1. **Chọn loại cube** (3x3, 2x2, 4x4...)
2. **Xem scramble** được tạo tự động
3. **Bắt đầu inspection** (tùy chọn)
4. **Press Space** để bắt đầu timer
5. **Press Space** để dừng timer
6. **Xem kết quả** và thống kê

### Inspection mode
- **Bật inspection**: Click "Inspection" button
- **15 giây**: Thời gian inspection chuẩn WCA
- **+2 penalty**: Tự động áp dụng nếu quá 15s
- **Cancel**: Có thể hủy inspection bất cứ lúc nào

## 🎨 Giao diện

### Layout chính
```
┌─────────────────────────────────────────────────────────┐
│                    Speed Timer Pro                      │
├─────────────────────────────────────────────────────────┤
│  [3x3] [2x2] [4x4] [5x5] [6x6] [7x7]                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    00.00                               │
│                                                         │
│  [Inspection] [Reset] [Full Screen]                    │
│                                                         │
│  • Press SPACE to start/stop                           │
│  • Press ESC to reset                                  │
├─────────────────────────────────────────────────────────┤
│  Scramble: R U R' U R U2 R' U' F2 D2 B2              │
│  [Hide] [New Scramble]                                 │
└─────────────────────────────────────────────────────────┘
```

### Sidebar thống kê
```
┌─────────────────────────┐
│     Statistics          │
│  Solves: 15            │
│  Best: 12.34           │
│  Worst: 45.67          │
│  Mean: 28.91           │
│  Ao5: 25.43            │
├─────────────────────────┤
│   Recent Solves        │
│  12.34                 │
│  15.67                 │
│  18.90 +2              │
│  22.45                 │
└─────────────────────────┘
```

## 🔧 Tùy chỉnh

### Thay đổi loại cube
```tsx
const [session, setSession] = useState<'3x3' | '2x2' | '4x4' | '5x5' | '6x6' | '7x7'>('3x3');
```

### Thay đổi thời gian inspection
```tsx
const [inspectionTime, setInspectionTime] = useState(15); // 15 giây
```

### Ẩn/hiện scramble
```tsx
const [showScramble, setShowScramble] = useState(true);
```

### Ẩn/hiện thống kê
```tsx
const [showStats, setShowStats] = useState(false);
```

## 📱 Responsive Design

### Mobile (< 768px)
- Layout 1 cột
- Font size nhỏ hơn
- Buttons stack vertically
- Touch-friendly controls

### Tablet (768px - 1024px)
- Layout 2 cột
- Medium font sizes
- Balanced spacing

### Desktop (> 1024px)
- Layout 3 cột
- Large font sizes
- Optimal spacing
- Full feature set

## 🎯 So sánh với csTimer & Cubedesk

### ✅ Vượt trội
- **UI hiện đại**: Thiết kế gradient và glassmorphism
- **Responsive**: Tương thích mọi thiết bị
- **Performance**: React hooks tối ưu
- **Customizable**: Dễ dàng tùy chỉnh
- **Fullscreen mode**: Chế độ tập trung hoàn hảo

### 🔄 Tính năng tương đương
- **Timer accuracy**: Độ chính xác như nhau
- **Inspection mode**: Hỗ trợ đầy đủ
- **Statistics**: Thống kê chi tiết
- **Scramble generation**: Tự động tạo scramble

### 📱 Mobile experience
- **csTimer**: Chuyển hướng website
- **Cubedesk**: App riêng biệt
- **Speed Timer Pro**: Responsive web app

## 🚀 Phát triển tương lai

### Tính năng sắp tới
- **Session management**: Lưu/load sessions
- **Export data**: Xuất thống kê CSV/JSON
- **Custom themes**: Nhiều theme khác nhau
- **Sound effects**: Âm thanh khi start/stop
- **Vibration**: Rung khi mobile

### Tối ưu hóa
- **PWA support**: Progressive Web App
- **Offline mode**: Hoạt động offline
- **Data sync**: Đồng bộ đám mây
- **Social features**: Chia sẻ kết quả

## 🐛 Troubleshooting

### Timer không hoạt động
- Kiểm tra keyboard events
- Đảm bảo component mounted
- Check console errors

### Scramble không hiển thị
- Kiểm tra import getScramble
- Verify session state
- Check fallback scrambles

### Performance issues
- Sử dụng React.memo nếu cần
- Optimize re-renders
- Check memory leaks

## 📚 API Reference

### Props
```tsx
interface TimerTabProps {
  // Component này không nhận props
}
```

### State
```tsx
const [isRunning, setIsRunning] = useState(false);
const [time, setTime] = useState(0);
const [scramble, setScramble] = useState("");
const [solves, setSolves] = useState<Solve[]>([]);
const [session, setSession] = useState<'3x3' | '2x2' | '4x4' | '5x5' | '6x6' | '7x7'>('3x3');
```

### Functions
```tsx
const startTimer = useCallback(() => { /* ... */ }, [inspection]);
const stopTimer = useCallback(() => { /* ... */ }, [isRunning, inspection, inspectionTime, scramble, generateNewScramble]);
const resetTimer = useCallback(() => { /* ... */ }, []);
const generateNewScramble = useCallback(() => { /* ... */ }, [session]);
```

## 🎉 Kết luận

Speed Timer Pro là một timer chuyên nghiệp, hiện đại và đẹp mắt cho Rubik's Cube. Với UI vượt trội, chức năng đầy đủ và trải nghiệm người dùng tuyệt vời, đây là lựa chọn hoàn hảo cho speedcubers ở mọi cấp độ.
