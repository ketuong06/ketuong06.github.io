# ketuong06.github.io

Trang "Tủ đồ" của kênh Tường Bình Thường (@ketuong06) — https://ketuong06.github.io

- `index.html`: trang chính, data đọc từ Google Sheet "Danh muc san pham" (sửa Sheet là web tự cập nhật).
- `pin.html`: tool nội bộ gắn món vào ảnh outfit (bấm lên ảnh → toạ độ → copy dán vào tab `OutfitItem`). Không link từ trang chính, có `noindex`.
- Có 2 layout trong cùng file: **phone** (mặc định) và **desktop** (`@media (min-width:960px)`).
- Giao diện sáng/tối: tự theo máy người xem; nút ở góc phải trên cùng để chỉnh tay (lưu `localStorage: kt-theme`).

## Tính năng
- Hàng tab (cả phone + desktop): **Tủ đồ | Shop the look**. Không còn tab Kênh (link kênh nằm ở profile).
- Tab **Tủ đồ** — bộ lọc 2 tầng:
  - Hàng 1: Tất cả · **Outfit** · **Khác**. `nhom` = Outfit → Outfit; mọi nhóm khác (Phụ kiện, Đồ quay, Khác…) gom vào **Khác** trên web, Sheet vẫn giữ nhóm chi tiết.
  - Chọn Outfit → hàng 2: Tất cả · Đồ Phi mặc · Đồ Tường mặc (theo cột `nguoi`; "Cả hai"/trống = hiện cả 2 bên).
- Tab **Shop the look** — lưới ảnh outfit toàn thân (tab `Outfit`), lọc: Tất cả · Outfit của Phi · Outfit của Tường. Bấm ảnh mở overlay:
  - Desktop: ảnh ở giữa, card món chia 2 bên (x < 50 → trái), đường nối từ card tới chấm trên ảnh.
  - Phone: ảnh trên với chấm đánh số, danh sách món bên dưới; bấm chấm → cuộn tới món.
  - Link chia sẻ được: `https://ketuong06.github.io/#look-<outfit_id>` (tự chuyển sang tab Shop the look). Esc / nút × / Back để đóng.

## Hiệu ứng (micro-interactions)
| Mã | Ở đâu | Hiệu ứng |
|---|---|---|
| 1B | Hàng tab | Nền tab trượt (`.seg-pill`) + nội dung tab fade lên (`.fx-panel`) |
| 2A + 9A | Lưới sản phẩm / outfit | Card hiện lần lượt (stagger 45ms), card dưới màn hình chỉ hiện khi cuộn tới (IntersectionObserver, `reveal()`) |
| 3A | Hover card (desktop) | Ảnh zoom 5% trong khung `.ph` |
| 4A | Bấm/chạm | Nhấn lún scale .95–.97 |
| 5A | Nút tim | Pop (phóng to → nảy) |
| 6A+ | Mở Shop the look | Ảnh bay từ lưới ra giữa (ghost img + Web Animations); món đồ fade + zoom in lần lượt. Mở từ link → fade + zoom nhẹ |
| 7A | Chấm + đường nối | Chấm bật lên lần lượt, đường nối tự vẽ (stroke-dashoffset), sau đó chấm "thở" (`.fx-live`) |
| 8A | Lúc tải | Skeleton có vệt sáng chạy (shimmer) |
| 10A | Nút sáng/tối | Icon xoay + cả trang đổi màu mượt 0.35s (`html.theme-anim`) |

- `prefers-reduced-motion: reduce` → tắt hết, hiện ngay.
- Data mạng giống cache → không vẽ lại (tránh chạy hiệu ứng 2 lần).
- Class hiệu ứng tự gỡ khi chạy xong (`doneAnim`) để hover/nhấn vẫn hoạt động.

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
