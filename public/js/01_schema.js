/**
 * 01_schema.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

const SCHEMA=`
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,email TEXT,address TEXT,contact_person TEXT,job_title TEXT,tax_id TEXT,notes TEXT,created_at TEXT DEFAULT(date('now')));
CREATE TABLE IF NOT EXISTS suppliers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,email TEXT,contact TEXT,specialty TEXT,tax_id TEXT,notes TEXT);
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY AUTOINCREMENT,project_no TEXT UNIQUE,title TEXT NOT NULL,customer_id INTEGER,description TEXT,status TEXT DEFAULT 'active',date TEXT,expected_date TEXT,notes TEXT,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(customer_id)REFERENCES customers(id));
CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT,unit TEXT DEFAULT '式',default_price REAL DEFAULT 0,notes TEXT);
CREATE TABLE IF NOT EXISTS quotes(id INTEGER PRIMARY KEY AUTOINCREMENT,quote_no TEXT UNIQUE,customer_id INTEGER,title TEXT,date TEXT,valid_until TEXT,status TEXT DEFAULT 'draft',version INTEGER DEFAULT 1,parent_quote_id INTEGER,converted_order_id INTEGER,converted_at TEXT,total_excl REAL DEFAULT 0,tax_rate REAL DEFAULT 5,tax_amount REAL DEFAULT 0,total REAL DEFAULT 0,notes TEXT,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(customer_id)REFERENCES customers(id),FOREIGN KEY(parent_quote_id)REFERENCES quotes(id));
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
CREATE TABLE IF NOT EXISTS phase_log(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,phase TEXT NOT NULL,entered_at TEXT,note TEXT,FOREIGN KEY(order_id)REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
`;