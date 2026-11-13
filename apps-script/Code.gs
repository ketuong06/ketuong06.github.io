// ketuong06 — API cho https://ketuong06.github.io
// Bản gốc nằm trong Apps Script project "ketuong06 click logger" (tài khoản Google của Phi).
// File này chỉ để tham khảo / version control. SHEET_ID thật KHÔNG để trong repo public.
//  • doGet : trả data sản phẩm / thông tin / outfit (JSON) cho web — Sheet giữ private
//  • doPost: ghi lượt bấm "Mua ngay" vào tab Clicks
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
  lock.tryLock(5000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!d.sp_id || FROM.indexOf(d.bam_tu) < 0) return ContentService.createTextOutput('skip');
    const cut = (v, n) => String(v == null ? '' : v).slice(0, n || 200);
    SpreadsheetApp.openById(SHEET_ID).getSheetByName('Clicks').appendRow([
      new Date(), cut(d.sp_id, 80), cut(d.mon), cut(d.bam_tu, 20), cut(d.outfit_id, 80),
      cut(d.nguon, 60), cut(d.thiet_bi, 20), cut(d.trang, 300)
    ]);
  } catch (err) {
    console.error(err);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

// Chạy thử trong editor: xem data web nhận được
function test() {
  Logger.log(getData().slice(0, 500));
}
