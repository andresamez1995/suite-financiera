/* Sincronización con Google Drive, sin servidor propio.
   · Inicio de sesión: Google Identity Services (modelo de token; sirve en un sitio estático).
   · Datos: carpeta OCULTA de la app en el Drive de cada persona (permiso drive.appdata). Quien publica la app no tiene acceso.
   · Casi en tiempo real: sube a los pocos segundos de cada cambio y revisa la nube cada ~30 s (Drive no avisa a páginas estáticas).
   · Si dos dispositivos cambian a la vez, se fusionan registro por registro (ver suite-sync-core.js). Nunca se borra algo por un conflicto.
   Esta API la usa el panel del index: estado(), onEstado(), configurar(), aceptar(), conectar(), reconectar(), sincronizarAhora(),
   desconectar(), borrarNube(), listarCopias(), restaurarCopia(), gesto(), precargar(), onAplicado. */
(function(){
  'use strict';
  var CFG = window.SUITE_CONFIG || {}, Core = window.SuiteSyncCore;
  var SCOPE = 'https://www.googleapis.com/auth/drive.appdata', ARCHIVO = 'suite-datos.json', PREF_COPIA = 'suite-respaldo-';
  var K = {on:'suite_sync_on', email:'suite_sync_email', base:'suite_sync_base', ver:'suite_sync_ver', dev:'suite_sync_dev', ult:'suite_sync_ultima', acepto:'suite_sync_acepto', cid:'suite_sync_cid', rest:'suite_sync_rest', dia:'suite_sync_copia_dia'};
  var POLL = CFG.syncPollMs || 30000, DEB = CFG.syncDebounceMs || 2500, DIAS_COPIAS = 7;
  var token = null, tokenExp = 0, tc = null, tcCid = null, gisP = null;
  var fase = 'off', msg = '', sucio = false, corriendo = false, pend = false, timerDeb = null, timerPoll = null, ultGesto = 0, renovando = false;
  var oyentes = [], iniciado = false, gen = 0, cicloGen = 0;

  function ls(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lset(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }
  function ldel(k){ try{ localStorage.removeItem(k); }catch(e){} }
  // Limpia lo que suele venir al copiar/pegar (sobre todo en el celular): https:// delante, barra final, comillas, espacios o saltos de línea.
  function limpiarId(v){
    v = String(v==null ? '' : v).replace(/\s+/g,'').replace(/^["'`]+|["'`,;]+$/g,'').replace(/^https?:\/\//i,'').replace(/\/+$/,'');
    return /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(v) ? v : '';
  }
  function clientId(){ return limpiarId(ls(K.cid)) || limpiarId(CFG.googleClientId) || ''; }
  function configurado(){ return !!clientId(); }
  function conectado(){ return ls(K.on)==='1'; }
  function dispositivo(){ var d = ls(K.dev); if(!d){ d = 'd'+Math.random().toString(36).slice(2,10); lset(K.dev,d); } return d; }
  // ---------- base de la sincronización (la última versión que coincidía con Drive) ----------
  // Vive en IndexedDB y no en localStorage: así no ocupa el mismo espacio que tus datos (antes los duplicaba).
  // Si el navegador no tiene IndexedDB, se sigue guardando en localStorage como antes.
  var baseMem, baseEnLS = false, IDB = {db:'mi-suite', store:'kv', clave:'sync_base'};
  function idbAbrir(){ return new Promise(function(res, rej){ if(!window.indexedDB) return rej(new Error('sin-idb')); var r = indexedDB.open(IDB.db, 1); r.onupgradeneeded = function(){ r.result.createObjectStore(IDB.store); }; r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); }; }); }
  function idbOp(modo, fn){ return idbAbrir().then(function(db){ return new Promise(function(res, rej){ var tx = db.transaction(IDB.store, modo), q = fn(tx.objectStore(IDB.store)); tx.oncomplete = function(){ db.close(); res(q && q.result); }; tx.onerror = tx.onabort = function(){ db.close(); rej(tx.error); }; }); }); }
  function copiar(o){ try{ return typeof structuredClone==='function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)); }catch(e){ return JSON.parse(JSON.stringify(o)); } }
  function baseLS(){ var r = ls(K.base); if(r===null) return null; try{ return JSON.parse(r); }catch(e){ return null; } }
  function cargarBase(){
    if(baseMem!==undefined) return Promise.resolve(baseMem);
    return idbOp('readonly', function(s){ return s.get(IDB.clave); }).then(function(v){
      if(v===undefined && ls(K.base)!==null){ v = baseLS(); return idbOp('readwrite', function(s){ return s.put(v, IDB.clave); }).then(function(){ ldel(K.base); return v; }); }   // migración desde localStorage
      return v===undefined ? null : v;
    }, function(){ baseEnLS = true; return baseLS(); }).then(function(v){ if(baseMem===undefined) baseMem = v; return baseMem; });
  }
  function leerBase(){ return baseMem===undefined ? null : baseMem; }
  function guardarEnLS(s){ if(!lset(K.base, JSON.stringify(s))) msg = 'No hay espacio en el dispositivo para sincronizar'; }
  function guardarBase(s){
    baseMem = copiar(s);
    if(baseEnLS){ guardarEnLS(baseMem); return; }
    idbOp('readwrite', function(st){ return st.put(baseMem, IDB.clave); }).catch(function(){ baseEnLS = true; guardarEnLS(baseMem); });
  }
  function borrarBase(){ baseMem = null; ldel(K.base); idbOp('readwrite', function(s){ return s['delete'](IDB.clave); }).catch(function(){}); }
  function estado(){
    return { configurado:configurado(), conectado:conectado(), acepto:ls(K.acepto)==='1', email:ls(K.email)||'', fase: conectado() ? fase : 'off',
      pendiente: conectado() && (sucio || fase==='pendiente'), msg:msg, ult:parseInt(ls(K.ult)||'0',10),
      idPropio: !!limpiarId(ls(K.cid)), idDeConfig: !!limpiarId(CFG.googleClientId) };
  }
  // Si el usuario desconecta o borra mientras hay una sincronización en marcha, esa sincronización se cancela (no vuelve a escribir en Drive).
  function vigente(){ if(!conectado() || cicloGen!==gen){ var e = new Error('cancelado'); e.codigo = 'cancelado'; throw e; } }
  function esperarCiclo(){ return new Promise(function(res){ var n = 0; (function w(){ if(!corriendo || n++>60) return res(); setTimeout(w,150); })(); }); }
  function exclusivo(fn){
    return esperarCiclo().then(function(){ corriendo = true; return fn(); }).then(function(r){ corriendo = false; return r; }, function(e){ corriendo = false; throw e; });
  }
  function aviso(m){ if(typeof SuiteSync.onAviso==='function'){ try{ SuiteSync.onAviso(m); }catch(e){} } }
  function emitir(){ var e = estado(); oyentes.forEach(function(f){ try{ f(e); }catch(x){} }); }
  function setFase(f,m){ fase = f; msg = m||''; emitir(); }

  // ---------- Google Identity Services ----------
  function precargar(){
    if(window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
    if(gisP) return gisP;
    gisP = new Promise(function(res,rej){
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function(){ res(); }; s.onerror = function(){ gisP = null; var e = new Error('No se pudo cargar el inicio de sesión de Google (¿sin internet?)'); e.codigo = 'red'; rej(e); };
      document.head.appendChild(s);
    });
    return gisP;
  }
  function tokenValido(){ return !!token && Date.now() < tokenExp; }
  function pedirToken(prompt){
    return precargar().then(function(){ return new Promise(function(res,rej){
      var cid = clientId();
      if(!tc || tcCid!==cid){ tc = google.accounts.oauth2.initTokenClient({client_id:cid, scope:SCOPE, callback:function(){}, error_callback:function(){}}); tcCid = cid; }
      tc.callback = function(r){
        if(r && r.access_token){ token = r.access_token; tokenExp = Date.now() + ((r.expires_in||3600)*1000) - 60000; res(token); }
        else { var e = new Error((r && (r.error_description || r.error)) || 'No se concedió el permiso'); e.codigo = 'token'; rej(e); }
      };
      tc.error_callback = function(er){ var e = new Error(er && er.type==='popup_closed' ? 'Cerraste la ventana de Google' : 'No se pudo abrir el inicio de sesión de Google'); e.codigo = 'token'; rej(e); };
      var o = {prompt:prompt}, h = ls(K.email); if(h) o.login_hint = h;
      tc.requestAccessToken(o);
    }); });
  }
  function asegurarToken(){ return tokenValido() ? Promise.resolve(token) : pedirToken(''); }

  // ---------- Drive ----------
  var BASE = 'https://www.googleapis.com/drive/v3/files';
  function api(url, op){
    op = op || {};
    var h = {'Authorization':'Bearer '+token}; if(op.json) h['Content-Type'] = 'application/json';
    return fetch(url, {method: op.method||'GET', headers:h, body: op.body}).then(function(r){
      if(r.status===401){ token = null; var e = new Error('La sesión de Google venció'); e.codigo = 401; throw e; }
      if(!r.ok){ var e2 = new Error('Drive respondió '+r.status); e2.codigo = r.status; throw e2; }
      return op.texto ? r.text() : (r.status===204 ? null : r.json());
    }, function(){ var e = new Error('Sin conexión'); e.codigo = 'red'; throw e; });
  }
  function listar(q, orden){ return api(BASE+'?spaces=appDataFolder&q='+encodeURIComponent(q)+'&fields='+encodeURIComponent('files(id,name,version,modifiedTime)')+'&pageSize=100'+(orden ? '&orderBy='+encodeURIComponent(orden) : '')).then(function(r){ return r.files || []; }); }
  var RECIENTES = 'modifiedTime desc';
  function buscarArchivo(){ return listar("name='"+ARCHIVO+"'").then(function(f){ return f[0] || null; }); }
  function descargar(id){
    return api(BASE+'/'+id+'?alt=media', {texto:true}).then(function(t){
      try{ var o = JSON.parse(t); if(!o || typeof o.datos!=='object') throw 0; return o; }
      catch(e){ var er = new Error('El archivo de tu Drive está dañado'); er.codigo = 'dañado'; throw er; }
    });
  }
  function crear(nombre){ return api(BASE+'?fields=id,version', {method:'POST', json:true, body:JSON.stringify({name:nombre, parents:['appDataFolder']})}); }
  function escribir(id, obj){ return api('https://www.googleapis.com/upload/drive/v3/files/'+id+'?uploadType=media&fields=id,version', {method:'PATCH', json:true, body:JSON.stringify(obj)}); }
  function borrar(id){ return api(BASE+'/'+id, {method:'DELETE'}); }
  function leerUsuario(){ return api('https://www.googleapis.com/drive/v3/about?fields='+encodeURIComponent('user(emailAddress,displayName)')); }
  function paquete(datos, extra){ var p = {app:'mi-suite-financiera', formato:1, guardadoEn:new Date().toISOString(), dispositivo:dispositivo(), datos:datos}; if(extra) Object.keys(extra).forEach(function(k){ p[k] = extra[k]; }); return p; }
  function crearCopia(nombre, datos){ return crear(nombre).then(function(a){ return escribir(a.id, paquete(datos)); }); }
  function podarCopias(){ return listar("name contains '"+PREF_COPIA+"'", RECIENTES).then(function(f){ return Promise.all(f.slice(DIAS_COPIAS+3).map(function(x){ return borrar(x.id); })); }); }
  function copiaDelDia(datos){
    var hoy = new Date().toISOString().slice(0,10); if(ls(K.dia)===hoy) return Promise.resolve();
    return crearCopia(PREF_COPIA+hoy+'.json', datos).then(function(){ lset(K.dia, hoy); return podarCopias(); }).catch(function(){});
  }
  function copiaSegura(etiqueta, datos){ return crearCopia(PREF_COPIA+etiqueta+'-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.json', datos).catch(function(){}); }

  // ---------- aplicar cambios entrantes ----------
  function puedeAplicar(){
    // no se tocan los datos mientras haya un formulario abierto o se esté escribiendo en un campo
    try{
      var g = document.getElementById('frame-gastos'), c = document.getElementById('frame-calculadora');
      var gd = g && g.contentDocument, cd = c && c.contentDocument;
      if(gd && gd.getElementById && gd.getElementById('modalOverlay') && !gd.getElementById('obSave')) return false;   // la bienvenida de primer uso no cuenta como formulario
      if(cd && cd.getElementById){ var m = cd.getElementById('modalGestor'); if(m && !m.hidden) return false; }
      var enCampo = function(d){ var a = d && d.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type!=='checkbox' && a.type!=='radio'; };
      if(enCampo(gd) || enCampo(cd)) return false;
    }catch(e){}
    return true;
  }
  function avisarApps(){
    ['frame-gastos','frame-calculadora'].forEach(function(id){ var f = document.getElementById(id); try{ if(f && f.contentWindow && f.getAttribute('src')) f.contentWindow.postMessage({suite:'datos-actualizados'}, location.origin); }catch(e){} });
  }
  function aplicarLocal(snap){
    Core.aplicarSnapshot(localStorage, snap, leerBase() || Core.tomarSnapshot(localStorage));
    avisarApps();
    if(typeof SuiteSync.onAplicado==='function'){ try{ SuiteSync.onAplicado(); }catch(e){} }
  }
  function marcarVersion(m){ lset(K.ver, String(m.version)); }
  function cambioRemoto(){ var e = new Error('cambio-remoto'); e.codigo = 'cambio-remoto'; return e; }
  function subirSnapshot(snap, archivo, extra){
    return Promise.resolve().then(function(){
      vigente(); if(!archivo) return crear(ARCHIVO);
      // otro dispositivo pudo guardar mientras se fusionaba: si la versión cambió, se vuelve a fusionar en vez de pisarlo
      return buscarArchivo().then(function(a2){ vigente(); if(a2 && String(a2.version)!==String(archivo.version)) throw cambioRemoto(); return archivo; });
    }).then(function(a){ return escribir(a.id, paquete(snap, extra)); })
      .then(function(m){ guardarBase(snap); marcarVersion(m); sucio = false; });
  }

  function sincronizar(){
    var archivo, local;
    // lo que registres mientras se descarga o se fusiona no se pisa: si los datos cambiaron, el ciclo se repite con ellos
    function quieto(){ return Core.igual(Core.tomarSnapshot(localStorage), local); }
    return cargarBase().then(buscarArchivo).then(function(a){
      vigente();
      archivo = a;
      local = Core.tomarSnapshot(localStorage); var base = leerBase();
      if(!archivo){
        if(base!==null){ var eb = new Error('nube-borrada'); eb.codigo = 'nube-borrada'; throw eb; }   // esta nube ya se había sincronizado y desapareció: no se vuelve a subir nada
        if(Core.tieneDatos(local)) return subirSnapshot(local, null).then(function(){ return copiaDelDia(local); });
        guardarBase(local); sucio = false; return null;
      }
      var remotoCambio = String(archivo.version) !== (ls(K.ver)||''), esSucio = base===null ? true : !Core.igual(local, base);
      if(base!==null && !remotoCambio && !esSucio){ sucio = false; return null; }
      if(base!==null && !remotoCambio) return subirSnapshot(local, archivo);                 // solo cambió este dispositivo
      return descargar(archivo.id).then(function(pk){
        var remoto = pk.datos;
        // restauración de una copia hecha desde otro dispositivo: se adopta tal cual
        if(pk.restauracion && String(pk.restauracion)!==(ls(K.rest)||'')){
          if(!puedeAplicar()) return 'espera';
          if(!quieto()) return 'reintentar';
          aplicarLocal(remoto); guardarBase(remoto); marcarVersion(archivo); lset(K.rest, String(pk.restauracion)); sucio = false; return null;
        }
        if(base===null){                                                                   // primera conexión de este dispositivo
          if(!Core.tieneDatos(local)){ if(!puedeAplicar()) return 'espera'; if(!quieto()) return 'reintentar'; aplicarLocal(remoto); guardarBase(remoto); marcarVersion(archivo); sucio = false; return null; }
          if(!Core.tieneDatos(remoto)) return subirSnapshot(local, archivo);
          if(!puedeAplicar()) return 'espera';
          // los dos lados tienen datos: se unen (nada se pierde) y antes se guarda una copia de cada uno en tu Drive
          return copiaSegura('primera-conexion-este-dispositivo', local).then(function(){ return copiaSegura('primera-conexion-nube', remoto); }).then(function(){
            if(!quieto()) return 'reintentar';
            var fus = Core.merge3({}, local, remoto, {conflictos:0}); aplicarLocal(fus); return subirSnapshot(fus, archivo);
          });
        }
        if(!puedeAplicar()) return 'espera';
        if(!quieto()) return 'reintentar';
        if(!esSucio){ aplicarLocal(remoto); guardarBase(remoto); marcarVersion(archivo); sucio = false; return null; }     // solo cambió la nube
        var ctx = {conflictos:0}, fus = Core.merge3(base, local, remoto, ctx);              // cambiaron los dos: fusionar
        var pre = ctx.conflictos>0 ? copiaSegura('antes-de-fusionar', local) : Promise.resolve();
        return pre.then(function(){ if(!quieto()) return 'reintentar'; aplicarLocal(fus); return subirSnapshot(fus, archivo); });
      });
    });
  }

  function ciclo(){
    if(!conectado() || !configurado()) return Promise.resolve(false);
    if(corriendo){ pend = true; return Promise.resolve(false); }
    if(navigator.onLine===false){ setFase('sin_conexion'); return Promise.resolve(false); }
    corriendo = true; cicloGen = gen; setFase('sincronizando');
    return asegurarToken().then(sincronizar).then(function(r){
      if(r==='espera'){ setFase('pendiente'); programar(5000); return true; }
      if(r==='reintentar'){ setFase('pendiente'); programar(800); return true; }
      lset(K.ult, String(Date.now())); setFase('ok');
      return copiaDelDia(Core.tomarSnapshot(localStorage)).then(function(){ return true; });
    }).catch(function(e){ errorCiclo(e); return false; })
      .then(function(r){ corriendo = false; if(pend){ pend = false; programar(600); } return r; });
  }
  function errorCiclo(e){
    var c = e && e.codigo;
    if(c==='cancelado') return;
    if(c==='cambio-remoto'){ setFase('pendiente'); programar(800); return; }
    if(c==='nube-borrada'){ desconectar(); aviso('Tu copia en Google Drive se borró. Este dispositivo se desconectó y conserva sus datos; puedes volver a conectar cuando quieras.'); return; }
    if(c===401 || c==='token') setFase('reconectar');
    else if(c==='red') setFase('sin_conexion');
    else setFase('error', (e && e.message) || 'Error desconocido');
  }
  function programar(ms){ clearTimeout(timerDeb); timerDeb = setTimeout(ciclo, ms==null ? DEB : ms); }
  function iniciarTimers(){ clearInterval(timerPoll); timerPoll = setInterval(function(){ if(!document.hidden && conectado()) ciclo(); }, POLL); }

  // ---------- acciones del panel ----------
  function configurar(id){ id = limpiarId(id); if(id) lset(K.cid, id); else ldel(K.cid); tc = null; emitir(); }
  function aceptar(v){ lset(K.acepto, v ? '1' : '0'); }
  function conectar(){
    if(!configurado()) return Promise.resolve(false);
    setFase('conectando');
    return pedirToken('consent').then(function(){ return leerUsuario(); }).then(function(u){
      lset(K.email, (u && u.user && u.user.emailAddress) || ''); lset(K.on,'1'); lset(K.acepto,'1'); borrarBase(); ldel(K.ver); ldel(K.rest); ldel(K.dia);
      iniciarTimers(); return ciclo();
    }).then(function(ok){ return !!ok && fase==='ok'; }, function(e){ lset(K.on,'0'); setFase('off', (e && e.message) || 'No se pudo conectar'); return false; });
  }
  function reconectar(){
    if(renovando) return Promise.resolve(false); renovando = true; setFase('conectando');
    return pedirToken('').catch(function(){ return pedirToken('consent'); }).then(function(){ renovando = false; return ciclo(); }, function(e){ renovando = false; setFase('reconectar', (e && e.message) || ''); return false; });
  }
  function gesto(){
    // lo llama cada toque en la app: si la sesión de Google venció, se renueva aquí (el navegador solo permite abrir la ventanita de Google dentro de un toque)
    if(!conectado() || !configurado() || tokenValido() || renovando || fase==='conectando') return;
    var t = Date.now(); if(t-ultGesto < 20000) return; ultGesto = t;
    reconectar();
  }
  function desconectar(){
    gen++; lset(K.on,'0');
    try{ if(token && window.google && google.accounts.oauth2.revoke) google.accounts.oauth2.revoke(token, function(){}); }catch(e){}
    token = null; tokenExp = 0; clearInterval(timerPoll); clearTimeout(timerDeb);
    lset(K.on,'0'); borrarBase(); ldel(K.ver); ldel(K.email); ldel(K.rest); ldel(K.dia); sucio = false; setFase('off');
  }
  function borrarNube(){
    lset(K.on,'0'); gen++; clearTimeout(timerDeb); clearInterval(timerPoll);       // primero se detiene todo lo que esté sincronizando
    return esperarCiclo().then(function(){ return asegurarToken(); })
      .then(function(){ return Promise.all([listar("name='"+ARCHIVO+"'"), listar("name contains '"+PREF_COPIA+"'")]); })
      .then(function(r){ return Promise.all(r[0].concat(r[1]).map(function(f){ return borrar(f.id); })); })
      .then(function(){ desconectar(); }, function(e){ lset(K.on,'1'); iniciarTimers(); setFase('error','No se pudieron borrar tus datos de Drive'); throw e; });
  }
  function listarCopias(){
    if(!tokenValido()) return Promise.resolve([]);
    return listar("name contains '"+PREF_COPIA+"'", RECIENTES).then(function(f){ return f.filter(function(x){ return /^suite-respaldo-\d{4}-\d{2}-\d{2}\.json$/.test(x.name); }).slice(0, DIAS_COPIAS); });
  }
  function restaurarCopia(id){
    return exclusivo(function(){
      return asegurarToken().then(function(){ return descargar(id); }).then(function(pk){
        var datos = pk.datos, marca = String(Date.now());
        return copiaSegura('antes-de-restaurar', Core.tomarSnapshot(localStorage)).then(function(){ return buscarArchivo(); }).then(function(a){
          aplicarLocal(datos);
          return subirSnapshot(datos, a, {restauracion: marca}).then(function(){ lset(K.rest, marca); lset(K.ult, String(Date.now())); setFase('ok'); });
        });
      });
    });
  }

  function engancharEventos(){
    window.addEventListener('storage', function(e){ if(conectado() && e.key && Core.sincronizable(e.key)){ sucio = true; emitir(); programar(); } });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden && conectado()) programar(300); });
    window.addEventListener('online', function(){ if(conectado()) programar(300); });
    window.addEventListener('offline', function(){ if(conectado()) setFase('sin_conexion'); });
  }
  function arrancar(){
    if(iniciado) return; iniciado = true; engancharEventos();
    if(conectado() && configurado()){ fase = 'reconectar'; iniciarTimers(); ciclo(); }   // si el navegador no deja renovar en silencio, queda "reconectar" y se renueva con el primer toque
  }
  var SuiteSync = {
    estado:estado, onEstado:function(f){ oyentes.push(f); }, onAplicado:null, onAviso:null, configurar:configurar, aceptar:aceptar, conectar:conectar, reconectar:reconectar,
    sincronizarAhora:ciclo, limpiarId:limpiarId, desconectar:desconectar, borrarNube:borrarNube, listarCopias:listarCopias, restaurarCopia:restaurarCopia, gesto:gesto, precargar:function(){ return precargar().catch(function(){}); }
  };
  window.SuiteSync = SuiteSync;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar); else setTimeout(arrancar, 0);
})();
