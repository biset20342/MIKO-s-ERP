/**
 * 19_trash.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 softDelete 相關操作。 */
function softDelete(table,id,label){
  confirmDialog('確定要將「'+label+'」移至回收桶嗎？可在回收桶頁面還原。',()=>{
    exec('UPDATE '+table+" SET deleted_at=datetime('now','localtime') WHERE id=?",[id]);
    // 刪除專案時，一併刪除關聯的應收帳款
    if(table==='orders'){
      exec("DELETE FROM receivables WHERE order_id=?",[id]);
    }
    toast('「'+label+'」已移至回收桶','success');go(cur);
  });
}

/** 處理 renderTrash 相關操作。 */
function renderTrash(){
  const delQuotes=q("SELECT q.*,c.name as cn FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id WHERE q.deleted_at IS NOT NULL ORDER BY q.deleted_at DESC");
  const delOrders=q("SELECT o.*,c.name as cn FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.deleted_at IS NOT NULL ORDER BY o.deleted_at DESC");
  const delOS=q("SELECT os.*,s.name as sn FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id WHERE os.deleted_at IS NOT NULL ORDER BY os.deleted_at DESC");
  const total=delQuotes.length+delOrders.length+delOS.length;

  if(total===0) return '<div class="panel"><div style="text-align:center;padding:48px 20px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">🗑️</div><div style="font-size:14px;font-weight:500;margin-bottom:6px;color:var(--text2)">回收桶是空的</div><div style="font-size:12px">刪除的報價單、專案訂單、委外單會在這裡保留</div></div></div>';

  function trashRows(rows, tbl, labelFn){
    return rows.map(r=>{
      const label=r.quote_no||r.order_no||r.os_no||'';
      return '<tr class="deleted-row">'+labelFn(r)+
        '<td class="td-mono" style="font-size:11px">'+(r.deleted_at||'')+'</td>'+
        '<td><div class="td-actions">'+
        '<button class="btn btn-sm btn-convert" onclick="restoreFromTrash(\''+tbl+'\','+r.id+')">還原</button>'+
        '<button class="btn btn-sm btn-danger" onclick="permanentDelete(\''+tbl+'\','+r.id+',\''+label.replace(/'/g,'')+'\')">永久刪除</button>'+
        '</div></td></tr>';
    }).join('');
  }

  function trashSection(title,icon,rows,tbl,headers,labelFn){
    if(!rows.length)return '';
    return '<div class="trash-section">'+
      '<div class="trash-section-title">'+icon+' '+title+'（'+rows.length+' 筆）</div>'+
      '<table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'<th>移至回收桶時間</th><th>操作</th></tr></thead>'+
      '<tbody>'+trashRows(rows,tbl,labelFn)+'</tbody></table></div>';
  }

  return '<div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">'+
    '<div style="font-size:12px;color:var(--text3)">回收桶中的項目可以還原，或選擇永久刪除。</div>'+
    (total>0?'<button class="btn btn-danger btn-sm" onclick="emptyTrash()">清空回收桶</button>':'')+
    '</div>'+
    '<div class="panel" style="overflow:visible">'+
    trashSection('報價單','📋',delQuotes,'quotes',['報價單號','標題','客戶'],r=>'<td class="td-mono td-main">'+r.quote_no+'</td><td>'+(r.title||'—')+'</td><td>'+(r.cn||'—')+'</td>')+
    trashSection('專案訂單','📁',delOrders,'orders',['專案號','標題','客戶'],r=>'<td class="td-mono td-main">'+r.order_no+'</td><td>'+(r.title||'—')+'</td><td>'+(r.cn||'—')+'</td>')+
    trashSection('委外單','🏭',delOS,'outsource_orders',['委外單號','說明','廠商'],r=>'<td class="td-mono td-main">'+r.os_no+'</td><td>'+(r.description||'—')+'</td><td>'+(r.sn||'—')+'</td>')+
    '</div>';
}

/** 處理 permanentDelete 相關操作。 */
function permanentDelete(table,id,label){
  openDangerModal('永久刪除「'+label+'」',
    '此操作將從資料庫中<strong>永久移除</strong>此筆資料，無法還原。',
    'PERM-DELETE',
    ()=>{exec('DELETE FROM '+table+' WHERE id=?',[id]);toast('已永久刪除','success');go(cur);}
  );
}