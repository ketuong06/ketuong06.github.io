// ketuong06 — API cho https://ketuong06.github.io
// Bản gốc nằm trong Apps Script project "ketuong06 click logger" (tài khoản Google của Phi).
// File này chỉ để tham khảo / version control. SHEET_ID thật KHÔNG để trong repo public.
//  • doGet : trả data sản phẩm / thông tin / outfit (JSON) cho web — Sheet giữ private
//  • doPost: ghi lượt bấm "Mua ngay" vào tab Clicks
//           + có d.action → trang quản trị nhap.html (cần ADMIN_KEY): load / save / delete / reorder / set_items / save_info / upload / clicks
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

// API công khai: chỉ trả món / outfit đang hiện (hien_thi = TRUE) và chấm gắn món giữa chúng.
// Món / outfit ẩn KHÔNG ra khỏi Apps Script — trang quản trị đọc đủ qua action 'load' (cần mật khẩu).
function getData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const out = {};
  Object.keys(TABS).forEach(k => out[k] = readTab(ss, TABS[k]));
  const on = v => /^(true|1|x|có)$/i.test(String(v).trim());
  out.products = out.products.filter(p => p.id && on(p.hien_thi));
  out.looks = out.looks.filter(o => o.id && on(o.hien_thi));
  const pids = {}, lids = {};
  out.products.forEach(p => pids[p.id] = 1);
  out.looks.forEach(o => lids[o.id] = 1);
  out.lookItems = out.lookItems.filter(i => lids[i.outfit_id] && pids[i.sp_id]);
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

/* ---------- nhap.html: trang quản trị (thay cho mở Google Sheet) ---------- */
// Mọi thao tác cần d.key === Script Property ADMIN_KEY.
const ADMIN = {
  SanPham:    {key: 'id',  bool: ['hien_thi', 'ghim'], date: ['ngay_them']},
  Outfit:     {key: 'id',  bool: ['hien_thi']},
  ThongTin:   {key: 'key'},
  OutfitItem: {key: null,  num: ['x', 'y']}
};

function admin(d) {
  const props = PropertiesService.getScriptProperties();
  const KEY = props.getProperty('ADMIN_KEY');
  if (!KEY || String(d.key || '') !== KEY) { Utilities.sleep(800); return {ok: false, error: 'Sai mật khẩu'}; }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let out;
  switch (d.action) {
    case 'check':     return {ok: true};
    case 'load':      return {ok: true, data: loadAll(ss)};
    case 'clicks':    return {ok: true, rows: readClicks(ss)};
    case 'upload':    return {ok: true, anh: uploadImage(d.image, d.name)};
    case 'save':      out = saveRow(ss, d.tab, d.row || {}, d.orig || ''); break;
    case 'delete':    out = deleteRow(ss, d.tab, d.id); break;
    case 'reorder':   out = reorder(ss, d.tab, d.ids || []); break;
    case 'set_items': out = setItems(ss, d.outfit_id, d.items || []); break;
    case 'save_info': out = saveInfo(ss, d.info || []); break;
    case 'add_product': // bản cũ của nhap.html
      if (d.image && d.image.data) (d.product = d.product || {}).anh = uploadImage(d.image, (d.product.brand || '') + ' ' + (d.product.ten || ''));
      out = saveRow(ss, 'SanPham', d.product || {}, ''); break;
    default: return {ok: false, error: 'Không rõ thao tác: ' + d.action};
  }
  CacheService.getScriptCache().remove('data');
  return out;
}

function sheetOf(ss, tab) {
  if (!ADMIN[tab]) throw new Error('Tab không cho sửa: ' + tab);
  const sh = ss.getSheetByName(tab);
  if (!sh) throw new Error('Không thấy tab ' + tab);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  return {sh: sh, head: head, cfg: ADMIN[tab]};
}

function cellOut(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return v === null ? '' : String(v).trim();
}

function readAll(ss, tab) {
  const t = sheetOf(ss, tab), tz = ss.getSpreadsheetTimeZone();
  if (t.sh.getLastRow() < 2) return {head: t.head, rows: []};
  const vals = t.sh.getRange(2, 1, t.sh.getLastRow() - 1, t.head.length).getValues();
  const rows = vals.filter(r => r.some(v => v !== '' && v !== false)).map(r => {
    const o = {}; t.head.forEach((h, i) => { if (h) o[h] = cellOut(r[i], tz); }); return o;
  });
  return {head: t.head, rows: rows};
}

function loadAll(ss) {
  const o = {};
  Object.keys(ADMIN).forEach(tab => o[tab] = readAll(ss, tab));
  return o;
}

function cellIn(cfg, h, v) {
  if ((cfg.bool || []).indexOf(h) >= 0) return v === true || /^(true|1|x|có)$/i.test(String(v).trim());
  if ((cfg.date || []).indexOf(h) >= 0) {
    const m = String(v || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : '';
  }
  if ((cfg.num || []).indexOf(h) >= 0) { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? '' : Math.round(n * 10) / 10; }
  return String(v == null ? '' : v).trim().slice(0, 2000);
}

function findRow(t, id) {
  const c = t.head.indexOf(t.cfg.key);
  if (c < 0 || t.sh.getLastRow() < 2) return -1;
  const ids = t.sh.getRange(2, c + 1, t.sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim());
  const i = ids.indexOf(String(id).trim());
  return i < 0 ? -1 : i + 2;
}

function uniqueId(t, base) {
  const c = t.head.indexOf('id');
  const ids = t.sh.getLastRow() > 1 && c >= 0 ? t.sh.getRange(2, c + 1, t.sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim()) : [];
  let id = base || 'item', n = 2;
  while (ids.indexOf(id) >= 0) id = base + '-' + n++;
  return id;
}

// Thêm (orig rỗng) hoặc sửa (orig = id cũ). Chỉ ghi các cột có trong row, cột khác giữ nguyên. id không đổi được.
function saveRow(ss, tab, row, orig) {
  const t = sheetOf(ss, tab);
  if (tab === 'SanPham' && !orig && (!String(row.ten || '').trim() || !String(row.link_mua || '').trim())) return {ok: false, error: 'Thiếu tên món hoặc link mua'};
  if (orig) {
    const r = findRow(t, orig);
    if (r < 0) return {ok: false, error: 'Không tìm thấy ' + orig + ' (có thể đã bị xoá)'};
    const vals = t.sh.getRange(r, 1, 1, t.head.length).getValues()[0];
    t.head.forEach((h, i) => { if (h && h !== t.cfg.key && h in row) vals[i] = cellIn(t.cfg, h, row[h]); });
    t.sh.getRange(r, 1, 1, t.head.length).setValues([vals]);
    return {ok: true, id: orig};
  }
  const base = slug(row.id || (tab === 'SanPham' ? (row.brand || '') + ' ' + (row.ten || '') : (row.nguoi || '') + ' ' + (row.ten || '')));
  const id = uniqueId(t, base || (tab === 'Outfit' ? 'outfit' : 'sp'));
  const v = Object.assign({}, row, {id: id});
  if (tab === 'SanPham' && !v.ngay_them) v.ngay_them = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  if (!('hien_thi' in v) && (t.cfg.bool || []).indexOf('hien_thi') >= 0) v.hien_thi = true;
  t.sh.appendRow(t.head.map(h => (h && h in v ? cellIn(t.cfg, h, v[h]) : '')));
  return {ok: true, id: id};
}

// Xoá 1 dòng; xoá món / outfit thì xoá luôn các chấm liên quan trong OutfitItem. Ảnh trên Drive giữ nguyên.
function deleteRow(ss, tab, id) {
  const t = sheetOf(ss, tab);
  const r = findRow(t, id);
  if (r < 0) return {ok: false, error: 'Không tìm thấy ' + id};
  t.sh.deleteRow(r);
  if (tab === 'SanPham' || tab === 'Outfit') {
    const col = tab === 'SanPham' ? 'sp_id' : 'outfit_id';
    filterItems(ss, it => String(it[col]).trim() !== String(id).trim(), []);
  }
  return {ok: true};
}

// Sắp lại thứ tự dòng (thứ tự trên web = thứ tự trong Sheet, món ghim vẫn lên đầu).
function reorder(ss, tab, ids) {
  const t = sheetOf(ss, tab);
  const n = t.sh.getLastRow() - 1;
  if (n < 2) return {ok: true};
  const rng = t.sh.getRange(2, 1, n, t.head.length);
  const vals = rng.getValues();
  const c = t.head.indexOf(t.cfg.key);
  const pos = {}; ids.forEach((id, i) => pos[String(id)] = i);
  const sorted = vals.map((r, i) => ({r: r, i: i, k: String(r[c]).trim()}))
    .sort((a, b) => ((a.k in pos ? pos[a.k] : 1e6 + a.i) - (b.k in pos ? pos[b.k] : 1e6 + b.i)))
    .map(o => o.r);
  rng.setValues(sorted);
  return {ok: true};
}

function filterItems(ss, keep, add) {
  const t = sheetOf(ss, 'OutfitItem');
  const n = t.sh.getLastRow() - 1;
  const vals = n > 0 ? t.sh.getRange(2, 1, n, t.head.length).getValues() : [];
  const rows = vals.filter(r => r.some(v => v !== '')).filter(r => {
    const o = {}; t.head.forEach((h, i) => o[h] = r[i]); return keep(o);
  });
  add.forEach(it => rows.push(t.head.map(h => (h in it ? cellIn(t.cfg, h, it[h]) : ''))));
  if (n > 0) t.sh.getRange(2, 1, n, t.head.length).clearContent();
  if (rows.length) t.sh.getRange(2, 1, rows.length, t.head.length).setValues(rows);
}

// Thay toàn bộ chấm của 1 outfit.
function setItems(ss, outfitId, items) {
  if (!outfitId) return {ok: false, error: 'Thiếu outfit_id'};
  const add = items.filter(it => it.sp_id).map(it => ({outfit_id: outfitId, sp_id: it.sp_id, x: it.x, y: it.y, ghi_chu: it.ghi_chu || ''}));
  filterItems(ss, it => String(it.outfit_id).trim() !== String(outfitId).trim(), add);
  return {ok: true, count: add.length};
}

function saveInfo(ss, list) {
  const t = sheetOf(ss, 'ThongTin');
  const kc = t.head.indexOf('key'), vc = t.head.indexOf('value');
  list.forEach(kv => {
    const k = String(kv.key || '').trim(); if (!k) return;
    const r = findRow(t, k);
    if (r > 0) t.sh.getRange(r, vc + 1).setValue(String(kv.value == null ? '' : kv.value).trim());
    else { const row = t.head.map(() => ''); row[kc] = k; row[vc] = String(kv.value || '').trim(); t.sh.appendRow(row); }
  });
  return {ok: true};
}

function readClicks(ss) {
  const sh = ss.getSheetByName('Clicks');
  if (!sh || sh.getLastRow() < 2) return [];
  const tz = ss.getSpreadsheetTimeZone();
  const n = sh.getLastRow() - 1, from = Math.max(2, sh.getLastRow() - 19999);
  return sh.getRange(from, 1, sh.getLastRow() - from + 1, 8).getValues()
    .filter(r => r[0] !== '')
    .map(r => [r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd HH:mm') : String(r[0])].concat(r.slice(1).map(String)));
}

function uploadImage(img, name) {
  if (!img || !img.data) throw new Error('Không có ảnh');
  const folderId = PropertiesService.getScriptProperties().getProperty('IMG_FOLDER_ID');
  if (!folderId) throw new Error('Chưa đặt IMG_FOLDER_ID trong Script Properties');
  const mime = /^image\/(jpeg|png|webp)$/.test(img.mime) ? img.mime : 'image/jpeg';
  const ext = {'image/png': '.png', 'image/webp': '.webp'}[mime] || '.jpg';
  const base = slug(name || '') || 'anh';
  const blob = Utilities.newBlob(Utilities.base64Decode(img.data), mime, base + '-' + Date.now().toString(36) + ext);
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {}
  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

const MARKS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'); // dấu tiếng Việt sau NFD
function slug(t) {
  return String(t).normalize('NFD').replace(MARKS, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// Chạy thử trong editor: xem data web nhận được
function test() {
  Logger.log(getData().slice(0, 500));
  // Chạm DriveApp để Apps Script xin quyền Drive (cần cho up ảnh từ nhap.html)
  const f = PropertiesService.getScriptProperties().getProperty('IMG_FOLDER_ID');
  Logger.log(f ? 'Folder ảnh: ' + DriveApp.getFolderById(f).getName() : 'Chưa đặt IMG_FOLDER_ID');
}
