# ketuong06.github.io

Trang "Tủ đồ" của kênh Tường Bình Thường (@ketuong06) — https://ketuong06.github.io

- Một file `index.html`, data đọc từ Google Sheet "Danh muc san pham" (sửa Sheet là web tự cập nhật).
- Có 2 layout trong cùng file: **phone** (mặc định) và **desktop** (`@media (min-width:960px)`).
- Giao diện sáng/tối: tự theo máy người xem; nút ở góc phải trên cùng để chỉnh tay (lưu `localStorage: kt-theme`).

## Rule khi chỉnh sửa
1. **Mọi chỉnh sửa giao diện phải áp dụng cho CẢ 2 phiên bản phone và desktop.** Sửa CSS/markup xong phải kiểm tra lại cả 2 (mobile ~375–390px và desktop ≥ 960px, thêm ≥ 1280px cho lưới 4 cột).
2. Kiểm tra cả 2 chế độ sáng và tối.
3. Không đổi tên tab Sheet (`SanPham`, `ThongTin`) hay tên cột dòng 1.
4. Web không hiển thị giá sản phẩm.
