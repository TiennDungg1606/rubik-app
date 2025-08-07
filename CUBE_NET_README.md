# Hệ thống CubeNet Renderer

## Tổng quan
Hệ thống này được thiết kế để hiển thị lưới Rubik (cube net) cho nhiều loại cube khác nhau (2x2, 3x3, 4x4, 5x5, 6x6, 7x7) một cách linh hoạt và dễ mở rộng.

## Cấu trúc file

### 1. `lib/cubeNetRenderer.ts`
File chính chứa tất cả logic xử lý:
- **Types & Interfaces**: Định nghĩa các kiểu dữ liệu cho cube
- **CUBE_CONFIGS**: Cấu hình cho từng loại cube (kích thước, layout, grid template)
- **Rotation Functions**: Các hàm xoay mặt cho từng loại cube
- **Utility Functions**: Các hàm tiện ích để render và xử lý

### 2. `components/CubeNetModal.tsx`
Component React để hiển thị modal lưới Rubik:
- Sử dụng logic từ `cubeNetRenderer.ts`
- Hỗ trợ responsive design
- Hiển thị thông tin loại cube và scramble

## Cách sử dụng

### Import component
```typescript
import CubeNetModal from '@/components/CubeNetModal';
```

### Sử dụng trong component
```typescript
const [showCubeNet, setShowCubeNet] = useState(false);
const cubeSize = 3; // 2, 3, 4, 5, 6, 7
const scramble = "R U R' U'";

<CubeNetModal 
  scramble={scramble}
  open={showCubeNet}
  onClose={() => setShowCubeNet(false)}
  size={cubeSize}
/>
```

## Thêm loại cube mới

### 1. Cập nhật CUBE_CONFIGS
Thêm cấu hình cho loại cube mới trong `CUBE_CONFIGS`:

```typescript
8: {
  size: 8,
  faceSize: 120,
  stickerSize: 15,
  gridTemplate: 'repeat(8, 1fr)',
  layoutGrid: [
    ['', 'U', '', ''],
    ['L', 'F', 'R', 'B'],
    ['', 'D', '', ''],
  ]
}
```

### 2. Thêm hàm xoay mặt
Tạo hàm `rotateFace8x8`:

```typescript
function rotateFace8x8(face: Face, cubeState: CubeState) {
  // Implement logic xoay mặt cho 8x8
  // Cần xử lý 64 stickers (8x8)
}
```

### 3. Cập nhật hàm rotateFace
Thêm case mới:

```typescript
function rotateFace(face: Face, cubeState: CubeState, size: number) {
  switch (size) {
    // ... existing cases
    case 8:
      rotateFace8x8(face, cubeState);
      break;
    default:
      rotateFace3x3(face, cubeState);
  }
}
```

## Các hàm tiện ích

### `getCubeTypeName(size: number)`
Trả về tên loại cube: "2x2x2", "3x3x3", etc.

### `isCubeSizeSupported(size: number)`
Kiểm tra xem loại cube có được hỗ trợ không.

### `getCubeConfig(size: number)`
Lấy cấu hình cho loại cube cụ thể.

### `applyScrambleToCubeState(scramble: string, size: number)`
Áp dụng scramble vào trạng thái cube.

## Tính năng hiện tại

### ✅ Đã hỗ trợ
- 2x2x2: Hoàn chỉnh với logic xoay chính xác
- 3x3x3: Hoàn chỉnh với logic xoay chính xác
- 4x4x4: Cấu trúc cơ bản (cần hoàn thiện logic xoay)
- 5x5x5: Cấu trúc cơ bản (cần hoàn thiện logic xoay)
- 6x6x6: Cấu trúc cơ bản (cần hoàn thiện logic xoay)
- 7x7x7: Cấu trúc cơ bản (cần hoàn thiện logic xoay)

### 🔄 Cần hoàn thiện
- Logic xoay mặt cho 4x4, 5x5, 6x6, 7x7
- Xử lý center pieces cho cube chẵn (4x4, 6x6)
- Xử lý edge pieces cho cube lẻ (5x5, 7x7)

## Lưu ý kỹ thuật

1. **Fallback**: Nếu loại cube không được hỗ trợ, hệ thống sẽ fallback về 3x3x3
2. **Performance**: Logic xoay được tối ưu cho từng loại cube
3. **Extensibility**: Dễ dàng thêm loại cube mới mà không ảnh hưởng code hiện tại
4. **Type Safety**: Sử dụng TypeScript để đảm bảo type safety

## Ví dụ sử dụng nâng cao

```typescript
import { 
  getCubeConfig, 
  isCubeSizeSupported, 
  getCubeTypeName,
  applyScrambleToCubeState 
} from '@/lib/cubeNetRenderer';

// Kiểm tra hỗ trợ
if (isCubeSizeSupported(cubeSize)) {
  const config = getCubeConfig(cubeSize);
  console.log(`Đang sử dụng ${getCubeTypeName(cubeSize)}`);
  
  // Áp dụng scramble
  const cubeState = applyScrambleToCubeState(scramble, cubeSize);
}
```
