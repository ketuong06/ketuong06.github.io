# ketuong06.github.io

Trang "Tủ đồ" của kênh Tường Bình Thường (@ketuong06) — https://ketuong06.github.io

- `index.html`: trang chính, data đọc từ Google Sheet "Danh muc san pham" (sửa Sheet là web tự cập nhật).
- `pin.html`: tool nội bộ gắn món vào ảnh outfit (bấm lên ảnh → toạ độ → copy dán vào tab `OutfitItem`). Không link từ trang chính, có `noindex`.
- Có 2 layout trong cùng file: **phone** (mặc định) và **desktop** (`@media (min-width:960px)`).
- Giao diện sáng/tối: tự theo máy người xem; nút ở góc phải trên cùng để chỉnh tay (lưu `localStorage: kt-theme`).

## Tính năng
- Bộ lọc 2 tầng: hàng 1 theo `nhom` (Outfit luôn đứng đầu); chọn **Outfit** thì hiện hàng 2: Tất cả · Đồ Phi mặc · Đồ Tường mặc (theo cột `nguoi`; "Cả hai"/trống = hiện cả 2 bên).
- **Shop the look**: trong mục Outfit có hàng ảnh outfit toàn thân (tab `Outfit`). Bấm ảnh mở overlay:
  - Desktop: ảnh ở giữa, card món chia 2 bên (x < 50 → trái), đường nối từ card tới chấm trên ảnh.
  - Phone: ảnh trên với chấm đánh số, danh sách món bên dưới; bấm chấm → cuộn tới món.
  - Link chia sẻ được: `https://ketuong06.github.io/#look-<outfit_id>`. Esc / nút × / Back để đóng.

## Sheet
| Tab | Cột |
|---|---|
| SanPham | id, hien_thi, nhom, nguoi, brand, ten, link_mua, anh |
| ThongTin | key, value (ten_kenh, handle, bio, avatar, tiktok, instagram, youtube, zalo) |
| Outfit | id, hien_thi, nguoi, ten, anh, ghi_chu |
| OutfitItem | outfit_id, sp_id, x, y, ghi_chu (x, y = % trên ảnh) |

## Rule khi chỉnh sửa
1. **Mọi chỉnh sửa giao diện phải áp dụng cho CẢ 2 phiên bản phone và desktop.** Sửa CSS/markup xong phải kiểm tra lại cả 2 (mobile ~375–390px và desktop ≥ 960px, thêm ≥ 1280px cho lưới 4 cột). Áp dụng cho cả `pin.html`.
2. Kiểm tra cả 2 chế độ sáng và tối.
3. Không đổi tên tab Sheet (`SanPham`, `ThongTin`, `Outfit`, `OutfitItem`) hay tên cột dòng 1.
4. Web không hiển thị giá sản phẩm.
