// ketuong06 — API cho https://ketuong06.github.io
// Bản gốc nằm trong Apps Script project "ketuong06 click logger" (tài khoản Google của Phi).
// File này chỉ để tham khảo / version control. SHEET_ID thật KHÔNG để trong repo public.
//  • doGet : trả data sản phẩm / thông tin / outfit (JSON) cho web — Sheet giữ private
//  • doPost: ghi lượt bấm "Mua ngay" vào tab Clicks
//           + action "check" / "add_product" cho trang nhap.html (cần ADMIN_KEY)
// Script Properties (Cài đặt dự án → Thuộc tính tập lệnh), KHÔNG để trong code:
//  • ADMIN_KEY     : mật khẩu trang nhap.html
//  • IMG_FOLDER_ID : ID folder ảnh public trên Drive (ảnh up từ nhap.html lưu vào đây)
const SHEET_ID = 'YOUR_SHEET_ID'; // ← điền ID Google Sheet "Danh muc san pham" (chỉ trong Apps Script)
const FROM = ['tu_do', 'outfit'];
const CACHE_SEC = 60; // sửa Sheet → web cập nhật sau tối đa ~1 phút
const TABS = {
  products:  {name: 'SanPham',    cols: ['id','hien_thi','nhom','nguoi','brand','ten','link_mua','anh','size_mac','ghim','ngay_them']},
  info:      {name: 'ThongTin',   cols: ['key','value']},
  looks:     {name: 'Outfit',     cols: ['id','hien_thi','nguoi','ten','anh']},
  lookItems: {name: 'OutfitItem', cols: ['outfit_id','sp_id','x','y']}
};

function readTab(ss, t) {
  const sh = ss.getSheetByName(t.name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const head = vals.shift().map(h => String(h).trim().toLowerCase());
  const tz = ss.getSpreadsheetTimeZone();
  return vals
    .filter(r => r.some(v => v !== '' && v !== false))
    .map(r => {
      const o = {};
      t.cols.forEach(c => {
        const i = head.indexOf(c);
        let v = i < 0 ? '' : r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        o[c] = v === null ? '' : String(v).trim();
      });
      return o;
    })
    .filter(o => Object.values(o).some(v => v !== '' && v !== 'false'));
}

function getData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const out = {};
  Object.keys(TABS).forEach(k => out[k] = readTab(ss, TABS[k]));
  return JSON.stringify(out);
}

function doGet(e) {
  const cache = CacheService.getScriptCache();
  const fresh = e && e.parameter && e.parameter.fresh;
  let json = fresh ? null : cache.get('data');
  if (!json) {
    json = getData();
    try { cache.put('data', json, CACHE_SEC); } catch (err) {}
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.action) return json(admin(d));
    if (!d.sp_id || FROM.indexOf(d.bam_tu) < 0) return ContentService.createTextOutput('skip');
    const cut = (v, n) => String(v == null ? '' : v).slice(0, n || 200);
    SpreadsheetApp.openById(SHEET_ID).getSheetByName('Clicks').appendRow([
      new Date(), cut(d.sp_id, 80), cut(d.mon), cut(d.bam_tu, 20), cut(d.outfit_id, 80),
      cut(d.nguon, 60), cut(d.thiet_bi, 20), cut(d.trang, 300)
    ]);
  } catch (err) {
    console.error(err);
    return json({ok: false, error: String(err && err.message || err)});
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- nhap.html: thêm sản phẩm không cần mở Sheet ---------- */
function admin(d) {
  const props = PropertiesService.getScriptProperties();
  const KEY = props.getProperty('ADMIN_KEY');
  if (!KEY || String(d.key || '') !== KEY) { Utilities.sleep(800); return {ok: false, error: 'Sai mật khẩu'}; }
  if (d.action === 'check') return {ok: true};
  if (d.action !== 'add_product') return {ok: false, error: 'Không rõ thao tác'};

  const p = d.product || {};
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 300);
  if (!s(p.ten) || !s(p.link_mua)) return {ok: false, error: 'Thiếu tên món hoặc link mua'};
  if (!(d.image && d.image.data) && !s(p.anh)) return {ok: false, error: 'Thiếu ảnh'};

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('SanPham');
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  const idCol = head.indexOf('id');
  const ids = sh.getLastRow() > 1 && idCol >= 0
    ? sh.getRange(2, idCol + 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim())
    : [];
  const base = slug(s(p.id) || (s(p.brand) + ' ' + s(p.ten))) || 'sp';
  let id = base, n = 2;
  while (ids.indexOf(id) >= 0) id = base + '-' + n++;

  let anh = s(p.anh, 1000);
  if (d.image && d.image.data) {
    const folderId = props.getProperty('IMG_FOLDER_ID');
    if (!folderId) return {ok: false, error: 'Chưa đặt IMG_FOLDER_ID trong Script Properties'};
    const mime = /^image\//.test(d.image.mime) ? d.image.mime : 'image/jpeg';
    const blob = Utilities.newBlob(Utilities.base64Decode(d.image.data), mime, id + (mime === 'image/png' ? '.png' : '.jpg'));
    const file = DriveApp.getFolderById(folderId).createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {}
    anh = 'https://drive.google.com/file/d/' + file.getId() + '/view';
  }

  const now = new Date();
  const val = {
    id: id,
    hien_thi: p.hien_thi !== false,
    nhom: s(p.nhom, 40) || 'Outfit',
    nguoi: s(p.nguoi, 40),
    brand: s(p.brand, 80),
    ten: s(p.ten, 200),
    link_mua: s(p.link_mua, 1000),
    anh: anh,
    size_mac: s(p.size_mac, 80),
    ghim: p.ghim === true,
    ngay_them: new Date(now.getFullYear(), now.getMonth(), now.getDate())
  };
  sh.appendRow(head.map(h => (h in val ? val[h] : '')));
  CacheService.getScriptCache().remove('data');
  return {ok: true, id: id, anh: anh};
}

function slug(t) {
  return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// Chạy thử trong editor: xem data web nhận được
function test() {
  Logger.log(getData().slice(0, 500));
  // Chạm DriveApp để Apps Script xin quyền Drive (cần cho up ảnh từ nhap.html)
  const f = PropertiesService.getScriptProperties().getProperty('IMG_FOLDER_ID');
  Logger.log(f ? 'Folder ảnh: ' + DriveApp.getFolderById(f).getName() : 'Chưa đặt IMG_FOLDER_ID');
}
