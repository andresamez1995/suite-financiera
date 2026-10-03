/* Navegación de la suite dentro de cada app (solo en celular, cuando el index no muestra su barra):
   selector de app tipo "Gastos ▾" y botón ⋯ del menú. Habla con el index por postMessage. */
(function(){
  var EN = false; try{ EN = window.parent !== window; }catch(e){ EN = true; }
  var APPS = {calculadora:{n:'Calculadora', i:'calc'}, gastos:{n:'Gastos', i:'wallet'}};
  function enviar(m){ try{ window.parent.postMessage(m, location.origin); }catch(e){} }
  if(EN){ var ultG = 0; document.addEventListener('pointerdown', function(){ var t = Date.now(); if(t-ultG<3000) return; ultG = t; enviar({suite:'gesto'}); }, true); }
  // el index avisa si muestra la columna lateral (escritorio): entonces estos controles sobran
  if(/[?&]rail=1/.test(location.search)) document.documentElement.classList.add('rail');
  window.addEventListener('message', function(e){
    if(e.origin !== location.origin || !e.data || e.data.suite !== 'layout') return;
    document.documentElement.classList.toggle('rail', !!e.data.rail);
  });
  if(EN){ var ultG = 0; document.addEventListener('pointerdown', function(){ var n = Date.now(); if(n-ultG > 20000){ ultG = n; enviar({suite:'gesto'}); } }, true); }
  window.SuiteNav = {
    enSuite: EN,
    selector: function(actual){
      if(!EN || !APPS[actual]) return '';
      var items = Object.keys(APPS).map(function(k){
        return '<button type="button" role="menuitemradio" aria-checked="'+(k===actual)+'" data-app="'+k+'" class="sn-item'+(k===actual?' on':'')+'">'+ic(APPS[k].i,20)+'<span>'+APPS[k].n+'</span>'+(k===actual?ic('check',16):'')+'</button>';
      }).join('');
      return '<span class="sn sn-mobile"><button type="button" class="sn-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Cambiar de aplicación (ahora: '+APPS[actual].n+')">'+ic(APPS[actual].i,22)+ic('chev-down',14)+'</button><span class="sn-pop" role="menu" hidden>'+items+'</span></span>';
    },
    menu: function(){
      if(!EN) return '';
      return '<button type="button" class="sn-menu sn-mobile" aria-label="Menú de la suite">'+ic('dots',22)+'</button>';
    },
    iniciar: function(){
      if(!EN) return;
      document.querySelectorAll('.sn').forEach(function(box){
        var btn = box.querySelector('.sn-btn'), pop = box.querySelector('.sn-pop');
        function cerrar(){ pop.hidden = true; btn.setAttribute('aria-expanded','false'); }
        btn.addEventListener('click', function(e){ e.stopPropagation(); var abre = pop.hidden; pop.hidden = !abre; btn.setAttribute('aria-expanded', abre?'true':'false'); });
        pop.addEventListener('click', function(e){ var b = e.target.closest('[data-app]'); if(!b) return; cerrar(); enviar({suite:'cambiar-app', app:b.dataset.app}); });
        document.addEventListener('click', cerrar);
        document.addEventListener('keydown', function(e){ if(e.key==='Escape') cerrar(); });
      });
      document.querySelectorAll('.sn-menu').forEach(function(b){ b.addEventListener('click', function(){ enviar({suite:'abrir-menu'}); }); });
    }
  };
})();
