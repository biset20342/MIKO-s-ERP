/**
 * 07_items.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 addQItemRow 相關操作。 */
function addQItemRow(){addItemRow('order-items');}

/** 處理 addOrderItemRow 相關操作。 */
function addOrderItemRow(){addItemRow('order-items');}

/** 處理 renderItemsTable 相關操作。 */
function renderItemsTable(items){
  const rows=items.map(i=>{
    const isSub=i.is_subitem==1||i.is_subitem===true;
    const label=i.description||i.sn||'—';
    const price=Number(i.unit_price)||0;
    const subtotal=(Number(i.qty)||0)*price;
    const showPrice=price!==0;
    const showSub=subtotal!==0;
    return '<tr>'+
      '<td class="td-main" style="'+(isSub?'padding-left:22px;color:var(--text2);font-size:12px;':'')+'">'+
        (isSub?'<span style="color:var(--text3);margin-right:4px">└</span>':'')+label+
      '</td>'+
      '<td class="td-mono">'+i.qty+'</td>'+
      '<td class="td-mono">'+i.unit+'</td>'+
      '<td class="td-mono"'+(isSub?' style="color:var(--text3)"':'')+'>'+(showPrice?'$'+fmt(price):'')+'</td>'+
      '<td class="td-mono"'+(isSub?' style="color:var(--text3)"':'')+'>'+(showSub?'$'+fmt(subtotal):'')+'</td>'+
    '</tr>';
  }).join('');
  return '<table><thead><tr><th>說明</th><th>數量</th><th>單位</th><th>單價(未稅)</th><th>小計</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

/** 處理 addItemRow 相關操作。 */
function addItemRow(containerId,isSubItem=false){
  const c=document.getElementById(containerId);if(!c)return;
  const d=document.createElement('div');
  d.className='ir'+(isSubItem?' ir-sub':'');
  if(isSubItem)d.style.marginLeft='18px';
  d.dataset.sub=isSubItem?'1':'0';
  d.innerHTML=`<input type="text" class="item-desc" placeholder="${isSubItem?'子項說明':'服務說明'}" list="svc-list" oninput="onSI(this)"><input type="number" class="item-qty" value="1" min="0.01" step="0.01" oninput="recalc()"><input type="text" class="item-unit" value="式"><input type="number" class="item-price" value="0" step="0.01" oninput="recalc()"><button class="rm-btn" onclick="this.parentElement.remove();recalc()">✕</button>`;
  c.appendChild(d);
  refreshSvcDatalist();
}

/** 處理 addDelivRow 相關操作。 */
function addDelivRow(){
  const c=document.getElementById('deliv-inputs');if(!c)return;
  const d=document.createElement('div');
  d.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:5px';
  d.innerHTML=`<input type="text" class="deliv-input" placeholder="例：2D圖(DWG)、規格書(PDF)..." style="flex:1;padding:6px 9px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none"><button class="rm-btn" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(d);
}

/** 處理 onSI 相關操作。 */
function onSI(input){
  const svc=_svcs.find(s=>s.name===input.value);
  if(svc){const row=input.parentElement;row.querySelector('.item-unit').value=svc.unit;row.querySelector('.item-price').value=svc.default_price;recalc();}
}

/** 處理 recalc 相關操作。 */
function recalc(){
  let excl=0;
  document.querySelectorAll('#order-items .ir,#order-items > div').forEach(row=>{
    const qty=parseFloat(row.querySelector('.item-qty')?.value)||0;
    const price=parseFloat(row.querySelector('.item-price')?.value)||0;
    excl+=qty*price;
    const sub=row.querySelector('.ir-sub');if(sub)sub.textContent='$'+fmtN(qty*price);
  });
  const taxRate=parseFloat(document.getElementById('f-tax')?.value||5);
  const tax=Math.round(excl*taxRate)/100;
  const total=excl+tax;
  const te=document.getElementById('ts-excl');const tt=document.getElementById('ts-tax');const tto=document.getElementById('ts-total');
  if(te)te.textContent='$'+fmtN(excl);
  if(tt){tt.textContent='$'+fmtN(tax);const sp=tt.parentElement?.querySelector('span:first-child');if(sp)sp.textContent='營業稅 ('+taxRate+'%)';}
  if(tto)tto.textContent='$'+fmtN(total);
}

/** 處理 getItems 相關操作。 */
function getItems(){
  const items=[];
  document.querySelectorAll('#order-items .ir,#order-items > div').forEach(row=>{
    const desc=row.querySelector('.item-desc')?.value?.trim();
    const qty=parseFloat(row.querySelector('.item-qty')?.value)||0;
    const unit=row.querySelector('.item-unit')?.value||'式';
    const price=parseFloat(row.querySelector('.item-price')?.value)||0;
    const isSub=row.dataset.sub==='1';
    if(desc&&qty>=0)items.push({desc,qty,unit,price,isSub});
  });
  return items;
}