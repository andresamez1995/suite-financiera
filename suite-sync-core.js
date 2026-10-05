/* Núcleo de sincronización (sin DOM, probado aparte): fusión de 3 vías y lectura/escritura del almacenamiento local.
   Idea: cada dispositivo recuerda la "base" (lo último que sincronizó). Al sincronizar compara base, local y nube:
   - si solo cambió uno de los dos lados, gana ese lado;
   - si cambiaron los dos, se fusionan registro por registro (por id) y los saldos se suman como diferencias. */
(function(root){
  'use strict';
  var PATRON = /^(finanzas_app_v12|co(\d{4})?_[\w]+)$/;
  var EXCLUIDAS = /^(co_ui|co_colapsadas|co_gestor_cuenta|co_wizard_visto)$|_corrupto/;
  var LOCALES_GASTOS = ['ui','theme','viewingMonth','lastBackup','version'];   // preferencias de cada dispositivo: no se sincronizan

  function sincronizable(k){ return PATRON.test(k) && !EXCLUIDAS.test(k); }
  function esObj(x){ return !!x && typeof x==='object' && !Array.isArray(x); }
  function canon(x){
    if(Array.isArray(x)) return x.map(canon);
    if(esObj(x)){ var o={}; Object.keys(x).sort().forEach(function(k){ o[k]=canon(x[k]); }); return o; }
    return x;
  }
  function igual(a,b){ return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); }
  function conIds(a){ return Array.isArray(a) && a.every(function(e){ return esObj(e) && typeof e.id==='string'; }); }
  // Campos que el gestor DERIVA al cargar (saldo de cada cuenta = saldo inicial + movimientos; applied = fecha ≤ hoy).
  // No se fusionan: si difieren, se toma el de este dispositivo y el gestor los vuelve a calcular con los movimientos ya fusionados.
  function esDerivado(k, ruta){ return (k==='balance' && ruta.indexOf('accounts')>=0) || (k==='applied' && (ruta.indexOf('expenses')>=0 || ruta.indexOf('incomes')>=0)); }
  function clave(e){ return JSON.stringify(canon(e)); }

  function fusionar(b,l,r,ctx,ruta){
    if(igual(l,r)) return l;
    if(igual(l,b)) return r;           // solo cambió la nube
    if(igual(r,b)) return l;           // solo cambió este dispositivo
    if(esObj(l) && esObj(r)){
      var B = esObj(b) ? b : {}, out = {}, claves = {};
      Object.keys(l).forEach(function(k){ claves[k]=1; }); Object.keys(r).forEach(function(k){ claves[k]=1; });
      Object.keys(claves).forEach(function(k){
        var m = (esDerivado(k, ruta) && l[k]!==undefined) ? l[k] : fusionar(B[k], l[k], r[k], ctx, ruta.concat(k));
        if(m!==undefined) out[k] = m;
      });
      return out;
    }
    if(conIds(l) && conIds(r)){
      var Bm = {}, Lm = {}, Rm = {}, ids = [];
      (conIds(b) ? b : []).forEach(function(e){ Bm[e.id]=e; });
      l.forEach(function(e){ Lm[e.id]=e; ids.push(e.id); });
      r.forEach(function(e){ Rm[e.id]=e; if(!(e.id in Lm)) ids.push(e.id); });
      var res = [];
      ids.forEach(function(id){ var m = fusionar(Bm[id], Lm[id], Rm[id], ctx, ruta.concat(String(id))); if(m!==undefined) res.push(m); });
      return res;
    }
    // Listas sin id (p. ej. los ajustes de saldo de una deuda): se unen. Queda lo que agregó cada lado y sale lo que alguno borró.
    if(Array.isArray(l) && Array.isArray(r) && !conIds(l) && !conIds(r)){
      var enB = {}, enL = {}, enR = {}, res2 = [], vistos = {};
      (Array.isArray(b) ? b : []).forEach(function(e){ enB[clave(e)] = 1; });
      l.forEach(function(e){ enL[clave(e)] = 1; }); r.forEach(function(e){ enR[clave(e)] = 1; });
      l.concat(r).forEach(function(e){ var c = clave(e); if(vistos[c]) return; vistos[c] = 1; if(enB[c] && !(enL[c] && enR[c])) return; res2.push(e); });
      return res2;
    }
    // Uno borró y el otro modificó: se CONSERVA lo modificado (nunca se pierde un dato por un conflicto)
    if(b!==undefined && l===undefined && r!==undefined) return r;
    if(b!==undefined && r===undefined && l!==undefined) return l;
    ctx.conflictos++;                  // cambió lo mismo en los dos lados: gana este dispositivo
    return l;
  }
  function merge3(base, local, remoto, ctx){ ctx = ctx || {conflictos:0}; return fusionar(base, local, remoto, ctx, []); }

  function quitarLocales(est){ var o = {}; Object.keys(est).forEach(function(k){ if(LOCALES_GASTOS.indexOf(k)<0) o[k]=est[k]; }); return o; }
  function tomarSnapshot(storage){
    var snap = {};
    for(var i=0;i<storage.length;i++){
      var k = storage.key(i); if(!sincronizable(k)) continue;
      var raw = storage.getItem(k), v;
      try{ v = JSON.parse(raw); }catch(e){ v = {__raw: raw}; }
      if(k==='finanzas_app_v12' && esObj(v)) v = quitarLocales(v);
      snap[k] = v;
    }
    return snap;
  }
  function aplicarSnapshot(storage, snap, previo){
    Object.keys(snap).forEach(function(k){
      if(!sincronizable(k)) return;
      var v = snap[k], raw;
      if(k==='finanzas_app_v12' && esObj(v)){
        var actual = {}; try{ actual = JSON.parse(storage.getItem(k)||'{}') || {}; }catch(e){}
        var o = Object.assign({}, v); LOCALES_GASTOS.forEach(function(c){ if(c in actual) o[c] = actual[c]; });
        raw = JSON.stringify(o);
      } else raw = (esObj(v) && v.__raw!==undefined && Object.keys(v).length===1) ? v.__raw : JSON.stringify(v);
      storage.setItem(k, raw);
    });
    Object.keys(previo||{}).forEach(function(k){ if(!(k in snap) && sincronizable(k)) storage.removeItem(k); });
  }
  function resumen(snap){
    var g = snap.finanzas_app_v12 || {}, n = function(a){ return Array.isArray(a) ? a.length : 0; };
    return { gastos:n(g.expenses), ingresos:n(g.incomes), cuentas:n(g.accounts), deudas:n(g.debts), transferencias:n(g.transfers),
      dias: Object.keys(snap).filter(function(k){ return /^co\d{4}_workdays$/.test(k); }).reduce(function(t,k){ return t + (esObj(snap[k]) ? Object.keys(snap[k]).length : 0); },0) };
  }
  function tieneDatos(snap){
    var r = resumen(snap);
    if(r.gastos+r.ingresos+r.cuentas+r.deudas+r.transferencias+r.dias>0) return true;
    return Object.keys(snap).some(function(k){ return /^co\d{4}_(historial_prima|ajustes_banco|empleos_previos|comisiones_por_mes)$/.test(k) && esObj(snap[k]) && Object.keys(snap[k]).length>0; });
  }
  root.SuiteSyncCore = { sincronizable:sincronizable, igual:igual, merge3:merge3, tomarSnapshot:tomarSnapshot, aplicarSnapshot:aplicarSnapshot, resumen:resumen, tieneDatos:tieneDatos, LOCALES_GASTOS:LOCALES_GASTOS };
  if(typeof module!=='undefined' && module.exports) module.exports = root.SuiteSyncCore;
})(typeof window!=='undefined' ? window : globalThis);
