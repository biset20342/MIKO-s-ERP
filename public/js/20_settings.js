/**
 * 20_settings.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 getSetting 相關操作。 */
function getSetting(key,def=''){return q1("SELECT value FROM settings WHERE key=?",[key])?.value??def;}

/** 處理 renderSettings 相關操作。 */
function renderSettings(){
  const stats={
    quotes:q1("SELECT COUNT(*) as c FROM quotes WHERE deleted_at IS NULL")?.c||0,
    orders:q1("SELECT COUNT(*) as c FROM orders WHERE deleted_at IS NULL")?.c||0,
    outsource:q1("SELECT COUNT(*) as c FROM outsource_orders WHERE deleted_at IS NULL")?.c||0,
    customers:q1("SELECT COUNT(*) as c FROM customers")?.c||0,
    suppliers:q1("SELECT COUNT(*) as c FROM suppliers")?.c||0,
    services:q1("SELECT COUNT(*) as c FROM services")?.c||0,
    receivables:q1("SELECT COUNT(*) as c FROM receivables")?.c||0,
    notes:q1("SELECT COUNT(*) as c FROM order_notes")?.c||0,
  };
  const g=k=>getSetting(k,'');
  const activeTab=window._settingsTab||'general';

  function srow(label,desc,ctrl){
    return '<div class="s-row"><div><div class="s-row-label">'+label+'</div>'+(desc?'<div class="s-row-desc">'+desc+'</div>':'')+'</div><div class="s-ctrl">'+ctrl+'</div></div>';
  }
  function sinp(id,val,ph,type){return '<input type="'+(type||'text')+'" id="'+id+'" value="'+escQ(val)+'" placeholder="'+escQ(ph||'')+'">';}
  function ssel(id,opts,cur){return '<select id="'+id+'">'+opts.map(o=>'<option value="'+o.v+'"'+(o.v===cur?' selected':'')+'>'+o.l+'</option>').join('')+'</select>';}
  const inp='padding:7px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12.5px;font-family:\'Noto Sans TC\',sans-serif;outline:none;width:100%';
  const ta=inp+';resize:vertical';

  // ─── Panel 1: 公司與使用者 ───
  const p1=
    '<div class="s-section"><div class="s-section-title">公司資訊</div>'+
    srow('公司名稱','顯示於報價單/採購單 PDF 標頭',sinp('s-coname',g('company_name'),'例：王氏設計工程有限公司'))+
    srow('統一編號','',sinp('s-cotax',g('company_tax_id'),'12345678'))+
    srow('聯絡電話','',sinp('s-cophone',g('company_phone'),'02-xxxx-xxxx'))+
    srow('Email','',sinp('s-coemail',g('company_email'),'info@company.com','email'))+
    srow('地址','',sinp('s-coaddr',g('company_address'),'縣市區路...'))+
    '</div>'+
    '<div class="s-section"><div class="s-section-title">使用者</div>'+
    srow('姓名','顯示於側邊欄與溝通紀錄作者',sinp('s-uname',g('user_name'),'王小明'))+
    srow('職稱','',sinp('s-urole',g('user_role'),'負責人'))+
    '</div>'+
    renderThemePickerHTML(g('ui_theme')||'default')+
+'</div>'+
    '<div class="s-section"><div class="s-section-title">作業預設值</div>'+
    srow('預設營業稅率','報價/訂單/委外單',ssel('s-deftax',[{v:'5',l:'5%'},{v:'0',l:'0%（免稅）'}],g('default_tax_rate')||'5'))+
    srow('報價有效天數','',sinp('s-defvalid',g('default_quote_valid_days')||'30','30')+'<span style="margin-left:5px;font-size:12px;color:var(--text3)">天</span>')+
    srow('專案截止天數','',sinp('s-defdue',g('default_project_days')||'30','30')+'<span style="margin-left:5px;font-size:12px;color:var(--text3)">天</span>')+
    srow('付款天數','',sinp('s-defpay',g('default_payment_days')||'30','30')+'<span style="margin-left:5px;font-size:12px;color:var(--text3)">天</span>')+
    srow('截止警示天數','幾天內截止顯示警示',sinp('s-alertdays',g('alert_due_days')||'3','3')+'<span style="margin-left:5px;font-size:12px;color:var(--text3)">天</span>')+
    '</div>';

  // ─── Panel 2: 編號規則 ───
  const p2=
    '<div class="s-section"><div class="s-section-title">流水號格式</div>'+
    '<div style="padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:12px;font-size:12px;display:flex;align-items:center;gap:10px">'+
    '預覽：<span id="no-preview" style="font-family:\'DM Mono\',monospace;color:var(--accent5);font-size:13px;flex:1"></span>'+
    '<button class="btn btn-ghost btn-sm" onclick="updateNoPreview()">更新預覽</button></div>'+
    srow('年份格式','',ssel('s-yr-fmt',[{v:'YYYY',l:'四位 (2026)'},{v:'YY',l:'兩位 (26)'},{v:'',l:'不含年份'}],g('no_year_fmt')||'YYYY'))+
    srow('分隔符號','',ssel('s-sep',[{v:'-',l:'連字號  -'},{v:'_',l:'底線  _'},{v:'',l:'無'}],g('no_separator')||'-'))+
    srow('流水號位數','',ssel('s-pad',[{v:'3',l:'3 位 (001)'},{v:'4',l:'4 位 (0001)'},{v:'5',l:'5 位 (00001)'}],g('no_padding')||'3'))+
    '</div>'+
    '<div class="s-section"><div class="s-section-title">各類前綴</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">專案編號</div><input type="text" id="s-pre-prj-grp" value="'+escQ(g('prefix_prj_grp')||'PRJ_GRP')+'" style="'+inp+'"></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">報價單</div><input type="text" id="s-pre-qt" value="'+escQ(g('prefix_qt')||'QT')+'" style="'+inp+'"></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">專案訂單</div><input type="text" id="s-pre-prj" value="'+escQ(g('prefix_prj')||'PRJ')+'" style="'+inp+'"></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">採購單</div><input type="text" id="s-pre-os" value="'+escQ(g('prefix_os')||'PO')+'" style="'+inp+'"></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">詢價單</div><input type="text" id="s-pre-rfq" value="'+escQ(g('prefix_rfq')||'RFQ')+'" style="'+inp+'"></div>'+
    '</div>'+
    '<div style="margin-top:10px;padding:8px 12px;background:var(--bg);border-radius:6px;font-size:11.5px;color:var(--text3)">格式：前綴 + 分隔符號 + 年份 + 流水號　範例：<span style="font-family:\'DM Mono\',monospace;color:var(--accent2)">QT-2026001</span></div>'+
    '</div>';

  // ─── Panel 3: PDF & 簽章 ───
  const sigData=g('pdf_signature');
  const sigPreview=sigData?'<img src="'+sigData+'" class="sig-img" id="sig-preview">':'<div id="sig-preview" style="font-size:11px;color:var(--text3)">尚未上傳簽名圖片</div>';
  const p3=
    '<div class="s-section"><div class="s-section-title">PDF 版面</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:4px">'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">紙張大小</div>'+ssel('s-pdf-size',[{v:'A4',l:'A4（預設）'},{v:'Letter',l:'Letter'}],g('pdf_page_size')||'A4')+'</div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">頁面邊距</div>'+ssel('s-pdf-margin',[{v:'normal',l:'標準 20mm'},{v:'narrow',l:'窄 12mm'},{v:'wide',l:'寬 28mm'}],g('pdf_margin')||'normal')+'</div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">字型大小</div>'+ssel('s-pdf-font',[{v:'12',l:'小 12px'},{v:'13',l:'中 13px'},{v:'14',l:'大 14px'}],g('pdf_font_size')||'13')+'</div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">表頭背景</div>'+ssel('s-pdf-hdr',[{v:'light',l:'淺灰'},{v:'dark',l:'深色（主色調）'},{v:'none',l:'無'}],g('pdf_header_style')||'light')+'</div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">主色調</div><div style="display:flex;gap:7px;align-items:center"><input type="color" id="s-pdf-color" value="'+(g('pdf_accent_color')||'#1a1a1a')+'" style="width:36px;height:32px;border:1px solid var(--border);border-radius:5px;background:none;cursor:pointer;padding:2px"><span style="font-size:11px;color:var(--text3)">'+(g('pdf_accent_color')||'#1a1a1a')+'</span></div></div>'+
    '</div></div>'+
    '<div class="s-section"><div class="s-section-title">內文設定</div>'+
    srow('付款條件說明','顯示於含稅合計下方',sinp('s-pdf-payment',g('pdf_payment_terms'),'例：訂金30%，尾款70%交付後30天'))+
    '<div class="s-row"><div><div class="s-row-label">報價單頁尾文字</div></div></div>'+
    '<textarea id="s-pdf-qt-footer" rows="2" style="'+ta+';margin-bottom:8px" placeholder="例：本報價單有效期內如有問題請聯繫我們">'+escQ(g('pdf_qt_footer'))+'</textarea>'+
    '<div class="s-row"><div><div class="s-row-label">採購單備注預設</div></div></div>'+
    '<textarea id="s-pdf-po-note" rows="2" style="'+ta+'" placeholder="例：請依規格書加工，如有疑問請事先確認">'+escQ(g('pdf_po_note'))+'</textarea>'+
    '</div>'+
    '<div class="s-section"><div class="s-section-title">簽章欄位設定</div>'+
    '<div style="display:flex;flex-direction:column;gap:10px">'+

    // Seller (quote)
    '<div style="padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;font-weight:500">'+
    '<input type="checkbox" id="s-sign-seller-on" '+(( g('pdf_sign_seller_enabled')||'1')==='1'?'checked':'')+' onchange="document.getElementById(\'s-sign-seller-wrap\').style.opacity=this.checked?\'1\':\'0.4\'" style="accent-color:var(--accent5);width:14px;height:14px">'+
    '顯示「報價方簽章」欄（報價單 PDF）</label>'+
    '</div>'+
    '<div id="s-sign-seller-wrap" style="opacity:'+((g('pdf_sign_seller_enabled')||'1')==='1'?'1':'0.4')+'">'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:4px">欄位文字</div>'+
    '<input type="text" id="s-sign-seller" value="'+escQ(g('pdf_sign_seller')||'報價方簽章')+'" style="'+inp+'">'+
    '</div></div>'+

    // Buyer (quote)
    '<div style="padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;font-weight:500">'+
    '<input type="checkbox" id="s-sign-buyer-on" '+((g('pdf_sign_buyer_enabled')||'1')==='1'?'checked':'')+' onchange="document.getElementById(\'s-sign-buyer-wrap\').style.opacity=this.checked?\'1\':\'0.4\'" style="accent-color:var(--accent5);width:14px;height:14px">'+
    '顯示「客戶確認簽章」欄（報價單 PDF）</label>'+
    '</div>'+
    '<div id="s-sign-buyer-wrap" style="opacity:'+((g('pdf_sign_buyer_enabled')||'1')==='1'?'1':'0.4')+'">'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:4px">欄位文字</div>'+
    '<input type="text" id="s-sign-buyer" value="'+escQ(g('pdf_sign_buyer')||'客戶確認簽章')+'" style="'+inp+'">'+
    '</div></div>'+

    // Purchaser (PO)
    '<div style="padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;font-weight:500">'+
    '<input type="checkbox" id="s-sign-purchaser-on" '+((g('pdf_sign_purchaser_enabled')||'1')==='1'?'checked':'')+' onchange="document.getElementById(\'s-sign-purchaser-wrap\').style.opacity=this.checked?\'1\':\'0.4\'" style="accent-color:var(--accent5);width:14px;height:14px">'+
    '顯示「採購方簽章」欄（採購單 PDF）</label>'+
    '</div>'+
    '<div id="s-sign-purchaser-wrap" style="opacity:'+((g('pdf_sign_purchaser_enabled')||'1')==='1'?'1':'0.4')+'">'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:4px">欄位文字</div>'+
    '<input type="text" id="s-sign-purchaser" value="'+escQ(g('pdf_sign_purchaser')||'採購方簽章')+'" style="'+inp+'">'+
    '</div></div>'+

    // Supplier (PO)
    '<div style="padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
    '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;font-weight:500">'+
    '<input type="checkbox" id="s-sign-supplier-on" '+((g('pdf_sign_supplier_enabled')||'1')==='1'?'checked':'')+' onchange="document.getElementById(\'s-sign-supplier-wrap\').style.opacity=this.checked?\'1\':\'0.4\'" style="accent-color:var(--accent5);width:14px;height:14px">'+
    '顯示「供應商確認簽章」欄（採購單 PDF）</label>'+
    '</div>'+
    '<div id="s-sign-supplier-wrap" style="opacity:'+((g('pdf_sign_supplier_enabled')||'1')==='1'?'1':'0.4')+'">'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:4px">欄位文字</div>'+
    '<input type="text" id="s-sign-supplier" value="'+escQ(g('pdf_sign_supplier')||'供應商確認簽章')+'" style="'+inp+'">'+
    '</div></div>'+

    '</div>'+
    '<div style="margin-top:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">額外簽章（逗號分隔，例：審核,監督）</div><input type="text" id="s-sign-extra" value="'+escQ(g('pdf_extra_signs'))+'" placeholder="審核,監督" style="'+inp+'"></div>'+
    '</div>'+
    '<div class="s-section"><div class="s-section-title">電子簽名圖片</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:flex-start">'+
    '<div>'+
    '<div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.6">上傳簽名圖片後，輸出 PDF 時簽章欄位將自動顯示簽名圖。建議使用白底或透明底 PNG。</div>'+
    '<label class="sig-box" title="點擊上傳簽名圖片">'+
    '<input type="file" accept="image/*" style="display:none" onchange="loadSignatureImg(this)">'+
    '<div style="font-size:13px;color:var(--text3);margin-bottom:8px">📎 點擊上傳簽名圖片</div>'+
    '<div style="font-size:11px;color:var(--text3)">支援 PNG / JPG / SVG　建議尺寸：400×100px</div>'+
    '</label>'+
    '<div style="display:flex;gap:8px;margin-top:10px">'+
    '<button class="btn btn-ghost btn-sm" onclick="clearSignature()">清除簽名</button>'+
    '</div>'+
    '</div>'+
    '<div>'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">目前簽名預覽</div>'+
    '<div style="background:white;border:1px solid var(--border);border-radius:8px;padding:12px;min-height:70px;display:flex;align-items:center;justify-content:center">'+
    sigPreview+
    '</div>'+
    '</div>'+
    '</div>'+
    '<div style="margin-top:12px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">報價單中簽章欄顯示於</div>'+
    ssel('s-sig-slot',[{v:'seller',l:'報價方欄位'},{v:'all',l:'所有欄位'}],g('pdf_sig_slot')||'seller')+
    '</div></div>'+
    '<div style="padding:10px 12px;background:var(--bg);border-radius:7px;font-size:11.5px;color:var(--text3);display:flex;align-items:center;gap:12px">'+
    '💡 按下「儲存設定」後，下次輸出 PDF 時自動套用<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="saveSettings();setTimeout(()=>previewPdfSettings(),300)">儲存並預覽 PDF</button>'+
    '</div>';

  // ─── Panel 4: 資料備份 ───
  const p4=
    '<div class="s-section"><div class="s-section-title">自動存檔狀態</div>'+
    '<div style="padding:12px 14px;background:var(--bg);border-radius:8px;border-left:3px solid var(--accent2);margin-bottom:14px;font-size:12.5px;line-height:1.9">'+
    '✅ 已啟用自動存檔<br>'+
    '每次新增或修改資料後，系統將自動寫入 <span style="font-family:\'DM Mono\',monospace;color:var(--accent5);font-size:12px">data/erp.db</span>，完全無關瀏覽器。'+
    '</div></div>'+
    '<div class="s-section"><div class="s-section-title">備份與還原</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'+
    '<button class="btn btn-primary" onclick="exportDB()" style="padding:12px 8px">💾 下載備份</button>'+
    '<button class="btn btn-ghost" onclick="importBackup()" style="padding:12px 8px">📂 從備份還原</button>'+
    '</div>'+
    '<div style="font-size:11.5px;color:var(--text3)">備份檔為 SQLite 格式（.db），可直接使用 DB Browser for SQLite 開啟。</div>'+
    '</div>'+
    '<div class="s-section"><div class="s-section-title">資料庫統計</div>'+
    '<div class="stats-grid" style="margin-bottom:12px">'+
    '<div class="stat-card"><div class="stat-card-num">'+stats.quotes+'</div><div class="stat-card-label">報價單</div></div>'+
    '<div class="stat-card"><div class="stat-card-num">'+stats.orders+'</div><div class="stat-card-label">專案訂單</div></div>'+
    '<div class="stat-card"><div class="stat-card-num">'+stats.outsource+'</div><div class="stat-card-label">採購單</div></div>'+
    '<div class="stat-card"><div class="stat-card-num">'+stats.receivables+'</div><div class="stat-card-label">應收帳款</div></div>'+
    '<div class="stat-card"><div class="stat-card-num">'+stats.customers+'</div><div class="stat-card-label">客戶</div></div>'+
    '<div class="stat-card"><div class="stat-card-num">'+stats.suppliers+'</div><div class="stat-card-label">廠商</div></div>'+
    '<div class="stat-card"><div class="stat-card-num">'+stats.services+'</div><div class="stat-card-label">服務</div></div>'+
    '<div class="stat-card"><div class="stat-card-num" style="color:var(--accent5)">'+stats.notes+'</div><div class="stat-card-label">溝通紀錄</div></div>'+
    '</div>'+
    '<button class="btn btn-ghost" style="width:100%" onclick="exportAllCSV()">↓ 一鍵匯出所有資料</button>'+
    '</div>';


  // ─── Panel 5: 危險操作 ───
  const p5=
    '<div style="padding:12px 14px;background:rgba(247,110,110,.05);border:1px solid rgba(247,110,110,.2);border-radius:8px;margin-bottom:16px;font-size:12.5px;color:var(--accent4)">'+
    '⚠️ 以下操作不可還原或將影響系統運作，請確認後再執行'+
    '</div>'+
    '<div class="danger-zone">'+
    '<div class="danger-title">SERVER MANAGEMENT</div>'+
    '<div class="danger-action"><div class="danger-action-info"><div class="danger-action-label">關閉伺服器 (Shutdown Server)</div><div class="danger-action-desc">安全地關閉在背景運作的 ERP 程式。下次需重新執行 start.bat 才能使用。</div></div><button class="btn btn-warning" onclick="shutdownServer()">關閉伺服器</button></div>'+
    '<div class="danger-title" style="margin-top:20px;border-top:1px solid rgba(247,110,110,.2);padding-top:20px">DANGER ZONE</div>'+
    '<div class="danger-action"><div class="danger-action-info"><div class="danger-action-label">刪除所有資料，讓系統完全為空</div><div class="danger-action-desc">清除所有交易明細、基本資料及系統設定。重啟伺服器後不會出現範本資料。</div></div><button class="btn btn-danger" onclick="confirmWipeEverything()">完全清空系統</button></div>'+
    '<div class="danger-action"><div class="danger-action-info"><div class="danger-action-label">刪除所有資料，但保留設定</div><div class="danger-action-desc">刪除所有業務資料及基本資料，系統設定（公司資訊、預設值）將不受影響。</div></div><button class="btn btn-danger" onclick="confirmClearAll()">刪除並保留設定</button></div>'+
    '<div class="danger-action"><div class="danger-action-info"><div class="danger-action-label">回復到原廠保留範例資料的狀態</div><div class="danger-action-desc">刪除所有資料與設定，然後立刻重新載入系統範例資料。</div></div><button class="btn btn-danger" onclick="confirmFullReset()">還原原廠範例</button></div>'+
    '</div>';

  const tabs=[
    {id:'general', icon:'🏢', label:'公司與使用者', html:p1},
    {id:'numbering',icon:'🔢', label:'編號規則',     html:p2},
    {id:'pdf',      icon:'📄', label:'PDF 與簽章',   html:p3},
    {id:'backup',   icon:'💾', label:'資料備份',     html:p4},
    {id:'danger',   icon:'⚠️', label:'危險操作',     html:p5},
  ];

  let sidebar='<div class="s-sidebar">';
  tabs.forEach((t,i)=>{
    if(t.id==='danger')sidebar+='<div class="s-tab-divider"></div>';
    sidebar+='<div class="s-tab'+(t.id===activeTab?' active':'')+'" onclick="switchSettingsTab(\''+t.id+'\')"><span class="s-tab-icon">'+t.icon+'</span>'+t.label+'</div>';
  });
  sidebar+='</div>';

  let panels='<div class="s-content">';
  tabs.forEach(t=>{
    panels+='<div class="s-panel'+(t.id===activeTab?' active':'')+'" id="stab-'+t.id+'">'+t.html+'</div>';
  });
  panels+=
    '<div class="s-save-bar">'+
    '<button class="btn btn-primary" style="padding:10px 28px;font-size:13.5px" onclick="saveSettings()">💾 儲存設定</button>'+
    '<span style="font-size:12px;color:var(--text3)" id="settings-save-msg">修改後請點儲存以套用</span>'+
    '</div>'+
    '</div>';

  return '<div class="s-wrap">'+sidebar+panels+'</div>';
}

/** 處理 saveSettings 相關操作。 */
function saveSettings(){
  const fields={
    company_name:'s-coname', company_tax_id:'s-cotax', company_phone:'s-cophone',
    company_email:'s-coemail', company_address:'s-coaddr',
    user_name:'s-uname', user_role:'s-urole',
    default_tax_rate:'s-deftax', default_quote_valid_days:'s-defvalid',
    default_project_days:'s-defdue', default_payment_days:'s-defpay', alert_due_days:'s-alertdays',
    no_year_fmt:'s-yr-fmt', no_separator:'s-sep', no_padding:'s-pad',
    prefix_qt:'s-pre-qt', prefix_prj:'s-pre-prj', prefix_os:'s-pre-os', prefix_rfq:'s-pre-rfq', prefix_prj_grp:'s-pre-prj-grp',
    pdf_page_size:'s-pdf-size', pdf_margin:'s-pdf-margin', pdf_font_size:'s-pdf-font',
    pdf_header_style:'s-pdf-hdr', pdf_accent_color:'s-pdf-color',
    pdf_qt_footer:'s-pdf-qt-footer', pdf_payment_terms:'s-pdf-payment', pdf_po_note:'s-pdf-po-note',
    pdf_sign_seller:'s-sign-seller', pdf_sign_buyer:'s-sign-buyer',
    pdf_sign_purchaser:'s-sign-purchaser', pdf_sign_supplier:'s-sign-supplier',
    pdf_extra_signs:'s-sign-extra', pdf_sig_slot:'s-sig-slot',
  };
  const oldPrefixes = {
    prefix_qt: { tbl: 'quotes', col: 'quote_no', val: getSetting('prefix_qt','QT'), atype: 'quote' },
    prefix_prj: { tbl: 'orders', col: 'order_no', val: getSetting('prefix_prj','PRJ'), atype: 'order' },
    prefix_os: { tbl: 'outsource_orders', col: 'os_no', val: getSetting('prefix_os','PO'), atype: 'outsource' },
    prefix_rfq: { tbl: 'rfqs', col: 'rfq_no', val: getSetting('prefix_rfq','RFQ'), atype: 'rfq' },
    prefix_prj_grp: { tbl: 'projects', col: 'project_no', val: getSetting('prefix_prj_grp','PRJ_GRP'), atype: null },
  };

  let saved=0;
  for(const[key,elId]of Object.entries(fields)){
    const el=document.getElementById(elId);
    if(el){
      const newVal=el.value.trim();
      const op=oldPrefixes[key];
      if(op && newVal!==op.val && newVal.length>0){
        const oldLen=op.val.length;
        if(oldLen>0){
          exec(`UPDATE ${op.tbl} SET ${op.col} = ? || SUBSTR(${op.col}, ?) WHERE ${op.col} LIKE ?`,[newVal, oldLen+1, op.val+'%']);
          if(op.atype) exec(`UPDATE activity_log SET ref_no = ? || SUBSTR(ref_no, ?) WHERE type=? AND ref_no LIKE ?`,[newVal, oldLen+1, op.atype, op.val+'%']);
        }
      }
      setSetting(key,el.value);
      saved++;
    }
  }
  // Save checkbox toggles (not in fields map since checkboxes use .checked not .value)
  ['seller','buyer','purchaser','supplier'].forEach(k=>{
    const cb=document.getElementById('s-sign-'+k+'-on');
    if(cb) setSetting('pdf_sign_'+k+'_enabled',cb.checked?'1':'0');
  });
  applyUserSettings();
  const msg=document.getElementById('settings-save-msg');
  if(msg){msg.textContent='✅ 已儲存 '+saved+' 項　'+new Date().toLocaleTimeString('zh-TW');msg.style.color='var(--accent2)';}
  toast('設定已儲存並套用 ✓','success');
  updateNoPreview();
}

/** 處理 applyTheme 相關操作。 */
function applyTheme(theme){
  document.documentElement.removeAttribute('data-theme');
  if(theme&&theme!=='default')document.documentElement.setAttribute('data-theme',theme);
  setSetting('ui_theme',theme||'default');
  toast('主題已切換','success');
  // Refresh theme picker in settings if visible
  const pickerContainer=document.getElementById('theme-picker-container');
  if(pickerContainer){
    pickerContainer.outerHTML=renderThemePickerHTML(theme||'default');
  }
}

/** 透過網頁關閉背景伺服器 */
function shutdownServer() {
  confirmDialog('確定要關閉 ERP 伺服器嗎？<br><br>關閉後您將無法使用系統，直到您再次點擊桌面的 ProjectERP 捷徑重新啟動它。', () => {
    fetch('/api/shutdown', { method: 'POST' });
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:sans-serif;background:var(--bg);color:var(--text)"><div style="font-size:40px;margin-bottom:20px">🔌</div><div style="font-size:22px;margin-bottom:8px">伺服器已離線</div><div style="font-size:14px;color:var(--text3)">您可以安全關閉本瀏覽器視窗。<br><br>若要重新使用，請再次執行桌面的 ProjectERP 捷徑。</div></div>';
  });
}