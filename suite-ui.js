/* Ventanas propias de la suite (reemplazan alert y confirm nativos) y pequeños ayudantes de accesibilidad. */
(function(){
  'use strict';
  var overlay = null, cola = [], activo = null, contador = 0;
  function crear(){
    if(overlay) return;
    var st = document.createElement('style');
    st.textContent = '#suiteDlg{position:fixed; inset:0; z-index:200; display:none; align-items:flex-end; justify-content:center; background:rgba(0,0,0,.55); padding:0;} #suiteDlg.show{display:flex;}'+
      '#suiteDlg .sd-box{width:100%; max-width:440px; background:var(--surface,#fff); color:var(--text,#111); border-radius:20px 20px 0 0; padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px)); box-shadow:0 -10px 40px rgba(0,0,0,.35); animation:sdUp .2s ease-out;}'+
      '@media (min-width:600px){ #suiteDlg{align-items:center; padding:16px;} #suiteDlg .sd-box{border-radius:20px;} }'+
      '@keyframes sdUp{from{transform:translateY(24px); opacity:0;} to{transform:none; opacity:1;}}'+
      '#suiteDlg .sd-t{font-family:var(--font-display,inherit); font-weight:700; font-size:17px; margin:0 0 6px;} #suiteDlg .sd-m{font-size:14px; line-height:1.55; white-space:pre-line; color:var(--text-dim,#555); margin-bottom:16px;}'+
      '#suiteDlg .sd-b{display:flex; gap:10px;} #suiteDlg button{flex:1; min-height:48px; border-radius:12px; border:1px solid var(--border,#ccc); background:var(--surface-2,#eee); color:var(--text,#111); font-family:inherit; font-size:14.5px; font-weight:700; cursor:pointer;}'+
      '#suiteDlg button.sd-ok{background:var(--accent,#247A56); border-color:var(--accent,#247A56); color:var(--accent-ink,#fff);} #suiteDlg button.sd-pel{background:var(--danger,#C23B3B); border-color:var(--danger,#C23B3B); color:#fff;}';
    document.head.appendChild(st);
    overlay = document.createElement('div'); overlay.id = 'suiteDlg'; overlay.setAttribute('role','alertdialog'); overlay.setAttribute('aria-modal','true'); overlay.setAttribute('aria-labelledby','sdT'); overlay.setAttribute('aria-describedby','sdM');
    overlay.innerHTML = '<div class="sd-box"><div class="sd-t" id="sdT"></div><div class="sd-m" id="sdM"></div><div class="sd-b" id="sdB"></div></div>';
    document.body.appendChild(overlay);
    document.addEventListener('keydown', function(e){ if(activo && e.key==='Escape'){ e.preventDefault(); cerrar(false); } });
  }
  function cerrar(v){ if(!activo) return; var a = activo; activo = null; overlay.classList.remove('show'); try{ if(a.volver && a.volver.focus) a.volver.focus(); }catch(e){} a.res(v); if(cola.length) siguiente(); }
  function siguiente(){
    var o = cola.shift(); if(!o) return; crear(); activo = o;
    document.getElementById('sdT').textContent = o.titulo; document.getElementById('sdM').textContent = o.texto;
    var b = document.getElementById('sdB'); b.innerHTML = '';
    if(o.confirmar){ var c = document.createElement('button'); c.type = 'button'; c.id = 'suiteDlgCancel'; c.textContent = o.cancelar; c.onclick = function(){ cerrar(false); }; b.appendChild(c); }
    var k = document.createElement('button'); k.type = 'button'; k.id = 'suiteDlgOk'; k.className = o.peligro ? 'sd-pel' : 'sd-ok'; k.textContent = o.ok; k.onclick = function(){ cerrar(true); }; b.appendChild(k);
    overlay.classList.add('show'); setTimeout(function(){ (o.peligro && o.confirmar ? document.getElementById('suiteDlgCancel') : k).focus(); }, 30);
  }
  function mostrar(o){ return new Promise(function(res){ o.res = res; o.volver = document.activeElement; cola.push(o); if(!activo){ if(document.body) siguiente(); else document.addEventListener('DOMContentLoaded', siguiente); } }); }
  var SuiteUI = {
    alerta: function(msg, titulo){ return mostrar({confirmar:false, titulo:titulo||'Aviso', texto:String(msg), ok:'Entendido'}); },
    confirmar: function(msg, o){
      o = o || {}; var peligro = o.peligro===undefined ? /elimin|borrar|reemplaz|definitiv/i.test(String(msg)) : o.peligro;
      return mostrar({confirmar:true, titulo:o.titulo||'¿Seguro?', texto:String(msg), ok:o.ok || (peligro ? 'Sí, continuar' : 'Continuar'), cancelar:o.cancelar||'Cancelar', peligro:peligro});
    }
  };
  window.SuiteUI = SuiteUI;
  window.alert = function(m){ SuiteUI.alerta(m); };
  // confirm "asíncrono" para código que esperaba una respuesta inmediata: la primera vez muestra la ventana y corta la acción;
  // si la persona acepta, se vuelve a pulsar el mismo botón y esa segunda vez pasa.
  document.addEventListener('click', function(e){ var t = e.target; window.__ultimoClic = (t && t.closest) ? (t.closest('button,[onclick],a,label,summary') || t) : t; }, true);
  window.confirmaLuego = function(msg, o){ return window.__SUITE_TEST_CONFIRM ? Promise.resolve(true) : SuiteUI.confirmar(msg, o); };   // para pasos que ocurren DESPUÉS de elegir un archivo (no hay botón que volver a pulsar)
window.confirmaYa = function(msg, o){
    if(window.__SUITE_TEST_CONFIRM) return true;
    if(window.__confirmadoMsg===msg){ window.__confirmadoMsg = null; return true; }
    var origen = window.__ultimoClic;
    SuiteUI.confirmar(msg, o).then(function(ok){
      if(!ok) return; window.__confirmadoMsg = msg;
      setTimeout(function(){ window.__confirmadoMsg = null; }, 2000);
      try{
        // el botón original puede haberse vuelto a dibujar mientras se leía la ventana (paneles que se actualizan solos): se busca el vigente
        var el = (origen && origen.isConnected) ? origen : null;
        if(!el && origen && origen.id) el = document.getElementById(origen.id);
        if(!el && origen && origen.dataset && origen.dataset.rest) el = document.querySelector('[data-rest="'+origen.dataset.rest+'"]');
        if(el) el.click();
      }catch(x){}
    });
    return false;
  };
  // Accesibilidad: enlaza cada <label> con el campo que tiene justo después (sin cambiar el aspecto).
  function enlazar(raiz){
    (raiz||document).querySelectorAll('label:not([for])').forEach(function(l){
      if(l.querySelector('input,select,textarea')) return;
      var c = l.nextElementSibling, n = 0;
      while(c && n<3){
        if(/^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName) && c.type!=='hidden') break;
        var dentro = c.querySelector && c.querySelector('input:not([type=hidden]),select,textarea'); if(dentro){ c = dentro; break; }
        c = c.nextElementSibling; n++;
      }
      if(c && /^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName) && c.type!=='hidden'){ if(!c.id) c.id = 'sl'+(++contador); l.setAttribute('for', c.id); }
    });
    // casillas y opciones cuyo texto está en un <span> vecino (filas «.check-row»): el texto pasa a ser su nombre accesible
    (raiz||document).querySelectorAll('input[type=checkbox],input[type=radio]').forEach(function(inp){
      if(inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby')) return;
      if(inp.id && document.querySelector('label[for="'+inp.id+'"]')) return;
      if(inp.closest('label')) return;
      var fila = inp.closest('.check-row,.wiz-radio,.prev-modo > *,div,li') || inp.parentElement, t = null;
      if(fila){ var cand = fila.querySelector('span,strong,b'); if(cand && cand.textContent.trim()) t = cand; }
      if(!t && inp.nextElementSibling && inp.nextElementSibling.textContent.trim()) t = inp.nextElementSibling;
      if(t){ if(!t.id) t.id = 'sa'+(++contador); inp.setAttribute('aria-labelledby', t.id); }
    });
    // campos que solo tienen texto de ejemplo (placeholder) o título: se usa como nombre accesible
    (raiz||document).querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea').forEach(function(f){
      if(f.getAttribute('aria-label') || f.getAttribute('aria-labelledby') || f.closest('label')) return;
      if(f.id && document.querySelector('label[for="'+f.id+'"]')) return;
      var nombre = f.getAttribute('placeholder') || f.getAttribute('title'); if(nombre) f.setAttribute('aria-label', nombre);
    });
  }
  window.SuiteUI.enlazarEtiquetas = enlazar;
  function arrancar(){ enlazar(document); var t; new MutationObserver(function(){ clearTimeout(t); t = setTimeout(function(){ enlazar(document); }, 60); }).observe(document.body, {childList:true, subtree:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
