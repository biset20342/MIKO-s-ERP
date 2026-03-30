/**
 * 21_csv.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 exportQuoteHistoryCSV 相關操作。 */
function exportQuoteHistoryCSV(){
  const rows=q("SELECT qh.created_at,q.quote_no,q.version,c.name as cn,qh.action,qh.note FROM quote_history qh LEFT JOIN quotes q ON qh.quote_id=q.id LEFT JOIN customers c ON q.customer_id=c.id ORDER BY qh.id DESC");
  exportCSV('quote-history-'+today()+'.csv',['時間','報價單號','版本','客戶','動作','備註'],rows.map(r=>[r.created_at,r.quote_no,r.version,r.cn,r.action,r.note]));
}

/** 處理 exportQuotesCSV 相關操作。 */
function exportQuotesCSV(){
  const rows=q("SELECT q.quote_no,q.title,c.name as cn,q.date,q.valid_until,q.status,q.total_excl,q.tax_amount,q.total FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id ORDER BY q.date DESC");
  exportCSV('quotes-'+today()+'.csv',['報價單號','標題','客戶','日期','有效期','狀態','未稅','稅額','含稅'],rows.map(r=>[r.quote_no,r.title,r.cn,r.date,r.valid_until,r.status,r.total_excl,r.tax_amount,r.total]));
}

/** 處理 exportActivityLogCSV 相關操作。 */
function exportActivityLogCSV(){
  const rows=q("SELECT * FROM activity_log ORDER BY id DESC");
  exportCSV('activity-log-'+today()+'.csv',
    ['時間','類型','動作','單號','標題','金額','對象','備注'],
    rows.map(r=>[r.created_at,r.type,r.action,r.ref_no,r.ref_title,r.amount,r.entity,r.note])
  );
}

/** 處理 exportOrdersCSV 相關操作。 */
function exportOrdersCSV(){
  const rows=q("SELECT o.order_no,o.title,c.name as cn,o.date,o.due_date,o.phase,o.total_excl,o.tax_amount,o.total FROM orders o LEFT JOIN customers c ON o.customer_id=c.id ORDER BY o.date DESC");
  exportCSV('orders-'+today()+'.csv',['專案號','標題','客戶','建立日','截止日','階段','未稅','稅額','含稅'],rows.map(r=>[r.order_no,r.title,r.cn,r.date,r.due_date,r.phase,r.total_excl,r.tax_amount,r.total]));
}

/** 處理 exportProfitCSV 相關操作。 */
function exportProfitCSV(){
  const rows=q("SELECT o.order_no,o.title,c.name as cn,o.date,o.phase,o.total,COALESCE((SELECT SUM(os.total) FROM outsource_orders os WHERE os.order_id=o.id AND os.deleted_at IS NULL),0) as cost FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.phase NOT IN('cancelled') AND o.deleted_at IS NULL ORDER BY o.date DESC");
  exportCSV('analytics-profit-'+today()+'.csv',['專案號','標題','客戶','日期','階段','收入','委外成本','毛利','毛利率%'],rows.map(r=>{const p=r.total-r.cost;const pct=r.total>0?Math.round(p/r.total*100):0;return[r.order_no,r.title,r.cn,r.date,r.phase,r.total,r.cost,p,pct];}));
}

/** 處理 exportMonthlyCSV 相關操作。 */
function exportMonthlyCSV(){
  const months=[];const now=new Date();
  for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
  const data=months.map(m=>{
    const rev=q1("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE strftime('%Y-%m',date)=? AND phase NOT IN('cancelled') AND deleted_at IS NULL",[m])?.v||0;
    const cost=q1("SELECT COALESCE(SUM(total),0) as v FROM outsource_orders WHERE strftime('%Y-%m',date)=? AND deleted_at IS NULL",[m])?.v||0;
    return [m,rev,cost,rev-cost,rev>0?Math.round((rev-cost)/rev*100):0];
  });
  exportCSV('monthly-revenue-'+today()+'.csv',['月份','營收','成本','毛利','毛利率%'],data);
}

/** 處理 exportOSCSV 相關操作。 */
function exportOSCSV(){
  const rows=q("SELECT os.os_no,s.name as sn,os.description,o.order_no,os.date,os.expected_date,os.status,os.total_excl,os.tax_amount,os.total,os.quote_file_url FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id LEFT JOIN orders o ON os.order_id=o.id WHERE os.deleted_at IS NULL ORDER BY os.date DESC");
  exportCSV('outsource-'+today()+'.csv',['委外單號','廠商','說明','關聯專案','日期','預計完成','狀態','未稅','稅額','含稅','報價檔案連結'],rows.map(r=>[r.os_no,r.sn,r.description,r.order_no,r.date,r.expected_date,r.status,r.total_excl,r.tax_amount,r.total,r.quote_file_url]));
}

/** 處理 exportARCSV 相關操作。 */
function exportARCSV(){
  const rows=q("SELECT o.order_no,o.title,r.milestone_name,c.name as cn,r.amount,r.due_date,r.paid_date,r.status FROM receivables r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN customers c ON o.customer_id=c.id ORDER BY r.due_date ASC");
  exportCSV('receivables-'+today()+'.csv',['專案號','標題','里程碑','客戶','金額','到期日','付款日','狀態'],rows.map(r=>[r.order_no,r.title,r.milestone_name,r.cn,r.amount,r.due_date,r.paid_date,r.status]));
}

/** 處理 exportAPCSV 相關操作。 */
function exportAPCSV(){
  const rows=q("SELECT os.os_no,s.name as sn,os.description,p.amount,p.due_date,p.paid_date,p.status FROM payables p LEFT JOIN outsource_orders os ON p.os_id=os.id LEFT JOIN suppliers s ON os.supplier_id=s.id ORDER BY p.due_date ASC");
  exportCSV('payables-'+today()+'.csv',['委外單號','廠商','說明','金額','到期日','付款日','狀態'],rows.map(r=>[r.os_no,r.sn,r.description,r.amount,r.due_date,r.paid_date,r.status]));
}

/** 處理 exportCustomersCSV 相關操作。 */
function exportCustomersCSV(){exportCSV('customers-'+today()+'.csv',['名稱','統一編號','聯絡人','職稱','電話','Email','地址','備註'],q("SELECT name,tax_id,contact_person,job_title,phone,email,address,notes FROM customers").map(r=>[r.name,r.tax_id,r.contact_person,r.job_title,r.phone,r.email,r.address,r.notes]));}

/** 處理 exportSuppliersCSV 相關操作。 */
function exportSuppliersCSV(){exportCSV('suppliers-'+today()+'.csv',['名稱','統一編號','電話','Email','聯絡人','專長','備註'],q("SELECT name,tax_id,phone,email,contact,specialty,notes FROM suppliers").map(r=>[r.name,r.tax_id,r.phone,r.email,r.contact,r.specialty,r.notes]));}

/** 處理 exportServicesCSV 相關操作。 */
function exportServicesCSV(){exportCSV('services-'+today()+'.csv',['服務名稱','類別','單位','預設單價','備註'],q("SELECT name,category,unit,default_price,notes FROM services ORDER BY category,name").map(r=>[r.name,r.category,r.unit,r.default_price,r.notes]));}

/** 處理 exportAllCSV 相關操作。 */
function exportAllCSV(){
  const exportFns=[exportQuotesCSV,exportOrdersCSV,exportOSCSV,exportARCSV,exportAPCSV,exportCustomersCSV,exportSuppliersCSV,exportServicesCSV];
  let i=0;
  const next=()=>{if(i<exportFns.length){setTimeout(()=>{exportFns[i]();i++;next();},400);}};
  next();
  toast('正在依序匯出 7 個 CSV 檔案...','success');
}

/** 處理 exportCSV 相關操作。 */
function exportCSV(filename,headers,rows){
  const lines=[headers.join(','),...rows.map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(','))];
  const blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);toast('CSV 已匯出 ✓','success');
}
