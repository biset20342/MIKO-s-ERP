/**
 * 02_db.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

let db,SQL,cur='dashboard';

let _svcs=[],_custs=[],_supps=[];

const _sort={};

/** 處理 getSort 相關操作。 */
function getSort(sec,defCol,defDir='desc'){
  if(!_sort[sec])_sort[sec]={col:defCol,dir:defDir};
  return _sort[sec];
}

/** 處理 setSort 相關操作。 */
function setSort(sec,col){
  const s=getSort(sec,col);
  if(s.col===col)s.dir=s.dir==='asc'?'desc':'asc';
  else{s.col=col;s.dir='asc';}
  // re-render current section
  const fns={quotes:renderQuotes,orders:renderOrders,analytics:renderAnalytics,outsource:renderOS,receivables:renderReceivables,payables:renderPayables,quote_history:renderQuoteHistory,actlog:renderActivityLog};
  if(fns[sec])document.getElementById('content').innerHTML=fns[sec]()||'';
}

/** 處理 sortArr 相關操作。 */
function sortArr(arr,col,dir){
  const isDateCol=/(date|_at|_on)$/i.test(col);
  return [...arr].sort((a,b)=>{
    let av=a[col]??'', bv=b[col]??'';
    // Date columns: compare as strings (ISO YYYY-MM-DD sorts correctly lexicographically)
    if(isDateCol){
      av=String(av); bv=String(bv);
    } else if(typeof av==='number'||typeof bv==='number'||(!isNaN(+av)&&av!==''&&!String(av).includes('-'))){
      av=parseFloat(av)||0; bv=parseFloat(bv)||0;
    } else {
      av=String(av).toLowerCase(); bv=String(bv).toLowerCase();
    }
    if(av<bv)return dir==='asc'?-1:1;
    if(av>bv)return dir==='asc'?1:-1;
    return 0;
  });
}

/** 處理 sth 相關操作。 */
function sth(sec,col,label,extraStyle=''){
  const s=getSort(sec,col);
  const active=s.col===col;
  const arrow=active?(s.dir==='asc'?' ↑':' ↓'):'';
  const style='cursor:pointer;user-select:none;white-space:nowrap;'+(active?'color:var(--accent5);':'')+extraStyle;
  return `<th style="${style}" onclick="setSort('${sec}','${col}')">${label}${arrow}</th>`;
}

/** 處理 q 相關操作。 */
function q(sql,p=[]){try{const s=db.prepare(sql);s.bind(p);const r=[];while(s.step())r.push(s.getAsObject());s.free();return r;}catch(e){console.error(sql,e);return[];}}

/** 處理 q1 相關操作。 */
function q1(sql,p=[]){return q(sql,p)[0]||null;}

/** 處理 exec 相關操作。 */
function exec(sql,p=[]){try{db.run(sql,p);}catch(e){console.error(sql,p,e);}clearTimeout(window._autoSaveTimer);window._autoSaveTimer=setTimeout(()=>autoSave(),800);}

/** 處理 lastId 相關操作。 */
function lastId(){return q1("SELECT last_insert_rowid() as id")?.id||0;}