// Thêm khai báo cho biến window.stringeeLoaded để tránh lỗi TS khi dùng onLoad script Stringee
declare global {
  interface Window {
    stringeeLoaded?: boolean;
  }
}
declare module "scrambler";
declare module "simple-peer";
