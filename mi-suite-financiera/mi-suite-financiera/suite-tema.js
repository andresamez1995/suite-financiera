/* Tema global de Mi Suite: una sola preferencia (suite_tema) para el index, la calculadora y el gestor.
   null = automático (sigue al dispositivo) · 'light' · 'dark'.
   Cambiar el tema en cualquier parte actualiza las demás ventanas al instante (evento "storage"). */
(function(){
  var KEY = 'suite_tema', FLAG = 'suite_tema_migrado', root = document.documentElement;
  function read(){ try{ var v = localStorage.getItem(KEY); return (v==='light'||v==='dark') ? v : null; }catch(e){ return null; } }
  var FONDO = {light:'#F4F1EA', dark:'#0F1316'};   // = --bg de suite-tema.css (barra de estado del celular)
  var oscuroSO = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  // La barra del navegador sigue al tema elegido en la app, no solo al del sistema (solo la ventana principal la controla)
  function pintarBarra(){
    if(window.top !== window) return;
    var r = read() || (oscuroSO && oscuroSO.matches ? 'dark' : 'light');
    document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){ m.setAttribute('content', FONDO[r]); m.removeAttribute('media'); });
  }
  function apply(t){
    if(t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    pintarBarra();
    try{ window.dispatchEvent(new CustomEvent('suite-tema', {detail:t})); }catch(e){}
  }
  // Migración única: si antes elegiste tema dentro del gestor, se conserva como tema global
  try{
    if(!localStorage.getItem(FLAG)){
      localStorage.setItem(FLAG,'1');
      if(localStorage.getItem(KEY)===null){
        var s = JSON.parse(localStorage.getItem('finanzas_app_v12')||'null');
        if(s && (s.theme==='light'||s.theme==='dark')) localStorage.setItem(KEY, s.theme);
      }
    }
  }catch(e){}
  apply(read());
  document.addEventListener('DOMContentLoaded', pintarBarra);
  if(oscuroSO){ try{ oscuroSO.addEventListener('change', pintarBarra); }catch(e){} }
  window.addEventListener('storage', function(e){ if(e.key===KEY || e.key===null) apply(read()); });
  window.SuiteTema = {
    get: read,
    set: function(t){ try{ if(t) localStorage.setItem(KEY,t); else localStorage.removeItem(KEY); }catch(e){} apply(t||null); },
    cycle: function(){ var c = read(); this.set(c===null ? 'dark' : c==='dark' ? 'light' : null); return read(); },
    resolved: function(){ return read() || ((window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'); }
  };
})();
