/**
 * 06_modal.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 openModal 相關操作。 */
function openModal(title,html,saveFn,preventClose=false){
  const ov=document.getElementById('overlay');
  if(preventClose) ov.dataset.preventClose="1"; else delete ov.dataset.preventClose;
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-body').innerHTML=html;
  const btn=document.getElementById('modal-save');
  btn.textContent='儲存';btn.className='btn btn-primary';
  if(saveFn){btn.style.display='';btn.onclick=saveFn;}else btn.style.display='none';
  document.getElementById('overlay').classList.add('open');
}

/** 處理 closeModal 相關操作。 */
function closeModal(){document.getElementById('overlay').classList.remove('open');}

/** 處理 confirmDialog 相關操作。 */
function confirmDialog(msg,fn){
  openModal('確認操作',`<div class="confirm-box"><div class="confirm-msg">⚠ ${msg}</div></div>`,()=>{fn();closeModal();});
  const btn=document.getElementById('modal-save');btn.textContent='確認';btn.className='btn btn-danger';
}

/** 處理 toast 相關操作。 */
function toast(msg,type=''){const el=document.getElementById('toast');el.textContent=msg;el.className='show '+(type||'');clearTimeout(el._t);el._t=setTimeout(()=>el.className='',2800);}