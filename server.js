/**
 * server.js — ProjectERP 後端主程式
 * 技術棧：Node.js + Express + better-sqlite3
 * 啟動：node server.js 或 npm start
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────
// 初始化
// ─────────────────────────────────────────────
const app = express();
const PORT = 3000;

// 確保 data/ 目錄存在
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const DB_PATH = path.join(DATA_DIR, 'erp.db');

// 開啟 SQLite（WAL 模式提升效能）
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────────
// Schema 建表
// ─────────────────────────────────────────────
db.exec(`
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,email TEXT,address TEXT,contact_person TEXT,job_title TEXT,tax_id TEXT,notes TEXT,created_at TEXT DEFAULT(date('now')));
CREATE TABLE IF NOT EXISTS suppliers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,email TEXT,contact TEXT,specialty TEXT,tax_id TEXT,notes TEXT);
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT,project_no TEXT UNIQUE,title TEXT NOT NULL,customer_id INTEGER,description TEXT,status TEXT DEFAULT 'active',date TEXT,expected_date TEXT,notes TEXT,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(customer_id)REFERENCES customers(id));
CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT,unit TEXT DEFAULT '式',default_price REAL DEFAULT 0,notes TEXT);
CREATE TABLE IF NOT EXISTS quotes(id INTEGER PRIMARY KEY AUTOINCREMENT,quote_no TEXT UNIQUE,customer_id INTEGER,title TEXT,date TEXT,valid_until TEXT,status TEXT DEFAULT 'draft',version INTEGER DEFAULT 1,parent_quote_id INTEGER,converted_order_id INTEGER,converted_at TEXT,total_excl REAL DEFAULT 0,tax_rate REAL DEFAULT 5,tax_amount REAL DEFAULT 0,total REAL DEFAULT 0,notes TEXT,superseded_note TEXT,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(customer_id)REFERENCES customers(id),FOREIGN KEY(parent_quote_id)REFERENCES quotes(id));
CREATE TABLE IF NOT EXISTS quote_items(id INTEGER PRIMARY KEY AUTOINCREMENT,quote_id INTEGER,service_id INTEGER,description TEXT,qty REAL DEFAULT 1,unit TEXT DEFAULT '式',unit_price REAL,is_subitem INTEGER DEFAULT 0,FOREIGN KEY(quote_id)REFERENCES quotes(id));
CREATE TABLE IF NOT EXISTS quote_history(id INTEGER PRIMARY KEY AUTOINCREMENT,quote_id INTEGER,action TEXT NOT NULL,note TEXT,created_at TEXT DEFAULT(datetime('now','localtime')),FOREIGN KEY(quote_id)REFERENCES quotes(id));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,order_no TEXT UNIQUE,quote_id INTEGER,customer_id INTEGER,title TEXT,date TEXT,due_date TEXT,phase TEXT DEFAULT 'pending',status TEXT DEFAULT 'active',total_excl REAL DEFAULT 0,tax_rate REAL DEFAULT 5,tax_amount REAL DEFAULT 0,total REAL DEFAULT 0,deliverables TEXT DEFAULT '[]',notes TEXT,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(customer_id)REFERENCES customers(id),FOREIGN KEY(quote_id)REFERENCES quotes(id));
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,service_id INTEGER,description TEXT,qty REAL DEFAULT 1,unit TEXT DEFAULT '式',unit_price REAL,is_subitem INTEGER DEFAULT 0,FOREIGN KEY(order_id)REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS order_notes(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,content TEXT NOT NULL,author TEXT DEFAULT '負責人',created_at TEXT DEFAULT(datetime('now','localtime')),FOREIGN KEY(order_id)REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS outsource_orders(id INTEGER PRIMARY KEY AUTOINCREMENT,os_no TEXT UNIQUE,order_id INTEGER,supplier_id INTEGER,date TEXT,expected_date TEXT,status TEXT DEFAULT 'pending',total_excl REAL DEFAULT 0,tax_rate REAL DEFAULT 5,tax_amount REAL DEFAULT 0,total REAL DEFAULT 0,description TEXT,notes TEXT,quote_file_url TEXT,rfq_id INTEGER,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(order_id)REFERENCES orders(id),FOREIGN KEY(supplier_id)REFERENCES suppliers(id));
CREATE TABLE IF NOT EXISTS os_items(id INTEGER PRIMARY KEY AUTOINCREMENT,os_id INTEGER,description TEXT,qty REAL DEFAULT 1,unit TEXT DEFAULT '式',unit_price REAL,FOREIGN KEY(os_id)REFERENCES outsource_orders(id));
CREATE TABLE IF NOT EXISTS rfqs(id INTEGER PRIMARY KEY AUTOINCREMENT,rfq_no TEXT UNIQUE,order_id INTEGER,description TEXT,specs TEXT,date TEXT,deadline TEXT,status TEXT DEFAULT 'open',notes TEXT,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(order_id)REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS rfq_suppliers(id INTEGER PRIMARY KEY AUTOINCREMENT,rfq_id INTEGER,supplier_id INTEGER,FOREIGN KEY(rfq_id)REFERENCES rfqs(id),FOREIGN KEY(supplier_id)REFERENCES suppliers(id));
CREATE TABLE IF NOT EXISTS supplier_quotes(id INTEGER PRIMARY KEY AUTOINCREMENT,rfq_id INTEGER,supplier_id INTEGER,received_date TEXT,total_excl REAL DEFAULT 0,tax_rate REAL DEFAULT 5,tax_amount REAL DEFAULT 0,total REAL DEFAULT 0,lead_time_days INTEGER,file_url TEXT,notes TEXT,selected INTEGER DEFAULT 0,FOREIGN KEY(rfq_id)REFERENCES rfqs(id),FOREIGN KEY(supplier_id)REFERENCES suppliers(id));
CREATE TABLE IF NOT EXISTS receivables(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,milestone_name TEXT DEFAULT '全額付款',amount REAL,due_date TEXT,paid_date TEXT,status TEXT DEFAULT 'unpaid',FOREIGN KEY(order_id)REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS payables(id INTEGER PRIMARY KEY AUTOINCREMENT,os_id INTEGER UNIQUE,amount REAL,due_date TEXT,paid_date TEXT,status TEXT DEFAULT 'unpaid',FOREIGN KEY(os_id)REFERENCES outsource_orders(id));
CREATE TABLE IF NOT EXISTS activity_log(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,action TEXT NOT NULL,ref_id INTEGER,ref_no TEXT,ref_title TEXT,amount REAL,entity TEXT,note TEXT,created_at TEXT DEFAULT(datetime('now','localtime')));
CREATE TABLE IF NOT EXISTS phase_log(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,phase TEXT NOT NULL,entered_at TEXT DEFAULT(datetime('now','localtime')),note TEXT,FOREIGN KEY(order_id)REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
`);

// Migrations（安全執行，欄位已存在時忽略）
const migrations = [
  "ALTER TABLE receivables ADD COLUMN milestone_name TEXT DEFAULT '全額付款'",
  "ALTER TABLE orders ADD COLUMN quote_id INTEGER",
  "ALTER TABLE quotes ADD COLUMN deleted_at TEXT DEFAULT NULL",
  "ALTER TABLE quote_items ADD COLUMN is_subitem INTEGER DEFAULT 0",
  "ALTER TABLE order_items ADD COLUMN is_subitem INTEGER DEFAULT 0",
  "ALTER TABLE quotes ADD COLUMN parent_quote_id INTEGER",
  "ALTER TABLE quotes ADD COLUMN converted_order_id INTEGER",
  "ALTER TABLE quotes ADD COLUMN converted_at TEXT",
  "ALTER TABLE orders ADD COLUMN deleted_at TEXT DEFAULT NULL",
  "ALTER TABLE outsource_orders ADD COLUMN deleted_at TEXT DEFAULT NULL",
  "ALTER TABLE outsource_orders ADD COLUMN quote_file_url TEXT",
  "ALTER TABLE outsource_orders ADD COLUMN rfq_id INTEGER",
  "ALTER TABLE quotes ADD COLUMN version INTEGER DEFAULT 1",
  "ALTER TABLE quotes ADD COLUMN superseded_note TEXT",
  "ALTER TABLE customers ADD COLUMN contact_person TEXT",
  "ALTER TABLE customers ADD COLUMN job_title TEXT",
  "ALTER TABLE customers ADD COLUMN tax_id TEXT",
  "ALTER TABLE suppliers ADD COLUMN tax_id TEXT",
  "ALTER TABLE orders ADD COLUMN project_id INTEGER",
  "ALTER TABLE quotes ADD COLUMN project_id INTEGER",
  "ALTER TABLE outsource_orders ADD COLUMN project_id INTEGER",
  "ALTER TABLE rfqs ADD COLUMN project_id INTEGER",
];
migrations.forEach(sql => { try { db.exec(sql); } catch (e) { /* 欄位已存在，忽略 */ } });

// ─────────────────────────────────────────────
// 種子資料（首次啟動，資料庫為空時）
// ─────────────────────────────────────────────
function addDays(n) {
  const dt = new Date();
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
}

function getSetting(key, def = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row?.value ?? def;
}

function nextNo(type, tbl) {
  const prefix  = getSetting('prefix_' + type.toLowerCase(), type);
  const pad     = parseInt(getSetting('no_padding', '3')) || 3;
  const sep     = getSetting('no_separator', '-');
  const yearFmt = getSetting('no_year_fmt', 'YYYY');
  const yr = yearFmt === 'YYYY' ? new Date().getFullYear()
           : yearFmt === 'YY'   ? String(new Date().getFullYear()).slice(-2) : '';
  const c = db.prepare(`SELECT COUNT(*) as c FROM ${tbl}`).get().c || 0;
  const seq = String(c + 1).padStart(pad, '0');
  return yr ? `${prefix}${sep}${yr}${seq}` : `${prefix}${seq}`;
}

const customerCount = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
if (customerCount === 0 && getSetting('wiped') !== '1') {
  console.log('[Init] 建立示範資料...');
  const run = (sql, p = []) => db.prepare(sql).run(...p);
  const get = (sql, p = []) => db.prepare(sql).get(...p);

  run("INSERT INTO customers(name,phone,email,address,notes) VALUES('台灣精機股份有限公司','02-2345-6789','eng@twcnc.com','台北市內湖區','CNC零件設計圖'),('明洋工業有限公司','04-2234-5678','buy@mingyang.com','台中市工業區','客製化鈑金'),('綠能科技','03-5566-7788','rd@green.com','新竹市','PCB設計'),('捷鑄模具','06-2345-6789','mold@jetcast.com','台南市','模具開發'),('晶順電子','07-3344-5566','po@cs-elec.com','高雄市','電子組裝')");
  run("INSERT INTO suppliers(name,phone,email,contact,specialty,notes) VALUES('廣達精密加工','04-2233-4455','cnc@guangda.com','陳師傅','CNC車床','最快交期3天'),('鴻源鈑金','02-7788-9900','sheet@hongyuan.com','林業務','鈑金成形','最小100件'),('台中3D列印','04-3344-5566','print@tc3d.com','王工','SLA/FDM',''),('科技PCB','03-4455-6677','pcb@techpcb.com','陳業務','PCB製作',''),('智能設計','02-5566-7788','design@smart.com','李工','CAD/機構','可NDA')");
  run("INSERT INTO services(name,category,unit,default_price,notes) VALUES('機械零件設計圖（2D）','設計','張',8000,'含DWG'),('機械零件設計圖（3D）','設計','件',15000,'含STEP'),('模具設計','設計','套',45000,''),('電路板設計（PCB）','設計','層',20000,'雙層起'),('設計修改','設計','小時',1500,'按工時計'),('CNC加工件','加工','件',5000,'依複雜度'),('鈑金加工','加工','件',3000,'含折彎'),('3D列印樣品','加工','件',2000,'含後處理'),('顧問服務','顧問','小時',2500,''),('規格書撰寫','文件','份',8000,'')");

  run(`INSERT INTO quotes(quote_no,customer_id,title,date,valid_until,status,version,total_excl,tax_rate,tax_amount,total) VALUES('QT-2026001',1,'鋁合金支架設計報價','${addDays(-35)}','${addDays(-5)}','accepted',1,47619,5,2381,50000)`);
  const qid = db.prepare('SELECT last_insert_rowid() as id').get().id;
  run('INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)', [qid, '機械零件設計圖（2D）', 2, '張', 15000]);
  run('INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)', [qid, '規格書撰寫', 1, '份', 8000]);

  run(`INSERT INTO quotes(quote_no,customer_id,title,date,valid_until,status,version,parent_quote_id,total_excl,tax_rate,tax_amount,total) VALUES('QT-2026001-v2',1,'鋁合金支架設計報價（含 3D 加購）','${addDays(-28)}','${addDays(-3)}','accepted',2,${qid},61905,5,3095,65000)`);
  const qid2 = db.prepare('SELECT last_insert_rowid() as id').get().id;
  run('INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)', [qid2, '機械零件設計圖（2D）', 2, '張', 15000]);
  run('INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)', [qid2, '機械零件設計圖（3D）', 1, '件', 15000]);
  run('INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)', [qid2, '規格書撰寫', 1, '份', 8000]);

  run(`INSERT INTO quotes(quote_no,customer_id,title,date,valid_until,status,version,total_excl,tax_rate,tax_amount,total) VALUES('QT-2026002',3,'馬達驅動板 PCB 設計報價','${addDays(-3)}','${addDays(27)}','sent',1,38095,5,1905,40000)`);

  const ordersData = [
    { title: '鋁合金支架設計圖', cid: 1, qid: qid2, date: addDays(-30), due: addDays(5),  phase: 'delivering', excl: 61905, tax: 3095, tot: 65000, delivs: [{ text: '2D圖(DWG)', done: true }, { text: '3D模型(STEP)', done: true }, { text: '規格書(PDF)', done: false }], ms: [{ n: '訂金 30%', a: 19500, d: addDays(-28) }, { n: '尾款 70%', a: 45500, d: addDays(10) }], msPaid: [true, false] },
    { title: '控制箱鈑金外殼',   cid: 2, qid: null, date: addDays(-15), due: addDays(15), phase: 'outsourcing',excl: 28571, tax: 1429, tot: 30000, delivs: [{ text: '鈑金圖(DWG)', done: true }, { text: '加工件', done: false }], ms: [{ n: '全額付款', a: 30000, d: addDays(15) }], msPaid: [false] },
    { title: '精密模具開發',     cid: 4, qid: null, date: addDays(-45), due: addDays(-5), phase: 'completed',  excl: 85714, tax: 4286, tot: 90000, delivs: [], ms: [{ n: '訂金 30%', a: 27000, d: addDays(-40) }, { n: '完工款 70%', a: 63000, d: addDays(-6) }], msPaid: [true, true] },
    { title: '自動化結構顧問',   cid: 5, qid: null, date: addDays(-10), due: addDays(20), phase: 'reviewing',  excl: 23810, tax: 1190, tot: 25000, delivs: [{ text: '顧問報告', done: true }], ms: [{ n: '全額付款', a: 25000, d: addDays(20) }], msPaid: [false] },
  ];
  ordersData.forEach(o => {
    run('INSERT INTO orders(order_no,quote_id,customer_id,title,date,due_date,phase,status,total_excl,tax_rate,tax_amount,total,deliverables) VALUES(?,?,?,?,?,?,?,?,?,5,?,?,?)',
      [nextNo('PRJ', 'orders'), o.qid || null, o.cid, o.title, o.date, o.due, o.phase, o.phase === 'completed' ? 'completed' : 'active', o.excl, o.tax, o.tot, JSON.stringify(o.delivs)]);
    const oid = db.prepare('SELECT last_insert_rowid() as id').get().id;
    o.ms.forEach((m, i) => {
      run('INSERT INTO receivables(order_id,milestone_name,amount,due_date,status,paid_date) VALUES(?,?,?,?,?,?)',
        [oid, m.n, m.a, m.d, o.msPaid[i] ? 'paid' : 'unpaid', o.msPaid[i] ? o.date : null]);
    });
  });

  const prj1 = get("SELECT id FROM orders WHERE title='鋁合金支架設計圖'")?.id;
  if (prj1) {
    run("UPDATE quotes SET converted_order_id=?,converted_at=datetime('now','localtime') WHERE id=?", [prj1, qid2]);
    const prjNo = get("SELECT order_no FROM orders WHERE id=?", [prj1])?.order_no;
    const logH = (qId, action, note) => run("INSERT INTO quote_history(quote_id,action,note) VALUES(?,?,?)", [qId, action, note]);
    logH(qid,  'created',   '建立草稿');
    logH(qid,  'sent',      '發送給客戶');
    logH(qid,  'revised',   '客戶要求加購 3D 模型，建立 v2 修訂版');
    logH(qid2, 'created',   '修訂版本建立（繼承自 QT-2026001）');
    logH(qid2, 'sent',      '發送修訂版給客戶');
    logH(qid2, 'accepted',  '客戶接受報價');
    logH(qid2, 'converted', '轉為專案訂單 ' + prjNo);
  }
  const qt2id = get("SELECT id FROM quotes WHERE quote_no='QT-2026002'")?.id;
  if (qt2id) {
    run("INSERT INTO quote_history(quote_id,action,note) VALUES(?,?,?)", [qt2id, 'created', '建立草稿']);
    run("INSERT INTO quote_history(quote_id,action,note) VALUES(?,?,?)", [qt2id, 'sent',    '發送給客戶，等待回覆']);
  }

  const os1 = get("SELECT id FROM orders WHERE title='控制箱鈑金外殼'")?.id;
  const os2 = get("SELECT id FROM orders WHERE title='鋁合金支架設計圖'")?.id;
  if (os1) { run(`INSERT INTO outsource_orders(os_no,order_id,supplier_id,date,expected_date,status,total_excl,tax_rate,tax_amount,total,description) VALUES(?,?,?,?,?,'confirmed',9524,5,476,10000,'鈑金折彎加工')`, [nextNo('OS', 'outsource_orders'), os1, 2, addDays(-12), addDays(10)]); const osid = db.prepare('SELECT last_insert_rowid() as id').get().id; run("INSERT OR IGNORE INTO payables(os_id,amount,due_date,status) VALUES(?,?,?,'unpaid')", [osid, 10000, addDays(40)]); }
  if (os2) { run(`INSERT INTO outsource_orders(os_no,order_id,supplier_id,date,expected_date,status,total_excl,tax_rate,tax_amount,total,description) VALUES(?,?,?,?,?,'pending',14286,5,714,15000,'設計外包協助')`, [nextNo('OS', 'outsource_orders'), os2, 5, addDays(-5), addDays(15)]); const osid = db.prepare('SELECT last_insert_rowid() as id').get().id; run("INSERT OR IGNORE INTO payables(os_id,amount,due_date,status) VALUES(?,?,?,'unpaid')", [osid, 15000, addDays(45)]); }

  console.log('[Init] 示範資料建立完成');
}

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// API 路由
// ─────────────────────────────────────────────

/**
 * POST /api/query
 * 執行 SELECT，回傳所有列
 * Body: { sql: string, params: any[] }
 */
app.post('/api/query', (req, res) => {
  try {
    const { sql, params = [] } = req.body;
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (e) {
    console.error('[API/query]', e.message, req.body?.sql);
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/exec
 * 執行 INSERT/UPDATE/DELETE，回傳 lastInsertRowid
 * Body: { sql: string, params: any[] }
 */
app.post('/api/exec', (req, res) => {
  try {
    const { sql, params = [] } = req.body;
    const info = db.prepare(sql).run(...params);
    res.json({ lastId: info.lastInsertRowid, changes: info.changes });
  } catch (e) {
    console.error('[API/exec]', e.message, req.body?.sql);
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/exec-batch
 * 執行多筆 SQL，包裝於單一 Transaction 確保一致性
 * Body: { statements: [{sql, params}, ...] }
 */
app.post('/api/exec-batch', (req, res) => {
  try {
    const { statements = [] } = req.body;
    const runMany = db.transaction((stmts) => {
      let changes = 0;
      for (const st of stmts) {
        changes += db.prepare(st.sql).run(...(st.params || [])).changes;
      }
      return changes;
    });
    const changes = runMany(statements);
    res.json({ changes });
  } catch (e) {
    console.error('[API/exec-batch]', e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/export
 * 下載目前的 .db 檔案作為備份
 */
app.get('/api/export', (req, res) => {
  // WAL checkpoint 確保所有資料都寫入主檔
  db.pragma('wal_checkpoint(TRUNCATE)');
  res.download(DB_PATH, 'project-erp-backup.db');
});

/**
 * POST /api/import
 * 上傳 .db 檔案並還原（謹慎使用）
 * Body: { data: base64 string }
 */
app.post('/api/import', (req, res) => {
  try {
    const { data } = req.body;
    const buf = Buffer.from(data, 'base64');
    db.close();
    fs.writeFileSync(DB_PATH, buf);
    // 重新開啟（此方案需要重啟 server，提示使用者）
    res.json({ ok: true, message: '還原完成，請重新啟動伺服器' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/shutdown
 * 安全關閉在背景運行的伺服器
 */
app.post('/api/shutdown', (req, res) => {
  console.log('收到關閉要求，伺服器將於 1 秒後關閉...');
  res.json({ message: 'Shutting down...' });
  setTimeout(() => process.exit(0), 1000);
});

// ─────────────────────────────────────────────
// 啟動
// ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 ProjectERP Server 已啟動`);
  console.log(`   ➜  http://localhost:${PORT}`);
  console.log(`   📁 資料庫：${DB_PATH}`);
  console.log(`   (伺服器已於背景執行。若要關閉，請透過網頁設定介面 或是 Stop_ERP.bat)\n`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    // 伺服器已經在背景運行了，靜默結束，讓 start.bat 單純開啟瀏覽器即可
    console.log(`⚠️ 提示：伺服器已經在背景運行中。`);
    process.exit(0);
  } else {
    console.error('啟動發生錯誤:', e);
  }
});
