/**
 * 22_pdf.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 printQuotePDF 相關操作。 */
function printQuotePDF(id){
  const q2=q1("SELECT q.*,c.name as cn,c.phone as cphone,c.email as cemail,c.address as caddr FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id WHERE q.id=?",[id]);
  const items=q("SELECT qi.*,s.name as sn FROM quote_items qi LEFT JOIN services s ON qi.service_id=s.id WHERE qi.quote_id=?",[id]);
  if(!q2){toast('找不到報價單','error');return;}

  const coName=getSetting('company_name','');
  const coTax=getSetting('company_tax_id','');
  const coPhone=getSetting('company_phone','');
  const coEmail=getSetting('company_email','');
  const coAddr=getSetting('company_address','');

  // PDF format settings
  const accentColor=getSetting('pdf_accent_color','#1a1a1a');
  const fontSize=getSetting('pdf_font_size','13');
  const headerStyle=getSetting('pdf_header_style','light');
  const pageMargin=getSetting('pdf_margin','normal')==='narrow'?'12mm':getSetting('pdf_margin','normal')==='wide'?'28mm':'20mm';
  const pageSize=getSetting('pdf_page_size','A4');
  const qtFooter=getSetting('pdf_qt_footer','');
  const paymentTerms=getSetting('pdf_payment_terms','');
  const signSeller=getSetting('pdf_sign_seller','報價方簽章');
  const signBuyer=getSetting('pdf_sign_buyer','客戶確認簽章');
  const extraSigns=getSetting('pdf_extra_signs','').split(',').map(s=>s.trim()).filter(Boolean);
  const sellerEnabled=getSetting('pdf_sign_seller_enabled','1')==='1';
  const buyerEnabled=getSetting('pdf_sign_buyer_enabled','1')==='1';
  const allSigns=[
    ...(sellerEnabled?[signSeller]:[]),
    ...(buyerEnabled?[signBuyer]:[]),
    ...extraSigns
  ];
  const thBg=headerStyle==='dark'?accentColor:headerStyle==='none'?'transparent':'#f0f0f0';
  const thColor=headerStyle==='dark'?'#fff':'#555';
  const thBorder=headerStyle==='dark'?accentColor:'#ddd';
  // Signature
  const sigData=getSetting('pdf_signature','');
  const sigSlot=getSetting('pdf_sig_slot','seller');
  function stampBox(label,idx){
    const showSig=sigData&&(sigSlot==='all'||(sigSlot==='seller'&&idx===0));
    return '<div class="stamp-box">'+(showSig?'<img src="'+sigData+'" style="max-width:110px;max-height:40px;display:block;margin:0 auto 4px">':'')+'<div class="stamp-line"></div>'+label+'</div>';
  }

  const html=`<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8">
<title>${q2.quote_no}_${q2.title}_${q2.date}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Noto Sans TC',sans-serif;font-size:${fontSize}px;color:#1a1a1a;background:#fff;padding:40px;}
  @page{size:${pageSize};margin:${pageMargin} ${pageMargin};}
  @media print{body{padding:0;}}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid ${accentColor};}
  .co-name{font-size:20px;font-weight:700;color:${accentColor};margin-bottom:6px;}
  .co-info{font-size:11px;color:#666;line-height:1.7;}
  .doc-title{text-align:right;}
  .doc-title h1{font-size:26px;font-weight:700;color:${accentColor};letter-spacing:2px;}
  .doc-no{font-size:12px;color:#888;margin-top:4px;font-family:monospace;}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}
  .meta-box{background:#f8f8f8;border:1px solid #e0e0e0;border-radius:6px;padding:14px 16px;}
  .meta-label{font-size:10px;color:${accentColor};letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;font-weight:600;}
  .meta-value{font-size:${fontSize}px;color:#1a1a1a;font-weight:500;}
  .meta-sub{font-size:11px;color:#666;margin-top:3px;line-height:1.6;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  thead th{background:${thBg};padding:9px 12px;text-align:left;font-size:11px;color:${thColor};font-weight:600;border-bottom:2px solid ${thBorder};}
  thead th:last-child{text-align:right;}
  tbody td{padding:10px 12px;border-bottom:1px solid #eee;font-size:${parseInt(fontSize)-0.5}px;vertical-align:top;}
  tbody td:last-child{text-align:right;font-family:monospace;}
  tbody tr:last-child td{border-bottom:none;}
  .totals{margin-left:auto;width:280px;}
  .totals table{margin-bottom:0;}
  .totals td{padding:7px 12px;font-size:${fontSize}px;}
  .totals .total-row{background:${accentColor};color:#fff;font-weight:700;font-size:${parseInt(fontSize)+1}px;}
  .totals .total-row td{padding:10px 12px;}
  .notes-box{margin-top:24px;padding:14px 16px;background:#fff9e6;border:1px solid #f0d060;border-radius:6px;}
  .notes-label{font-size:10px;font-weight:600;color:#888;letter-spacing:.5px;margin-bottom:6px;}
  .notes-text{font-size:12px;color:#555;line-height:1.6;white-space:pre-wrap;}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;font-size:11px;color:#999;}
  .validity{margin-top:20px;padding:10px 14px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:5px;font-size:12px;color:#2e7d32;}
  .payment-terms{margin-top:12px;padding:10px 14px;background:#e3f2fd;border:1px solid #90caf9;border-radius:5px;font-size:12px;color:#1565c0;}
  .stamp-area{margin-top:32px;display:flex;justify-content:flex-end;gap:${Math.max(20,Math.round(200/allSigns.length))}px;}
  .stamp-box{text-align:center;font-size:11px;color:#888;}
  .stamp-line{width:${Math.min(120,Math.round(500/allSigns.length))}px;border-top:1px solid #bbb;margin:32px auto 6px;}
</style></head><body>
  <div class="header">
    <div>
      ${coName?`<div class="co-name">${coName}</div>`:'<div class="co-name" style="color:#aaa">（公司名稱未設定）</div>'}
      <div class="co-info">
        ${coTax?`統一編號：${coTax}<br>`:''}
        ${coPhone?`電話：${coPhone}　`:''}${coEmail?`Email：${coEmail}<br>`:''}
        ${coAddr||''}
      </div>
    </div>
    <div class="doc-title">
      <h1>報 價 單</h1>
      <div class="doc-no">QUOTE NO.  ${q2.quote_no}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">報價對象</div>
      <div class="meta-value">${q2.cn||'—'}</div>
      <div class="meta-sub">${q2.cphone?'電話：'+q2.cphone+'<br>':''}${q2.cemail?'Email：'+q2.cemail+'<br>':''}${q2.caddr||''}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">報價資訊</div>
      <div class="meta-sub">
        <strong>報價日期：</strong>${q2.date||'—'}<br>
        <strong>有效期至：</strong>${q2.valid_until||'—'}<br>
        <strong>報價標題：</strong>${q2.title||'—'}
      </div>
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>服務項目說明</th><th>數量</th><th>單位</th><th>單價（未稅）</th><th>小計</th></tr></thead>
    <tbody>
      ${items.map((it,i)=>{const isSub=it.is_subitem==1;const price=Number(it.unit_price)||0;const sub=(it.qty||0)*price;const showP=price!==0;const showS=sub!==0;return`<tr style="${isSub?'background:#fafafa':''}">
        <td style="color:#999;width:30px">${isSub?'':i+1}</td>
        <td style="${isSub?'padding-left:28px;color:#888;font-size:12px':''}"><span style="${isSub?'margin-right:4px;color:#bbb':'display:none'}">└</span>${it.description||it.sn||'—'}</td>
        <td style="text-align:right;font-family:monospace;${isSub?'color:#888':''}">${it.qty}</td>
        <td style="color:${isSub?'#aaa':'#666'}">${it.unit}</td>
        <td style="font-family:monospace;${isSub?'color:#aaa':''}">${showP?'NT$ '+Number(price).toLocaleString('zh-TW'):''}</td>
        <td style="${isSub?'color:#aaa':''}">${showS?'NT$ '+Number(sub).toLocaleString('zh-TW'):''}</td>
      </tr>`;}).join('')}
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end">
    <div class="totals">
      <table>
        <tr><td style="color:#666">未稅金額</td><td style="font-family:monospace;text-align:right">NT$ ${Number(q2.total_excl||0).toLocaleString('zh-TW')}</td></tr>
        <tr><td style="color:#666">營業稅（${q2.tax_rate||5}%）</td><td style="font-family:monospace;text-align:right">NT$ ${Number(q2.tax_amount||0).toLocaleString('zh-TW')}</td></tr>
        <tr class="total-row"><td>含稅合計</td><td style="font-family:monospace;text-align:right">NT$ ${Number(q2.total||0).toLocaleString('zh-TW')}</td></tr>
      </table>
    </div>
  </div>

  ${q2.valid_until?`<div class="validity">✓ 本報價單有效期至 <strong>${q2.valid_until}</strong>，逾期請重新確認報價。</div>`:''}
  ${paymentTerms?`<div class="payment-terms">💳 付款條件：${paymentTerms}</div>`:''}
  ${q2.notes?`<div class="notes-box"><div class="notes-label">備註</div><div class="notes-text">${q2.notes}</div></div>`:''}
  ${qtFooter?`<div style="margin-top:16px;padding:10px 14px;background:#f5f5f5;border-radius:5px;font-size:11px;color:#777">${qtFooter}</div>`:''}

  <div class="stamp-area">
    ${allSigns.map((s,i)=>stampBox(s,i)).join('')}
  </div>

  <div class="footer">
    <span>此報價單由 ProjectERP 系統產生</span>
    <span>列印日期：${new Date().toLocaleDateString('zh-TW')}</span>
  </div>
</body></html>`;

  const w=window.open('','_blank','width=820,height=1000,scrollbars=yes');
  if(!w){toast('請允許彈出視窗以列印 PDF','error');return;}
  w.document.write(html);
  w.document.close();
  w.onload=()=>{w.focus();w.print();};
  toast('報價單列印視窗已開啟 ✓','success');
}