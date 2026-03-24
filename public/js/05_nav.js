/**
 * 05_nav.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 refreshBadges 相關操作。 */
function refreshBadges(){
  const qt=q1("SELECT COUNT(*) as c FROM quotes WHERE status IN('draft','sent') AND deleted_at IS NULL")?.c||0;
  const ac=q1("SELECT COUNT(*) as c FROM orders WHERE status='active' AND phase NOT IN('completed','cancelled') AND deleted_at IS NULL")?.c||0;
  const os=q1("SELECT COUNT(*) as c FROM outsource_orders WHERE status='pending' AND deleted_at IS NULL")?.c||0;
  const ar=q1("SELECT COUNT(*) as c FROM receivables WHERE status='unpaid' AND due_date<date('now')")?.c||0;
  const tr=(q1("SELECT COUNT(*) as c FROM quotes WHERE deleted_at IS NOT NULL")?.c||0)+(q1("SELECT COUNT(*) as c FROM orders WHERE deleted_at IS NOT NULL")?.c||0)+(q1("SELECT COUNT(*) as c FROM outsource_orders WHERE deleted_at IS NOT NULL")?.c||0);
  document.getElementById('badge-qt').textContent=qt;
  document.getElementById('badge-orders').textContent=ac;
  document.getElementById('badge-os').textContent=os;
  document.getElementById('badge-ar').textContent=ar;
  document.getElementById('badge-ar').style.background=ar>0?'var(--accent4)':'var(--text3)';
  document.getElementById('badge-os').style.background=os>0?'var(--accent3)':'var(--text3)';
  const rfqC=q1("SELECT COUNT(*) as c FROM rfqs WHERE status='open' AND deleted_at IS NULL")?.c||0;
  const rfqEl=document.getElementById('badge-rfq');
  if(rfqEl){rfqEl.textContent=rfqC;rfqEl.style.background=rfqC>0?'var(--accent)':'var(--text3)';}

  const tb=document.getElementById('badge-trash');
  if(tb){tb.textContent=tr;tb.style.background=tr>0?'var(--accent3)':'var(--text3)';}
}

const META={
  dashboard:{title:'儀表板',add:null,csv:null},
  quotes:{title:'報價單',add:'+ 新增報價',csv:'exportQuotesCSV'},
  quote_history:{title:'報價版本與歷史',add:null,csv:'exportQuoteHistoryCSV'},
  actlog:{title:'操作紀錄',add:null,csv:'exportActivityLogCSV'},
  orders:{title:'專案訂單',add:'+ 新增訂單',csv:'exportOrdersCSV'},
  analytics:{title:'分析與統計',add:null,csv:null},
  outsource:{title:'採購單管理',add:'+ 新增採購單',csv:'exportOSCSV'},
  rfq:{title:'詢價管理',add:'+ 新增詢價單',csv:null},
  receivables:{title:'應收帳款',add:null,csv:'exportARCSV'},
  payables:{title:'應付帳款',add:null,csv:'exportAPCSV'},
  customers:{title:'客戶管理',add:'+ 新增客戶',csv:'exportCustomersCSV'},
  suppliers:{title:'合作廠商',add:'+ 新增廠商',csv:'exportSuppliersCSV'},
  services:{title:'服務項目',add:'+ 新增服務',csv:'exportServicesCSV'},
  trash:{title:'回收桶',add:null,csv:null},
  settings:{title:'系統設定',add:null,csv:null},
};

/** 處理 go 相關操作。 */
function go(sec){
  cur=sec;
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.sec===sec));
  const m=META[sec];
  document.getElementById('tb-title').textContent=m.title;
  document.getElementById('tb-sub').textContent='ProjectERP  ·  '+today();
  const ab=document.getElementById('add-btn');const cb=document.getElementById('csv-btn');
  if(m.add){ab.style.display='';ab.textContent=m.add;}else ab.style.display='none';
  if(m.csv)cb.style.display='';else cb.style.display='none';
  refreshBadges();
  const fns={dashboard:renderDashboard,quotes:renderQuotes,quote_history:renderQuoteHistory,actlog:renderActivityLog,orders:renderOrders,analytics:renderAnalytics,rfq:renderRFQ,outsource:renderOS,receivables:renderReceivables,payables:renderPayables,customers:renderCustomers,suppliers:renderSuppliers,services:renderServices,trash:renderTrash,settings:renderSettings};
  document.getElementById('content').innerHTML=fns[sec]?.()||'';
}

/** 處理 hAdd 相關操作。 */
function hAdd(){({quotes:showAddQuote,orders:showAddOrder,rfq:showAddRFQ,outsource:showAddOS,customers:showAddCustomer,suppliers:showAddSupplier,services:showAddService})[cur]?.();}

/** 處理 hCSV 相關操作。 */
function hCSV(){const fn=META[cur]?.csv;if(fn&&window[fn])window[fn]();}