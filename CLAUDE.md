# ketuong06.github.io

Trang "Tủ đồ" của kênh TikTok **Tường Bình Thường** (@ketuong06, chủ kênh: Phi + Tường) — https://ketuong06.github.io

Static site 1 file (vanilla HTML/CSS/JS, không build, không framework), host bằng GitHub Pages (branch `main`, root, có `.nojekyll`). Push lên `main` là ~1 phút sau web cập nhật.

## Kiến trúc data

```
Google Sheet "Danh muc san pham" (PRIVATE, chỉ tài khoản Phi)
        │  SpreadsheetApp.openById
        ▼
Apps Script web app "ketuong06 click logger"   ← apps-script/Code.gs (bản tham khảo)
   GET  /exec        → JSON {products, info, looks, lookItems}   (CacheService 60s)
   GET  /exec?fresh=1 → bỏ qua cache (pin.html dùng)
   POST /exec        → ghi 1 dòng vào tab Clicks (lượt bấm "Mua ngay")
   POST /exec {action:'check'|'add_product', key} → nhap.html thêm sản phẩm (cần ADMIN_KEY)
        │
        ▼
index.html / pin.html / nhap.html  (const API_URL = '.../exec')
```

- **Sheet để private** — web và repo KHÔNG chứa Sheet ID / link Sheet. Không quay lại cách đọc gviz/CSV công khai.
- Chỉ **folder ảnh trên Drive** để "ai có link cũng xem" (ảnh hiện qua `lh3.googleusercontent.com/d/<id>=w800`, fallback `drive.google.com/thumbnail?id=..&sz=w..`). Ảnh Shopee: `down-vn.img.susercontent.com/file/<hash>` (thumb `_tn`). Ảnh dùng `referrerPolicy=no-referrer`.
- Sửa Sheet → web cập nhật sau tối đa ~1 phút (cache Apps Script 60s) + cache trình duyệt `localStorage: kt-cache-v3` (hiện cache trước, data mạng về giống thì không vẽ lại).
- `API_URL` và `TRACK_URL` là cùng một URL `/exec`.

### Apps Script
- Project **"ketuong06 click logger"** (tài khoản Google của Phi), web app: *Thực thi với tư cách: Tôi*, *Người có quyền truy cập: Bất kỳ ai*.
- `apps-script/Code.gs` trong repo = bản copy, `SHEET_ID = 'YOUR_SHEET_ID'` (placeholder, ID thật chỉ nằm trong Apps Script). Sửa code thì sửa trong editor Apps Script rồi copy ngược về repo (giữ placeholder).
- Deploy lại: **Triển khai → Quản lý bài triển khai → ✏️ sửa → Phiên bản: Phiên bản mới → Triển khai**. KHÔNG tạo "bài triển khai mới" (URL `/exec` sẽ đổi → phải sửa `API_URL` ở cả `index.html` và `pin.html`).
- `doGet` trả các cột: SanPham `id, hien_thi, nhom, nguoi, brand, ten, link_mua, anh, size_mac, ghim, ngay_them`; ThongTin `key, value`; Outfit `id, hien_thi, nguoi, ten, anh`; OutfitItem `outfit_id, sp_id, x, y`. Mọi giá trị là string (`"true"`/`"false"`, ngày `yyyy-MM-dd`). Thêm cột mới cho web → thêm vào `TABS` trong Apps Script + deploy phiên bản mới.
- `doPost` (không có `action`) chỉ nhận `bam_tu` = `tu_do` | `outfit`, ghi `[thời gian, sp_id, món, bam_tu, outfit_id, nguồn, thiết bị, trang]` vào tab Clicks.
- `doPost` có `action` → `admin()`: so `key` với Script Property `ADMIN_KEY` (sai → `{ok:false,error:'Sai mật khẩu'}`). `check` = kiểm tra mật khẩu; `add_product` = tạo id (slug không dấu từ brand + tên, trùng thì thêm `-2`, `-3`…), nếu có ảnh base64 thì lưu vào folder `IMG_FOLDER_ID` (link `drive.google.com/file/d/<id>/view`), appendRow vào SanPham theo đúng thứ tự cột dòng 1, `ngay_them` = hôm nay, rồi xoá cache `data` để web thấy ngay.
- **Script Properties** (Cài đặt dự án ⚙ → Thuộc tính tập lệnh): `ADMIN_KEY` (mật khẩu nhap.html), `IMG_FOLDER_ID` (ID folder ảnh public). Không ghi 2 giá trị này vào code hay repo. Lần đầu thêm DriveApp phải chạy hàm `test` trong editor để cấp quyền Drive.

## File
| File | Vai trò |
|---|---|
| `index.html` | Trang chính. 2 layout trong 1 file: **phone** (mặc định) và **desktop** (`@media (min-width:960px)`, lưới 4 cột ≥ 1280px) |
| `pin.html` | Tool nội bộ gắn món vào ảnh outfit: chọn outfit → bấm lên ảnh → chọn món → copy TSV `outfit_id, sp_id, x, y` (x, y = % nguyên) dán vào tab `OutfitItem`. Chọn "— Outfit mới —" thì reset trắng. Không link từ trang chính, có `noindex`. Đọc API với `?fresh=1` |
| `nhap.html` | Tool nội bộ **thêm sản phẩm không cần mở Sheet**: đăng nhập bằng `ADMIN_KEY` (lưu `localStorage: kt-admin-key`), form link mua / brand (gợi ý từ brand đã có) / nhóm / tên / ai dùng (Phi · Tường · Cả hai) / size / hiện / ghim; ảnh chọn từ máy, kéo thả hoặc dán (tự thu nhỏ ≤ 1600px JPEG) hoặc dán link ảnh; xem trước card; cảnh báo trùng link mua; danh sách món đang có + tìm. Không link từ trang chính, `noindex` |
| `apps-script/Code.gs` | Bản tham khảo code Apps Script (placeholder SHEET_ID) |
| `favicon.svg` / `favicon.ico` / `apple-touch-icon.png` / `icon-192.png` / `icon-512.png` / `icon-maskable-512.png` / `manifest.webmanifest` | Icon giỏ hàng (svg tự đổi màu theo sáng/tối) + PWA manifest |
| `og.jpg` | Ảnh chia sẻ OG/Twitter 1200×630 |

## Tính năng
- Giao diện sáng/tối: tự theo máy người xem; nút góc phải trên để chỉnh tay (`localStorage: kt-theme`).
- Profile (sidebar desktop / đầu trang phone): avatar, tên kênh, handle, bio, link TikTok/IG/YouTube, nút TikTok, dưới cùng là chữ **"Contact qua mail: <email>"** (chỉ là text, không mailto, lấy `email` trong ThongTin).
- Hàng tab: **Tủ đồ | Shop the look** (không có tab Kênh).
- Tab **Tủ đồ**:
  - Ô tìm kiếm không dấu (brand + tên + nhóm), dropdown sắp xếp **Nổi bật / Mới nhất**.
  - Lọc hàng 1: Tất cả · **Outfit** · **Khác**. `nhom` = Outfit → Outfit; mọi nhóm khác (Phụ kiện, Đồ quay, Khác…) gom vào **Khác** trên web, Sheet giữ nhóm chi tiết.
  - Chọn Outfit → hàng 2: Tất cả · Đồ Phi mặc · Đồ Tường mặc (theo cột `nguoi`; "Cả hai"/trống = hiện cả 2 bên).
  - Card: ảnh, brand, tên, nút Mua ngay, tim (lưu `localStorage: kt-saved-v2`), chia sẻ, nhãn ★ Top pick / Mới, dòng size, "Có trong outfit".
- Tab **Shop the look** — lưới ảnh outfit toàn thân (tab `Outfit`), lọc: Tất cả · Outfit của Phi · Outfit của Tường. Bấm ảnh mở overlay:
  - Desktop: ảnh giữa, card món chia 2 bên (x < 50 → trái), đường nối từ card tới chấm.
  - Phone: ảnh trên với chấm đánh số, danh sách món bên dưới; bấm chấm → cuộn tới món.
  - Link chia sẻ: `https://ketuong06.github.io/#look-<outfit_id>` (tự chuyển sang tab Shop the look). Esc / nút × / Back để đóng.
- Mở overlay từ "Có trong outfit" trên card Tủ đồ (`openLook(id, img, true)` — `keepTab`): đóng overlay thì **ở lại tab Tủ đồ, đúng vị trí cuộn cũ**, không nhảy sang Shop the look.

## Hiệu ứng (micro-interactions)
| Mã | Ở đâu | Hiệu ứng |
|---|---|---|
| 1B | Hàng tab | Nền tab trượt (`.seg-pill`) + nội dung tab fade lên (`.fx-panel`) |
| 2A + 9A | Lưới sản phẩm / outfit | Card hiện lần lượt (stagger 45ms), card dưới màn hình chỉ hiện khi cuộn tới (IntersectionObserver, `reveal()`) |
| 3A | Hover card (desktop) | Ảnh zoom 5% trong khung `.ph` |
| 4A | Bấm/chạm | Nhấn lún scale .95–.97 |
| 5A | Nút tim | Pop (phóng to → nảy) |
| 6A+ | Mở Shop the look | Ảnh bay từ lưới ra giữa (ghost img + Web Animations); món đồ fade + zoom in lần lượt. Mở từ link → fade + zoom nhẹ |
| 7A | Chấm + đường nối | Chấm bật lên lần lượt, đường nối tự vẽ (stroke-dashoffset), sau đó chấm "thở" (`.fx-live`). Đường nối chỉ vẽ sau khi animation mở xong (cờ `opening`) |
| 8A | Lúc tải | Skeleton có vệt sáng chạy (shimmer) |
| 10A | Nút sáng/tối | Icon xoay + cả trang đổi màu mượt 0.35s (`html.theme-anim`) |
| 11 | Ảnh grid + outfit | Blur-up: ảnh mờ (bản nhỏ `=w32` / `_tn`) → nét dần khi tải xong |
| 14 | "Đang hiện X món / outfit" | Số chạy từ số cũ tới số mới |
| 15 | Hàng tab | Dính lên đầu khi cuộn (`.stick`); phone hiện thêm dòng mini `@ketuong06 · TikTok ↗` |
| 16 | Nút ↑ | Hiện khi cuộn > 700px, bấm cuộn mượt lên đầu |
| 17 | Phone | Vuốt ngang vùng nội dung để chuyển tab (bỏ qua khi vuốt trên hàng lọc) |
| 18 | Phone, màn outfit | Vuốt xuống (khi đang ở đầu) để đóng |
| 19 | Màn outfit | Nút ‹ › trên header, phím ← →, vuốt ngang để qua outfit kế (theo bộ lọc Phi/Tường đang chọn); header hiện "1/3" |
| 20 | Desktop, màn outfit | Rê chuột vào chấm / card → bong bóng tên món trên chấm |
| 21 | Màn outfit | Nút copy link outfit (`#look-<id>`) + toast "Đã copy link outfit ✓" |
| 25 | Profile | Lúc mở trang: avatar, tên, handle, bio, link, nút TikTok trượt lên từng dòng |

- `prefers-reduced-motion: reduce` → tắt hết, hiện ngay.
- Data mạng giống cache → không vẽ lại (tránh chạy hiệu ứng 2 lần).
- Class hiệu ứng tự gỡ khi chạy xong (`doneAnim`) để hover/nhấn vẫn hoạt động.

## Tiện ích
| Mã | Ở đâu | Làm gì |
|---|---|---|
| 26 | Đầu trang | Mở trong TikTok / IG / Facebook / Zalo / LINE → thanh "Bạn đang xem trong X. Mở bằng trình duyệt để mua mượt hơn nha." (Android: intent Chrome; iOS: `x-safari-https://`), nút Copy link, ẩn được (sessionStorage `kt-inapp-x`) |
| 27 | `<head>` | OG + Twitter card, ảnh `og.jpg` 1200×630 |
| 28 | Bấm "Mua ngay" (Tủ đồ + overlay) | `track()` → `navigator.sendBeacon` (text/plain JSON) tới `TRACK_URL` → tab **Clicks**; tab **ThongKe** tự tổng hợp |
| 29 | Icon | favicon giỏ hàng, apple-touch-icon, manifest + icon 192/512/maskable |
| 30 | Card | Cột `size_mac`: "M" hoặc "Phi: L \| Tường: S". Chỉ hiện khi chọn Đồ Phi mặc / Đồ Tường mặc → "Phi mặc size L" / "Tường mặc size S" |
| 34 | Card | "Có trong outfit · <tên>" (ảnh nhỏ) → mở overlay Shop the look, đóng lại vẫn ở Tủ đồ |
| 35 | Card | Cột `ghim` = TRUE → nhãn ★ Top pick + luôn đứng đầu |
| 36 | Card + sắp xếp | Cột `ngay_them` (yyyy-mm-dd) → nhãn "Mới" trong 7 ngày (`NEW_DAYS`); dropdown Nổi bật / Mới nhất |
| 37 | Tủ đồ | Ô tìm kiếm không dấu |
| 38 | Profile | "Contact qua mail: <email>" — text thuần, không nút/link |
| 39 | Card | Nút chia sẻ (Web Share API, fallback copy link affiliate) |

### Đếm lượt bấm — nguồn truy cập
- Nguồn: `?src=` / `?utm_source=` → app đang mở (tiktok, instagram…) → domain referrer → `truc_tiep`. Lưu sessionStorage `kt-src`, sau đó xoá `?src`/`utm_*` khỏi thanh địa chỉ (`history.replaceState`) để link khách copy/share đi vẫn sạch.
- Gợi ý link bio: `https://ketuong06.github.io/?src=tiktok_bio`, `?src=ig_bio`.

## Google Sheet "Danh muc san pham"
| Tab | Cột (dòng 1) |
|---|---|
| SanPham | id, hien_thi, nhom, nguoi, brand, ten, link_mua, anh, size_mac, ghim, ngay_them |
| ThongTin | key, value (ten_kenh, handle, bio, avatar, tiktok, instagram, youtube, zalo, email) |
| Outfit | id, hien_thi, nguoi, ten, anh, ghi_chu |
| OutfitItem | outfit_id, sp_id, x, y, ghi_chu (x, y = % trên ảnh) |
| Clicks | thoi_gian, sp_id, mon, bam_tu, outfit_id, nguon, thiet_bi, trang (Apps Script ghi) |
| ThongKe | công thức QUERY tổng hợp theo món / nguồn / ngày / thiết bị / bấm từ (locale vi_VN → dùng `;`) |
| HuongDan | hướng dẫn điền Sheet |

- `hien_thi` = TRUE mới hiện. `anh` = link Drive (file trong folder ảnh public) hoặc link ảnh Shopee.
- Việc còn treo: điền `size_mac`; thay outfit demo `demo-tuong-jolie` bằng ảnh outfit thật rồi gắn món bằng `pin.html`.

## Rule khi chỉnh sửa
1. **Mọi chỉnh sửa giao diện phải áp dụng cho CẢ 2 phiên bản phone và desktop.** Sửa CSS/markup xong phải kiểm tra cả 2 (mobile ~375–390px và desktop ≥ 960px, thêm ≥ 1280px cho lưới 4 cột). Áp dụng cho cả `pin.html`.
2. Kiểm tra cả 2 chế độ sáng và tối.
3. Không đổi tên tab Sheet (`SanPham`, `ThongTin`, `Outfit`, `OutfitItem`, `Clicks`) hay tên cột dòng 1 (Apps Script đọc theo tên).
4. Web không hiển thị giá sản phẩm.
5. **Repo là public — không commit Sheet ID, link Google Sheet, hay bất kỳ link private nào.** Sheet chỉ được đọc qua Apps Script.
6. Đổi cấu trúc data trả về (thêm cột/tab) → sửa Apps Script + deploy phiên bản mới (giữ URL) + cập nhật `apps-script/Code.gs`; nếu đổi format cache thì tăng `CACHE_KEY` (`kt-cache-vN`).

## Test local
Không có test trong repo. Cách đã dùng: Playwright (Python, headless Chromium) mở `index.html` qua `http.server`, route-mock request `GET .../exec` trả JSON giả `{products, info, looks, lookItems}` và chặn POST tracking; chụp màn hình ở 390px, 1024px, 1280px × sáng/tối; kiểm tra không có lỗi console, bộ lọc, overlay Shop the look, keepTab, `pin.html`.
