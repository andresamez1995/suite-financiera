/* Hoy · motor de cálculo (sin DOM, se prueba aparte).
   Responde «¿cuánto puedo gastar hoy?» con los datos del gestor (finanzas_app_v12), lo que publica la calculadora
   (suite_calc_hoy) y la configuración de Hoy (co_hoy). No guarda resultados: todo se recalcula desde cero cada vez.

   Libre = plata de tus cuentas del día a día (con lo ya programado antes del pago)
         + ingresos esperados seguros (todo su margen cae antes del pago)
         − gastos fijos pendientes antes del pago (también los atrasados)
         − tarjetas: lo que vence antes del pago + compras y avances del período
         − piso (opcional)
   Presupuesto de hoy = (Libre + lo variable que ya gastaste hoy) ÷ días que faltan para el pago (contando hoy).
   Te queda hoy = presupuesto de hoy − lo variable de hoy. */
(function(root){
  'use strict';
  var DIA = 86400000;
  var pad = function(n){ return String(n).padStart(2,'0'); };
  function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function fecha(s){ return new Date(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10)); }
  function masDias(s, n){ var d = fecha(s); d.setDate(d.getDate()+n); return iso(d); }
  function entre(a, b){ return Math.round((fecha(b)-fecha(a))/DIA); }               // días de a hasta b
  function ultimoDia(y, m0){ return new Date(y, m0+1, 0).getDate(); }
  function isoYMD(y, m0, d){ var dd = new Date(y, m0, 1); return dd.getFullYear()+'-'+pad(dd.getMonth()+1)+'-'+pad(Math.min(d, ultimoDia(dd.getFullYear(), dd.getMonth()))); }
  function mIdx(s){ return (+s.slice(0,4))*12 + (+s.slice(5,7)) - 1; }
  function mKey(i){ return Math.floor(i/12)+'-'+pad(i%12+1); }
  var r2 = function(n){ n = Number(n)||0; return Math.round(n*100)/100; };
  var suma = function(l, f){ return r2(l.reduce(function(t,x){ return t + (f ? f(x) : x); }, 0)); };
  var norm = function(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim().replace(/\s+/g,' '); };
  var SALARIO_RE = /\b(salario|sueldo|nomina|quincena)\b/;
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var DIAS_SEM = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  function fCorta(s){ return (+s.slice(8,10))+' '+MESES[+s.slice(5,7)-1].slice(0,3); }
  function fLarga(s){ return DIAS_SEM[fecha(s).getDay()]+' '+(+s.slice(8,10))+' de '+MESES[+s.slice(5,7)-1]; }
  function fmt(n){ n = r2(n); var d = !Number.isInteger(n); return (n<0?'−':'')+'$'+Math.abs(n).toLocaleString('es-CO',{minimumFractionDigits:d?2:0, maximumFractionDigits:d?2:0}); }
  function fmt0(n){ return (n<0?'−':'')+'$'+Math.round(Math.abs(n)).toLocaleString('es-CO'); }   // cifras derivadas (promedios, divisiones)

  /* ---------- Festivos de Colombia (Ley Emiliani), igual que la calculadora ---------- */
  function pascua(y){
    var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
      h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
      mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;
    return new Date(y,mes-1,dia);
  }
  var _fest = {};
  function festivos(y){
    if(_fest[y]) return _fest[y];
    var s = {}, sum = function(d,n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()+n); }, lun = function(d){ var w = d.getDay(); return w===1 ? d : sum(d,(8-w)%7); }, p = pascua(y);
    [new Date(y,0,1), lun(new Date(y,0,6)), lun(new Date(y,2,19)), sum(p,-3), sum(p,-2), new Date(y,4,1), lun(sum(p,39)), lun(sum(p,60)), lun(sum(p,68)),
     lun(new Date(y,5,29)), new Date(y,6,20), new Date(y,7,7), lun(new Date(y,7,15)), lun(new Date(y,9,12)), lun(new Date(y,10,1)), lun(new Date(y,10,11)),
     new Date(y,11,8), new Date(y,11,25)].forEach(function(d){ s[iso(d)] = 1; });
    return (_fest[y] = s);
  }
  function habil(s){ var w = fecha(s).getDay(); return w!==0 && w!==6 && !festivos(+s.slice(0,4))[s]; }
  // Día de pago de un mes: el último día hábil (o el día que elijas); si cae en fin de semana o festivo, el hábil anterior
  function diaDePago(y, m0, pago){
    var d = (pago && pago.modo==='dia' && pago.dia>=1 && pago.dia<=31) ? pago.dia : 31, s = isoYMD(y, m0, d), n = 0;
    while(!habil(s) && n<10){ s = masDias(s,-1); n++; }
    return s;
  }
  function pagoDelMes(i, pago){ return diaDePago(Math.floor(i/12), i%12, pago); }

  /* ---------- Configuración de Hoy (co_hoy) ---------- */
  var esObj = function(o){ return !!o && typeof o==='object' && !Array.isArray(o); };
  var numOk = function(v, d){ var n = Number(v); return Number.isFinite(n) ? n : d; };
  var idOk = function(v){ return String(v==null?'':v).slice(0,60).replace(/[^\w.\-:]/g,'_'); };
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/, MONTH_RE = /^\d{4}-\d{2}$/;
  function limpiarConfig(raw){
    var c = esObj(raw) ? raw : {}, o = {v:1};
    var p = esObj(c.pago) ? c.pago : {};
    o.pago = {modo: p.modo==='dia' ? 'dia' : 'ultimo_habil', dia: Math.min(31, Math.max(1, Math.round(numOk(p.dia, 30))))};
    var s = esObj(c.salario) ? c.salario : {};
    o.salario = {fuente: ['auto','manual','ninguno'].indexOf(s.fuente)>=0 ? s.fuente : 'auto', monto: Math.max(0, r2(numOk(s.monto,0))), nombre: String(s.nombre||'').slice(0,60)};
    o.cuentas = {}; if(esObj(c.cuentas)) Object.keys(c.cuentas).forEach(function(k){ if(typeof c.cuentas[k]==='boolean') o.cuentas[idOk(k)] = c.cuentas[k]; });
    o.piso = Math.max(0, r2(numOk(c.piso,0)));
    o.colchon = c.colchon==='no' ? 'no' : 'auto';   // auto: lo que tenías antes de que llegara el sueldo no se reparte
    var per = function(v){ v = Math.round(numOk(v,1)); return [1,2,3,4,6,12].indexOf(v)>=0 ? v : 1; };
    o.fijos = (Array.isArray(c.fijos) ? c.fijos : []).filter(function(f){ return esObj(f) && f.id && f.catId; }).map(function(f){ return {
      id: idOk(f.id), catId: idOk(f.catId), subId: idOk(f.subId||''), periodo: per(f.periodo), ancla: MONTH_RE.test(f.ancla) ? f.ancla : '',
      dia: Math.min(31, Math.max(1, Math.round(numOk(f.dia, 1)))), modo: ['variable','suma'].indexOf(f.modo)>=0 ? f.modo : 'fijo', monto: Math.max(0, r2(numOk(f.monto,0))),
      creado: DATE_RE.test(f.creado) ? f.creado : '2000-01-01', conSueldo: f.conSueldo===true }; });
    o.ingresos = (Array.isArray(c.ingresos) ? c.ingresos : []).filter(function(f){ return esObj(f) && f.id && String(f.nombre||'').trim(); }).map(function(f){ return {
      id: idOk(f.id), nombre: String(f.nombre).slice(0,60), dia: Math.min(31, Math.max(1, Math.round(numOk(f.dia, 1)))), margen: Math.min(15, Math.max(0, Math.round(numOk(f.margen, 5)))),
      monto: Math.max(0, r2(numOk(f.monto,0))), periodo: per(f.periodo), ancla: MONTH_RE.test(f.ancla) ? f.ancla : '', creado: DATE_RE.test(f.creado) ? f.creado : '2000-01-01' }; });
    o.tarjetas = {}; if(esObj(c.tarjetas)) Object.keys(c.tarjetas).forEach(function(k){ var t = c.tarjetas[k]; if(esObj(t)){ var d = Math.round(numOk(t.dia,0)); o.tarjetas[idOk(k)] = d>=1 && d<=31 ? {dia:d} : {}; } });
    o.deudas = {}; if(esObj(c.deudas)) Object.keys(c.deudas).forEach(function(k){ var t = c.deudas[k]; if(esObj(t)){ var d = Math.round(numOk(t.dia,0)), x = {}; if(d>=1 && d<=31) x.dia = d; if(t.off===true) x.off = true; if(t.conSueldo===true) x.conSueldo = true; o.deudas[idOk(k)] = x; } });
    o.omitir = {}; if(esObj(c.omitir)) Object.keys(c.omitir).forEach(function(k){ if(c.omitir[k]===true && /^[\w.\-:]+\|\d{4}-\d{2}-\d{2}$/.test(k)) o.omitir[k] = true; });
    o.descartados = (Array.isArray(c.descartados) ? c.descartados : []).filter(function(x){ return typeof x==='string' && x.length<=120; });
    return o;
  }

  /* ---------- Gestor: cuentas, saldos y tarjetas (mismas reglas que el gestor) ---------- */
  function tipoCuenta(a){ return ['efectivo','banco','tarjeta','ahorro'].indexOf(a.type)>=0 ? a.type : (/efectivo/i.test(a.name||'') ? 'efectivo' : 'banco'); }
  function preparar(G){
    G = esObj(G) ? G : {};
    var L = function(k){ return Array.isArray(G[k]) ? G[k].filter(esObj) : []; };
    var D = { accounts:L('accounts'), categories:L('categories'), expenses:L('expenses').filter(function(e){ return DATE_RE.test(e.date) && Number(e.amount)>0; }),
      incomes:L('incomes').filter(function(e){ return DATE_RE.test(e.date) && Number(e.amount)>0; }), transfers:L('transfers').filter(function(t){ return DATE_RE.test(t.date) && Number(t.amount)>0; }),
      adjustments:L('adjustments').filter(function(t){ return DATE_RE.test(t.date) && Number(t.amount); }), debts:L('debts') };
    D.acc = {}; D.accounts.forEach(function(a){ D.acc[a.id] = a; a._tipo = tipoCuenta(a); });
    // saldo inicial (datos muy viejos sin «inicial»: se deduce como lo hace el gestor)
    D.accounts.forEach(function(a){
      if(typeof a.inicial==='number' && Number.isFinite(a.inicial)){ a._ini = a.inicial; return; }
      var v = Number(a.balance)||0;
      D.incomes.forEach(function(i){ if(i.accountId===a.id && i.applied!==false) v -= i.amount; });
      D.expenses.forEach(function(e){ if(e.accountId===a.id && e.applied!==false) v += e.amount; });
      D.adjustments.forEach(function(j){ if(j.accountId===a.id) v -= j.amount; });
      D.transfers.forEach(function(t){ if(t.fromId===a.id) v += t.amount; if(t.toId===a.id) v -= t.amount; });
      a._ini = r2(v);
    });
    D.sub = {}; D.categories.forEach(function(c){ (Array.isArray(c.subcats)?c.subcats:[]).forEach(function(s){ if(esObj(s)) D.sub[c.id+'/'+s.id] = {cat:c, sub:s}; }); });
    return D;
  }
  function saldosHasta(D, fin){
    var m = {}; D.accounts.forEach(function(a){ m[a.id] = a._ini||0; });
    var add = function(id, v){ if(id in m) m[id] += v; };
    D.incomes.forEach(function(i){ if(i.date<=fin) add(i.accountId, +i.amount); });
    D.expenses.forEach(function(e){ if(e.date<=fin) add(e.accountId, -e.amount); });
    D.adjustments.forEach(function(a){ if(a.date<=fin) add(a.accountId, +a.amount); });
    D.transfers.forEach(function(t){ if(t.date<=fin){ add(t.fromId, -t.amount); add(t.toId, +t.amount); } });
    Object.keys(m).forEach(function(k){ m[k] = r2(m[k]); });
    return m;
  }
  var esTarjeta = function(a){ return !!a && a._tipo==='tarjeta'; };
  function cuotaValor(a, e){ var n = e.cuotas||1, P = e.amount, i = (a && a.tasaM) || 0; if(n<=1) return r2(P); return Math.round(i>0 ? P*i/(1-Math.pow(1+i,-n)) : P/n); }
  function primerMesCuota(a, e){ var m = mIdx(e.date); if(a && a.diaCorte && (+e.date.slice(8,10)) > a.diaCorte) m++; return m; }
  function nivelDe(D, e){ var x = D.sub[e.catId+'/'+e.subId]; return x ? x.sub.nivel : (e.nivel || 'quiero'); }
  function nombreSub(D, catId, subId){ var x = D.sub[catId+'/'+subId]; if(x) return x.sub.name; var c = D.categories.find(function(c){ return c.id===catId; }); return c ? c.name : 'Gasto fijo'; }

  /* ---------- Deudas del gestor: el saldo se calcula igual que allá ---------- */
  function pagosDeuda(D, d, hasta){
    return D.expenses.filter(function(e){ return e.date<=hasta && e.catId===d.catId && (!d.subId || e.subId===d.subId) && esObj(d.base) && e.date>=d.base.fecha; })
      .sort(function(a,b){ return a.date===b.date ? (a.timestamp||0)-(b.timestamp||0) : a.date.localeCompare(b.date); });
  }
  function saldoDeuda(D, d, hoy){
    if(!esObj(d.base)) return 0;
    var i = d.tasaM||0, S = d.seguro||0, saldo = Number(d.base.saldo)||0, cobrados = {};
    var ev = pagosDeuda(D, d, hoy).map(function(e){ return {t:'p', date:e.date, monto:e.amount}; })
      .concat((Array.isArray(d.ajustes)?d.ajustes:[]).filter(function(a){ return a && a.fecha>=d.base.fecha && a.fecha<=hoy; }).map(function(a){ return {t:'a', date:a.fecha, saldo:a.saldo}; }));
    ev.sort(function(a,b){ return a.date===b.date ? (a.t==='a'?1:0)-(b.t==='a'?1:0) : a.date.localeCompare(b.date); });
    ev.forEach(function(x){
      if(x.t==='a'){ saldo = x.saldo; return; }
      var k = x.date.slice(0,7), it = 0, sg = 0;
      if(!cobrados[k]){ cobrados[k] = 1; sg = Math.min(S, x.monto); it = Math.min(x.monto-sg, r2(saldo*i)); }
      saldo = r2(saldo - Math.min(Math.max(0, x.monto-sg-it), saldo));
    });
    return saldo;
  }
  function diaFrecuente(lista){ var c = {}, best = 0, bd = 0; lista.forEach(function(s){ var d = +s.slice(8,10); c[d] = (c[d]||0)+1; if(c[d]>best || (c[d]===best && d>bd)){ best = c[d]; bd = d; } }); return bd; }

  /* ---------- Período: de hoy al día antes del próximo sueldo ---------- */
  function esSalario(i, cfg){ if(i.noIngreso) return false; var n = norm(i.desc); return SALARIO_RE.test(n) || (!!cfg.salario.nombre && n===norm(cfg.salario.nombre)); }
  function llegadaSueldo(D, cfg, pago, hasta){   // primer ingreso de sueldo desde 7 días antes del día de pago
    var desde = masDias(pago, -7), l = D.incomes.filter(function(i){ return i.date>=desde && i.date<=hasta && esSalario(i, cfg); }).sort(function(a,b){ return a.date.localeCompare(b.date); });
    return l[0] || null;
  }
  function montoSueldo(CR, cfg, pago){
    if(cfg.salario.fuente==='ninguno') return {monto:0, fuente:'ninguno', extras:[]};
    var mes = CR && esObj(CR.meses) ? CR.meses[pago.slice(0,7)] : null;
    if(cfg.salario.fuente!=='manual' && esObj(mes) && Number(mes.neto)>0){
      var ex = [];
      if(Number(mes.prima)>0) ex.push({nombre:'Prima', monto:r2(mes.prima)});
      if(Number(mes.intereses)>0) ex.push({nombre:'Intereses de cesantías', monto:r2(mes.intereses)});
      return {monto:r2(mes.neto), fuente:'calculadora', verificado:mes.verificado===true, extras:ex};
    }
    if(cfg.salario.monto>0) return {monto:cfg.salario.monto, fuente:'manual', extras:[]};
    return {monto:0, fuente:'desconocido', extras:[]};
  }
  function periodo(D, cfg, hoy){
    var i = mIdx(hoy), P0 = pagoDelMes(i, cfg.pago);
    if(P0 < hoy){ i++; P0 = pagoDelMes(i, cfg.pago); }
    var r = {hoyEsPago:false, atrasado:null};
    var lleg = llegadaSueldo(D, cfg, P0, hoy);
    if(lleg){                                                        // el sueldo de este pago ya llegó (a tiempo o adelantado): arranca el período siguiente
      r.inicio = lleg.date > hoy ? hoy : lleg.date; r.llego = lleg; r.pagoAnterior = P0; r.pago = pagoDelMes(i+1, cfg.pago);
      return r;
    }
    var Pp = pagoDelMes(i-1, cfg.pago), llegP = llegadaSueldo(D, cfg, Pp, hoy);
    if(P0===hoy){                                                    // hoy es día de pago y aún no aparece registrado
      r.hoyEsPago = true; r.inicio = hoy; r.pagoAnterior = P0; r.pago = pagoDelMes(i+1, cfg.pago); return r;
    }
    r.pago = P0; r.pagoAnterior = Pp;
    if(llegP){ r.inicio = llegP.date; r.llego = llegP; }
    else { r.inicio = Pp > hoy ? hoy : Pp; if(entre(Pp, hoy)<=10) r.atrasado = Pp; }
    if(r.inicio > hoy) r.inicio = hoy;
    return r;
  }

  /* ---------- Ocurrencias de fijos e ingresos esperados ---------- */
  function ocurrencias(item, desde, hasta, pago){
    var out = [], a = mIdx(desde)-1, b = mIdx(hasta)+1, anc = item.ancla ? mIdx(item.ancla+'-01') : null;
    for(var m=a; m<=b; m++){
      if(item.periodo>1 && anc!==null && (((m-anc)%item.periodo)+item.periodo)%item.periodo!==0) continue;
      out.push(item.conSueldo ? pagoDelMes(m, pago) : isoYMD(Math.floor(m/12), m%12, item.dia));   // «lo pago con el sueldo»: cae el día de pago y es del período que ese sueldo abre
    }
    return out;
  }
  function asignarCercano(fechasPago, ocs){   // cada pago va a la ocurrencia más cercana (empate: la anterior)
    var res = {}; ocs.forEach(function(o){ res[o] = []; });
    fechasPago.forEach(function(p){
      var mejor = null, dm = 1e9; ocs.forEach(function(o){ var d = Math.abs(entre(o, p.date)); if(d<dm || (d===dm && o<mejor)){ dm = d; mejor = o; } });
      if(mejor) res[mejor].push(p);
    });
    return res;
  }
  // Ventanas de sueldo a sueldo: la actual y las anteriores (cada una empieza el día que llegó ese sueldo, o su día de pago)
  function ventanasPeriodo(D, cfg, P, n){
    var out = [{ini:P.inicio, fin:masDias(P.pago,-1)}], ini = P.inicio, idx = mIdx(P.pagoAnterior || P.inicio);
    for(var k=1; k<=n; k++){
      var pk = pagoDelMes(idx-k, cfg.pago); if(pk >= ini) continue;
      var ll = llegadaSueldo(D, cfg, pk, masDias(ini,-1)), s0 = ll && ll.date < ini ? ll.date : pk;
      out.push({ini:s0, fin:masDias(ini,-1)}); ini = s0;
    }
    return out;
  }
  function fijosDelPeriodo(D, cfg, P, hoy){
    var lista = [], vistos = {};
    cfg.fijos.forEach(function(f){ vistos[f.catId+'/'+f.subId] = 1; lista.push(Object.assign({}, f, {nombre:nombreSub(D, f.catId, f.subId), nivel:(D.sub[f.catId+'/'+f.subId]||{sub:{}}).sub.nivel||'debo'})); });
    D.debts.forEach(function(d){                                       // las cuotas de tus deudas son fijos automáticos
      var o = cfg.deudas[d.id] || {}; if(o.off || !(Number(d.cuota)>0) || vistos[d.catId+'/'+(d.subId||'')]) return;
      if(saldoDeuda(D, d, hoy) <= 0.5) return;
      var hist = pagosDeuda(D, d, hoy).map(function(e){ return e.date; }).slice(-6);
      var dia = o.dia || diaFrecuente(hist) || (esObj(d.base) && DATE_RE.test(d.base.fecha) ? +d.base.fecha.slice(8,10) : 1);
      lista.push({id:'deuda_'+d.id, deudaId:d.id, auto:'deuda', catId:d.catId, subId:d.subId||'', periodo:1, ancla:'', dia:dia, conSueldo:o.conSueldo===true, modo:'fijo', monto:r2((Number(d.cuota)||0)+(Number(d.seguro)||0)),
        creado: DATE_RE.test(d.creada) ? d.creada : (esObj(d.base) && DATE_RE.test(d.base.fecha) ? d.base.fecha : '2000-01-01'), nombre:'Cuota · '+(d.nombre||'Deuda'), nivel:'debo', diaAuto:!o.dia});
    });
    var fin = masDias(P.pago,-1), out = [], usados = {};
    lista.forEach(function(f){
      var pagos = D.expenses.filter(function(e){ return e.catId===f.catId && (!f.subId || e.subId===f.subId) && e.date<=fin; });
      if(f.modo==='suma'){                                              // varios cobros en la misma subcategoría: se suman los del período (de sueldo a sueldo)
        var V = ventanasPeriodo(D, cfg, P, 3), enV = function(v){ return pagos.filter(function(e){ return e.date>=v.ini && e.date<=v.fin; }); };
        var cur = enV(V[0]), histS = V.slice(1).map(function(v){ return suma(enV(v), function(e){ return e.amount; }); }).filter(function(x){ return x>0; });
        var est = f.monto>0 ? f.monto : (histS.length ? r2(suma(histS)/histS.length) : 0), pag = suma(cur, function(e){ return e.amount; }), om = cfg.omitir[f.id+'|'+V[0].ini]===true, st, fa;
        if(om){ st = 'omitido'; fa = 0; }
        else if(pag>0 && pag >= est*0.98 - 1){ st = 'pagado'; fa = 0; }
        else if(pag>0){ st = 'parcial'; fa = r2(est - pag); }
        else { st = 'pendiente'; fa = est; }
        pagos.forEach(function(e){ usados[e.id] = f.id; });          // todo lo de esa subcategoría es de este fijo, no gasto del día a día
        out.push({id:f.id, clave:f.id+'|'+V[0].ini, nombre:f.nombre, nivel:f.nivel, catId:f.catId, subId:f.subId, auto:null, deudaId:null, fecha:fin, ventana:V[0], modo:'suma', periodo:1,
          conSueldo:false, estimado:est, estimadoFuente: f.monto>0 ? 'tuyo' : 'promedio', nHist:histS.length, pagado:pag, falta:r2(Math.max(0,fa)), estado:st,
          pagos:cur.map(function(e){ return {id:e.id, date:e.date, amount:e.amount, desc:e.desc||'', accountId:e.accountId}; }), diaAuto:false});
        return;
      }
      // historial: ocurrencias de los últimos 6 ciclos para estimar los variables
      var ocsA = ocurrencias(f, masDias(P.inicio, -31*f.periodo*4 - 31), masDias(fin, 31*f.periodo), cfg.pago).filter(function(o){ return o<=masDias(fin, 31*f.periodo); });
      var ocsH = ocsA.filter(function(o){ return o<=fin; });
      var asig = asignarCercano(pagos.filter(function(e){ return e.date >= masDias(ocsA[0]||fin, -31*f.periodo); }), ocsA);
      var hist = ocsH.filter(function(o){ return o < P.inicio && asig[o].length; }).slice(-3).map(function(o){ return suma(asig[o], function(e){ return e.amount; }); });
      var estimado = f.modo==='variable' && hist.length ? r2(suma(hist)/hist.length) : f.monto;
      if(f.modo==='variable' && !hist.length && !(f.monto>0)) estimado = 0;
      ocsH.forEach(function(o){
        var enPeriodo = o>=P.inicio && o<=fin, previa = o<P.inicio && o>=masDias(P.inicio, -10) && o>=f.creado;   // vencido justo antes del sueldo: sigue pendiente
        if(!enPeriodo && !previa) return;
        var pg = asig[o] || [], pagado = suma(pg, function(e){ return e.amount; }), omit = cfg.omitir[f.id+'|'+o]===true;
        if(previa && (pagado>0 || omit)) return;                     // ciclo anterior ya resuelto
        var esperado = estimado, estado, falta;
        if(omit){ estado = 'omitido'; falta = 0; }
        else if(pagado>0 && (f.modo==='variable' || pagado >= esperado*0.98 - 1)){ estado = 'pagado'; falta = 0; }
        else if(pagado>0){ estado = 'parcial'; falta = r2(esperado - pagado); }
        else { estado = o < hoy ? 'atrasado' : 'pendiente'; falta = esperado; }
        pg.forEach(function(e){ usados[e.id] = f.id; });
        out.push({id:f.id, clave:f.id+'|'+o, nombre:f.nombre, nivel:f.nivel, catId:f.catId, subId:f.subId, auto:f.auto||null, deudaId:f.deudaId||null, fecha:o, modo:f.modo, periodo:f.periodo,
          conSueldo:!!f.conSueldo, estimado:esperado, estimadoFuente: f.modo==='variable' ? (hist.length ? 'promedio' : 'tuyo') : 'fijo', nHist:hist.length, pagado:pagado, falta:r2(Math.max(0,falta)), estado:estado,
          pagos:pg.map(function(e){ return {id:e.id, date:e.date, amount:e.amount, desc:e.desc||'', accountId:e.accountId}; }), diaAuto:!!f.diaAuto});
      });
      // los pagos que caen en ocurrencias viejas (ya fuera de la vista) igual son de este fijo: no son gasto variable
      Object.keys(asig).forEach(function(o){ asig[o].forEach(function(e){ if(!usados[e.id]) usados[e.id] = f.id; }); });
    });
    out.sort(function(a,b){ return a.fecha.localeCompare(b.fecha); });
    return {lista:out, usados:usados};
  }
  function coincideNombre(a, b){ a = norm(a); b = norm(b); if(!a || !b) return false; if(a===b) return true; return (a.length>=3 && b.indexOf(a)>=0) || (b.length>=3 && a.indexOf(b)>=0); }
  function ingresosDelPeriodo(D, cfg, P, hoy, cuentasDia){
    var fin = masDias(P.pago,-1), out = [], usados = {};
    cfg.ingresos.forEach(function(it){
      var ocs = ocurrencias(it, masDias(P.inicio, -62), masDias(fin, 31), cfg.pago);
      var llegaron = D.incomes.filter(function(i){ return !usados[i.id] && !esSalario(i, cfg) && coincideNombre(i.desc, it.nombre) && i.date<=fin && i.date>=masDias(ocs[0], -it.margen); });
      var asig = asignarCercano(llegaron, ocs);
      ocs.forEach(function(o){
        var ini = masDias(o, -it.margen), finV = masDias(o, it.margen), rec = asig[o] || [];
        rec.forEach(function(i){ usados[i.id] = it.id; });
        if(ini > fin || (o < P.inicio && !(rec.length && rec.some(function(i){ return i.date>=P.inicio; })))) return;   // no toca en este período
        if(o < it.creado && !rec.length && finV < hoy) return;
        var recibido = suma(rec, function(i){ return i.amount; }), estado, cuenta = 0;
        if(rec.length) estado = 'recibido';
        else if(finV < hoy) estado = 'atrasado';
        else if(finV <= fin){ estado = 'por_llegar'; cuenta = it.monto; }
        else estado = 'despues';                                       // puede llegar después de tu pago: no se cuenta
        out.push({id:it.id, clave:it.id+'|'+o, nombre:it.nombre, fecha:o, desde:ini, hasta:finV, margen:it.margen, monto:it.monto, recibido:recibido, estado:estado, cuenta:cuenta,
          llegadas:rec.map(function(i){ return {id:i.id, date:i.date, amount:i.amount, desc:i.desc||''}; })});
      });
    });
    out.sort(function(a,b){ return a.fecha.localeCompare(b.fecha); });
    return {lista:out, usados:usados};
  }

  /* ---------- Tarjetas: lo que vence antes del pago + lo que compras en el período ---------- */
  function tarjetas(D, cfg, P, hoy, saldoFin, cuentasDia){
    var fin = masDias(P.pago,-1), out = [];
    D.accounts.filter(esTarjeta).forEach(function(a){
      var c = a.diaCorte || 0, conf = cfg.tarjetas[a.id] || {}, d = conf.dia || 0, venc = [];
      if(d){ for(var m=mIdx(P.inicio); m<=mIdx(fin); m++){ var E = isoYMD(Math.floor(m/12), m%12, d); if(E>=P.inicio && E<=fin) venc.push({E:E, S: (c && d>c) ? m : m-1}); } }
      else { var mf = mIdx(fin); venc.push({E:fin, S: (c && c <= +fin.slice(8,10)) ? mf : mf-1, supuesto:true}); }
      var compras = D.expenses.filter(function(e){ return e.accountId===a.id; });
      var pagos = D.transfers.filter(function(t){ return t.toId===a.id && !esTarjeta(D.acc[t.fromId]); });
      var previo = 0, detPrevio = [];
      venc.forEach(function(v){
        var corte = c ? isoYMD(Math.floor(v.S/12), v.S%12, c) : isoYMD(Math.floor(v.S/12), v.S%12, 31);
        var bruto = 0;
        compras.forEach(function(e){ if(e.date>=P.inicio) return; var n = e.cuotas||1, m0 = primerMesCuota(a,e); if(v.S>=m0 && v.S<m0+n) bruto += cuotaValor(a,e); });
        var pagAntes = suma(pagos.filter(function(t){ return t.date>corte && t.date<P.inicio; }), function(t){ return t.amount; });
        var p = r2(Math.max(0, bruto - pagAntes)); previo += p;
        detPrevio.push({vence:v.E, mes:mKey(v.S), bruto:r2(bruto), pagadoAntes:pagAntes, pendiente:p, supuesto:!!v.supuesto});
      });
      var enPer = compras.filter(function(e){ return e.date>=P.inicio && e.date<=fin; }).map(function(e){ return {e:e, valor:cuotaValor(a,e)}; });
      var avances = D.transfers.filter(function(t){ return t.fromId===a.id && t.date>=P.inicio && t.date<=fin && !esTarjeta(D.acc[t.toId]); });
      var pagosPer = pagos.filter(function(t){ return t.date>=P.inicio && t.date<=fin; });
      var bruto = r2(previo + suma(enPer, function(x){ return x.valor; }) + suma(avances, function(t){ return t.amount; }));
      var pagado = suma(pagosPer, function(t){ return t.amount; });
      var deudaFin = Math.max(0, -(saldoFin[a.id]||0));
      var comp = r2(Math.min(Math.max(0, bruto - pagado), deudaFin));
      if(!(bruto>0) && !(pagado>0) && !(deudaFin>0)) return;
      out.push({id:a.id, nombre:a.name||'Tarjeta', previo:r2(previo), detPrevio:detPrevio, enPeriodo:enPer.map(function(x){ return {id:x.e.id, date:x.e.date, amount:x.e.amount, valor:x.valor, cuotas:x.e.cuotas||1, desc:x.e.desc||''}; }),
        avances:avances.map(function(t){ return {id:t.id, date:t.date, amount:t.amount}; }), pagos:pagosPer.map(function(t){ return {id:t.id, date:t.date, amount:t.amount}; }),
        bruto:bruto, pagado:pagado, exceso:r2(Math.max(0, pagado - bruto)), deuda:deudaFin, compromiso:comp, sinDia:!d, dia:d||null, corte:c||null, tasaM:a.tasaM||0});
    });
    return out;
  }

  /* ---------- Cálculo principal ---------- */
  function calcular(G, CR, cfgRaw, hoy){
    var cfg = limpiarConfig(cfgRaw), D = preparar(G);
    var R = {ok:true, hoy:hoy, cfg:cfg, mensajes:[]};
    var noTarjeta = D.accounts.filter(function(a){ return !esTarjeta(a); });
    if(!noTarjeta.length){ R.ok = false; R.motivo = 'sin_cuentas'; return R; }
    var esDia = function(a){ return !!a && !esTarjeta(a) && (cfg.cuentas[a.id]!==undefined ? cfg.cuentas[a.id] : a._tipo!=='ahorro'); };
    var diaIds = {}; noTarjeta.forEach(function(a){ if(esDia(a)) diaIds[a.id] = 1; });
    R.cuentas = noTarjeta.map(function(a){ return {id:a.id, nombre:a.name||'Cuenta', tipo:a._tipo, incluida:!!diaIds[a.id]}; });
    if(!Object.keys(diaIds).length){ R.ok = false; R.motivo = 'sin_cuentas_dia'; return R; }

    var P = periodo(D, cfg, hoy), fin = masDias(P.pago,-1);
    R.inicio = P.inicio; R.fin = fin; R.pago = P.pago; R.dias = entre(hoy, P.pago); R.diasPeriodo = entre(P.inicio, P.pago); R.diaN = entre(P.inicio, hoy) + 1;
    R.hoyEsPago = P.hoyEsPago; R.sueldoAtrasado = P.atrasado; R.llego = P.llego ? {date:P.llego.date, amount:P.llego.amount, desc:P.llego.desc} : null;
    R.sueldo = montoSueldo(CR, cfg, P.pago); R.sueldo.fecha = P.pago;
    R.sueldoHoy = P.hoyEsPago ? montoSueldo(CR, cfg, hoy) : null;

    var sHoy = saldosHasta(D, hoy), sFin = saldosHasta(D, fin), sAyer = saldosHasta(D, masDias(hoy,-1));
    R.cuentasDia = noTarjeta.filter(function(a){ return diaIds[a.id]; }).map(function(a){ return {id:a.id, nombre:a.name||'Cuenta', tipo:a._tipo, hoy:sHoy[a.id], fin:sFin[a.id]}; });
    R.saldoHoy = suma(R.cuentasDia, function(c){ return c.hoy; });
    R.programado = r2(suma(R.cuentasDia, function(c){ return c.fin; }) - R.saldoHoy);
    // lo ya registrado con fecha futura (antes del pago) en tus cuentas del día a día
    R.futuros = [];
    D.expenses.forEach(function(e){ if(e.date>hoy && e.date<=fin && diaIds[e.accountId]) R.futuros.push({tipo:'gasto', date:e.date, amount:-e.amount, desc:e.desc||nombreSub(D,e.catId,e.subId), id:e.id}); });
    D.incomes.forEach(function(i){ if(i.date>hoy && i.date<=fin && diaIds[i.accountId]) R.futuros.push({tipo:'ingreso', date:i.date, amount:+i.amount, desc:i.desc||'Ingreso', id:i.id}); });
    D.transfers.forEach(function(t){ if(t.date<=hoy || t.date>fin) return; var de = !!diaIds[t.fromId], a = !!diaIds[t.toId]; if(de===a) return; R.futuros.push({tipo:'transfer', date:t.date, amount: de ? -t.amount : +t.amount, desc:t.desc||((D.acc[t.fromId]||{}).name+' → '+(D.acc[t.toId]||{}).name), id:t.id}); });
    D.adjustments.forEach(function(j){ if(j.date>hoy && j.date<=fin && diaIds[j.accountId]) R.futuros.push({tipo:'ajuste', date:j.date, amount:j.amount, desc:'Ajuste de saldo', id:j.id}); });
    R.futuros.sort(function(a,b){ return a.date.localeCompare(b.date); });

    var FJ = fijosDelPeriodo(D, cfg, P, hoy), IN = ingresosDelPeriodo(D, cfg, P, hoy, diaIds), TJ = tarjetas(D, cfg, P, hoy, sFin, diaIds);
    R.fijos = FJ.lista; R.esperados = IN.lista; R.tarjetas = TJ;
    R.totFijos = suma(R.fijos.filter(function(f){ return f.estado!=='pagado' && f.estado!=='omitido'; }), function(f){ return f.falta; });
    R.totEsperados = suma(R.esperados, function(i){ return i.cuenta; });
    R.totTarjetas = suma(R.tarjetas, function(t){ return t.compromiso; });
    R.piso = cfg.piso;
    // ---- colchón: lo que había en tus cuentas del día a día antes de que llegara el sueldo. No se reparte: el período vive de lo que entra en él.
    var hayHistoria = function(antes){ var t = function(x){ return x.date<antes; };
      return D.expenses.some(function(e){ return t(e) && diaIds[e.accountId]; }) || D.incomes.some(function(i){ return t(i) && diaIds[i.accountId]; }) || D.transfers.some(function(x){ return t(x) && (diaIds[x.fromId] || diaIds[x.toId]); }); };
    var saldoDiaEn = function(f){ var m = saldosHasta(D, f); return suma(Object.keys(diaIds), function(k){ return m[k]||0; }); };
    var esReserva = function(id){ var a = D.acc[id]; return !!a && !diaIds[id] && !esTarjeta(a); };   // cuentas fuera del día a día (ahorro)
    R.colchonModo = cfg.colchon;
    R.colchonIni = (cfg.colchon==='auto' && hayHistoria(P.inicio)) ? Math.max(0, saldoDiaEn(masDias(P.inicio,-1))) : null;
    R.extraSueldoHoy = R.sueldoHoy && R.sueldoHoy.monto>0 ? r2(R.sueldoHoy.monto + suma(R.sueldoHoy.extras, function(x){ return x.monto; })) : 0;

    // ---- gasto variable: lo que no es fijo, ni cuota de deuda; con tarjeta cuenta en el día de la compra (a cuotas, la primera)
    var tjVal = {}; TJ.forEach(function(t){ t.enPeriodo.forEach(function(x){ tjVal[x.id] = x.valor; }); });
    var esVariable = function(e){ return !FJ.usados[e.id] && (diaIds[e.accountId] || esTarjeta(D.acc[e.accountId])); };
    var valorVar = function(e){ return esTarjeta(D.acc[e.accountId]) ? (tjVal[e.id]!==undefined ? tjVal[e.id] : cuotaValor(D.acc[e.accountId], e)) : e.amount; };
    var varDe = function(f){ return D.expenses.filter(function(e){ return e.date===f && esVariable(e); }); };
    var gHoy = varDe(hoy);
    R.gastoHoy = suma(gHoy, valorVar);
    R.gastosHoy = gHoy.map(function(e){ return {id:e.id, desc:e.desc||nombreSub(D,e.catId,e.subId), cat:nombreSub(D,e.catId,e.subId), amount:e.amount, valor:valorVar(e), tarjeta:esTarjeta(D.acc[e.accountId]), cuotas:e.cuotas||1, noGasto:!!e.noGasto, nivel:nivelDe(D,e)}; });

    // ---- dos límites; manda el menor:
    // 1) CAJA: lo que hay en tus cuentas (con lo programado y lo esperado) menos fijos, tarjetas y piso.
    R.libreTotal = r2(R.saldoHoy + R.programado + R.totEsperados + R.extraSueldoHoy - R.totFijos - R.totTarjetas);
    R.libreCaja = r2(R.libreTotal - R.piso);
    // 2) LO QUE GANAS: tu sueldo normal + otros ingresos del período − los fijos del período − lo que ya gastaste en el día a día.
    //    Lo que pase de ahí es tu colchón: no se reparte (si sobra al final, el colchón crece).
    var perVar = D.expenses.filter(function(e){ return e.date>=P.inicio && e.date<=hoy && esVariable(e); });
    R.gastoPeriodo = suma(perVar, valorVar);
    var extras = D.incomes.filter(function(i){ return i.date>=P.inicio && i.date<=hoy && diaIds[i.accountId] && !i.noIngreso && !IN.usados[i.id] && !esSalario(i, cfg); });
    R.flujo = null;
    var sueldoNormal = R.sueldo && R.sueldo.monto>0 ? R.sueldo.monto : (P.llego ? P.llego.amount : 0);
    if(cfg.colchon==='auto' && sueldoNormal>0){
      var fijosPer = R.fijos.filter(function(f){ return f.fecha>=P.inicio; });
      var F = {sueldo:sueldoNormal, sueldoFuente: R.sueldo && R.sueldo.monto>0 ? R.sueldo.fuente : 'llegada',
        esperados: suma(R.esperados, function(x){ return x.estado==='recibido' ? x.recibido : x.cuenta; }),
        extras: suma(extras, function(i){ return i.amount; }), nExtras: extras.length,
        fijos: suma(fijosPer, function(f){ return f.estado==='pagado' ? f.pagado : Math.max(f.estimado, f.pagado); }), nFijos: fijosPer.length};
      F.cupo = r2(F.sueldo + F.esperados + F.extras - F.fijos);
      F.libre = r2(F.cupo - R.gastoPeriodo);
      F.ritmo = R.diasPeriodo>0 ? r2(F.cupo / R.diasPeriodo) : 0;
      R.flujo = F;
    }
    R.limita = R.flujo && R.flujo.libre < R.libreCaja ? 'flujo' : 'caja';
    R.libre = R.limita==='flujo' ? R.flujo.libre : R.libreCaja;
    R.colchonHoy = R.limita==='flujo' ? r2(R.libreCaja - R.flujo.libre) : 0;   // lo que hay de más en tus cuentas y no se reparte
    R.libreInicioHoy = r2(R.libre + R.gastoHoy);
    R.presupuestoHoy = R.libreInicioHoy > 0 ? r2(R.libreInicioHoy / R.dias) : 0;
    R.quedaHoy = r2(R.presupuestoHoy - R.gastoHoy);
    R.deficit = R.libre < 0 ? r2(-R.libre) : 0;
    R.deficitColchon = R.deficit>0 && R.limita==='flujo' && R.libreCaja >= 0;   // la plata está, pero ya gastaste lo que te deja tu sueldo
    R.manana = R.dias>1 ? (R.libre>0 ? r2(R.libre/(R.dias-1)) : 0) : null;

    // ---- línea del período (gasto variable por día) y promedio típico (últimos 60 días, sin fijos ni «no cuenta como gasto»)
    R.linea = [];
    for(var f=P.inicio; f<=fin; f=masDias(f,1)) R.linea.push({f:f, gasto: f<=hoy ? suma(varDe(f), valorVar) : null});
    var desde60 = masDias(hoy,-60), primero = D.expenses.reduce(function(m,e){ return e.date<m ? e.date : m; }, hoy);
    var ini60 = primero > desde60 ? primero : desde60, nDias = Math.max(0, entre(ini60, hoy));
    R.propuestas = propuestas(D, cfg, hoy);
    var pareceFijo = {}; R.propuestas.fijos.forEach(function(x){ pareceFijo[x.catId+'/'+x.subId] = 1; });   // lo que parece fijo tampoco es «gasto de todos los días»
    var hist = D.expenses.filter(function(e){ return !pareceFijo[e.catId+'/'+e.subId] && e.date>=ini60 && e.date<hoy && !e.noGasto && !FJ.usados[e.id] && !esPagoDeuda(D,e) && e.catId!=='costos_financieros' && (diaIds[e.accountId] || esTarjeta(D.acc[e.accountId])) && !esFijoCfg(cfg,e); });
    // «un día normal»: promedio por día sin el 10 % de días más caros (un domicilio grande o una compra de una vez no lo inflan)
    R.tipico = null; R.tipicoPromedio = null;
    if(nDias>=14){
      var porDia = {}; hist.forEach(function(e){ porDia[e.date] = (porDia[e.date]||0) + e.amount; });
      var dias = []; for(var dd=ini60; dd<hoy; dd=masDias(dd,1)) dias.push(porDia[dd]||0);
      var conGasto = dias.filter(function(v){ return v>0; }).sort(function(a,b){ return a-b; });
      var quitar = conGasto.length>=5 ? Math.ceil(conGasto.length*0.10) : 0, caros = conGasto.slice(conGasto.length-quitar);
      R.tipicoPromedio = r2(suma(dias)/dias.length);
      R.tipico = r2((suma(conGasto) - suma(caros)) / Math.max(1, dias.length - quitar));   // sin el 10 % de días con gasto más caros
      R.diasCaros = quitar;
    }
    R.semaforo = R.libre < 0 || R.presupuestoHoy<=0 ? 'rojo' : (R.tipico ? (R.presupuestoHoy >= R.tipico ? 'verde' : R.presupuestoHoy >= 0.7*R.tipico ? 'amarillo' : 'rojo') : 'verde');
    if(R.semaforo==='verde' && R.quedaHoy < 0) R.semaforo = 'amarillo';

    // ---- hormiga y «Quiero» del período (para sugerir de dónde recortar)
    var perGastos = D.expenses.filter(function(e){ return e.date>=P.inicio && e.date<=hoy && esVariable(e) && !e.noGasto; });
    var horm = perGastos.filter(function(e){ return e.amount<=30000 && nivelDe(D,e)==='quiero' && !esPagoDeuda(D,e); });
    R.hormiga = {total:suma(horm, function(e){ return e.amount; }), n:horm.length};
    R.quiero = suma(perGastos.filter(function(e){ return nivelDe(D,e)==='quiero'; }), valorVar);

    // ---- qué cambió ayer y hoy (aparte del gasto variable)
    var cambios = function(dia){ return cambiosDelDia(D, cfg, R, dia, diaIds, IN.usados, FJ, TJ); };
    var cuenta = function(c){ return R.limita==='caja' || c.flujo; };
    R.cambiosHoy = cambios(hoy);
    var ayer = masDias(hoy,-1);
    if(ayer >= P.inicio && !P.hoyEsPago){
      var gAyer = suma(varDe(ayer), valorVar), cAyer = cambios(ayer);
      var delta = suma(R.cambiosHoy.filter(cuenta), function(c){ return c.delta; }) + suma(cAyer.filter(cuenta), function(c){ return c.delta; });
      var libreAyer = r2(R.libreInicioHoy + gAyer - delta), presAyer = libreAyer>0 ? r2(libreAyer/(R.dias+1)) : 0;
      R.ayer = {fecha:ayer, gasto:gAyer, presupuesto:presAyer, diferencia:r2(gAyer - presAyer), cambios:cAyer};
    } else R.ayer = null;

    R.cierre = null;
    if(R.colchonIni!==null && R.diaN<=3 && P.pagoAnterior){
      var Ppp = pagoDelMes(mIdx(P.pagoAnterior)-1, cfg.pago), lp = llegadaSueldo(D, cfg, Ppp, masDias(P.inicio,-1)), iniPrev = lp ? lp.date : Ppp;
      if(iniPrev < P.inicio && hayHistoria(iniPrev)){
        var antes = Math.max(0, saldoDiaEn(masDias(iniPrev,-1))), alAhorro = 0;
        D.transfers.forEach(function(t){ if(t.date<iniPrev || t.date>=P.inicio) return; if(diaIds[t.fromId] && esReserva(t.toId)) alAhorro += t.amount; else if(diaIds[t.toId] && esReserva(t.fromId)) alAhorro -= t.amount; });
        R.cierre = {desde:iniPrev, hasta:masDias(P.inicio,-1), antes:antes, despues:R.colchonIni, ahorro:r2(alAhorro), delta:r2(R.colchonIni - antes + alAhorro)};
      }
    }
    R.mensajes = mensajes(D, cfg, R);
    return R;
  }
  function esPagoDeuda(D, e){ return D.debts.some(function(d){ return d.catId===e.catId && (!d.subId || d.subId===e.subId); }); }
  function esFijoCfg(cfg, e){ return cfg.fijos.some(function(f){ return f.catId===e.catId && (!f.subId || f.subId===e.subId); }); }

  // Lo que movió tu plata libre en un día, sin contar el gasto variable (que se cuenta aparte)
  function cambiosDelDia(D, cfg, R, dia, diaIds, ingUsados, FJ, TJ){
    var out = [], hoy = R.hoy;
    D.incomes.forEach(function(i){
      if(i.date!==dia || !diaIds[i.accountId] || ingUsados[i.id]) return;
      if(esSalario(i, cfg)) return;                                   // tu sueldo abre el período: no es un «extra»
      out.push({tipo:'extra', delta:i.amount, flujo:true, texto: i.noIngreso ? `Entró ${fmt(i.amount)} (${i.desc||'sin descripción'}). No cuenta como ingreso, pero es plata disponible.` : `Te entró un ingreso extra: ${i.desc||'Ingreso'} por ${fmt(i.amount)}.`, monto:i.amount});
    });
    R.esperados.forEach(function(x){
      x.llegadas.forEach(function(l){
        if(l.date!==dia) return;
        var antes = (x.hasta <= R.fin && l.date <= x.hasta) ? x.monto : 0, d = r2(x.recibido - antes);
        if(Math.abs(d) >= 1) out.push({tipo:'esperado', delta:d, flujo:true, texto: antes ? `${x.nombre} llegó por ${fmt(x.recibido)} (esperabas ${fmt(x.monto)}): ${d>0 ? 'tienes '+fmt(d)+' más' : 'son '+fmt(-d)+' menos'}.` : `${x.nombre} llegó (${fmt(x.recibido)}) antes de lo que lo contaba.`, monto:d});
      });
      if(x.estado==='atrasado' && masDias(x.hasta,1)===dia && x.hasta<=R.fin) out.push({tipo:'atrasado', delta:-x.monto, flujo:true, texto:`${x.nombre} (≈${fmt(x.monto)}) no ha llegado y ya pasó su fecha: lo dejé de contar hasta que lo registres.`, monto:-x.monto});
    });
    R.fijos.forEach(function(f){
      if(!f.pagos.some(function(p){ return p.date===dia; }) || f.pagos.some(function(p){ return p.date>dia && p.date<=hoy; })) return;   // el mensaje sale el día del último pago
      (function(){
        if(f.estado==='pagado' && f.modo==='variable' && f.estimado>0){
          var d = r2(f.estimado - f.pagado);
          if(Math.abs(d) >= Math.max(1000, f.estimado*0.03)) out.push({tipo:'fijo', flujo:true, delta:d, texto: d<0 ? `${f.nombre} llegó más caro: ${fmt(f.pagado)} (estimado ≈${fmt(f.estimado)}). Son ${fmt(-d)} menos para el día a día.` : `${f.nombre} salió más barato: ${fmt(f.pagado)} (estimado ≈${fmt(f.estimado)}). Te quedan ${fmt(d)} más.`, monto:d});
        } else if(f.modo==='suma' && f.pagado > f.estimado + 1){
          out.push({tipo:'fijo', flujo:true, delta:-r2(f.pagado-f.estimado), texto:`En ${f.nombre} ya van ${fmt(f.pagado)} este período: ${fmt(f.pagado-f.estimado)} más de lo estimado (${fmt(f.estimado)}).`, monto:-r2(f.pagado-f.estimado)});
        } else if(f.modo==='fijo' && f.pagado > f.estimado + 1){
          out.push({tipo:'fijo', flujo:true, delta:-r2(f.pagado-f.estimado), texto:`Pagaste ${f.nombre} por ${fmt(f.pagado)}, ${fmt(f.pagado-f.estimado)} más de lo que tenías puesto (${fmt(f.estimado)}).`, monto:-r2(f.pagado-f.estimado)});
        }
      })();
    });
    D.transfers.forEach(function(t){
      if(t.date!==dia) return;
      var de = !!diaIds[t.fromId], a = !!diaIds[t.toId], fT = esTarjeta(D.acc[t.fromId]), aT = esTarjeta(D.acc[t.toId]);
      if(de===a || fT || aT) return;
      var otra = D.acc[de ? t.toId : t.fromId] || {}, fl = R.limita==='flujo';
      if(de) out.push({tipo:'mover', delta:-t.amount, texto: fl ? `Pasaste ${fmt(t.amount)} a ${otra.name||'otra cuenta'}: sale de tu colchón, así que no cambia lo que puedes gastar.` : `Pasaste ${fmt(t.amount)} a ${otra.name||'otra cuenta'}${otra._tipo==='ahorro' ? ' (bien por el ahorro)' : ''}: esa plata ya no está para el día a día.`, monto:-t.amount});
      else out.push({tipo:'mover', delta:t.amount, texto: fl ? `Trajiste ${fmt(t.amount)} desde ${otra.name||'otra cuenta'}: queda como colchón, no cambia lo que puedes gastar.` : `Trajiste ${fmt(t.amount)} desde ${otra.name||'otra cuenta'}: sube lo que tienes para el día a día.`, monto:t.amount});
    });
    TJ.forEach(function(t){
      t.avances.forEach(function(v){ if(v.date===dia) out.push({tipo:'avance', delta:0, texto:`Avance de ${t.nombre} por ${fmt(v.amount)}: entró a tu cuenta, pero es deuda. No sube lo que puedes gastar.`, monto:0}); });
      var pd = t.pagos.filter(function(p){ return p.date===dia; }), ult = t.pagos.reduce(function(m,p){ return p.date>m ? p.date : m; }, '');
      if(pd.length){
        var exc = ult===dia ? t.exceso : 0, tot = suma(pd, function(p){ return p.amount; });
        out.push({tipo:'pago_tarjeta', delta:-exc, texto: exc>0 ? `Pagaste ${fmt(tot)} de ${t.nombre}: ${fmt(exc)} son más de lo que vencía antes de tu sueldo (bien para tu deuda, pero sale de tu plata del día a día).` : `Pagaste ${fmt(tot)} de ${t.nombre}. Ya estaba apartado, así que no cambia lo que puedes gastar.`, monto:-exc});
      }
    });
    D.adjustments.forEach(function(j){ if(j.date===dia && diaIds[j.accountId]) out.push({tipo:'ajuste', delta:j.amount, texto:`Ajustaste el saldo de ${(D.acc[j.accountId]||{}).name||'una cuenta'} en ${j.amount>0?'+':''}${fmt(j.amount)}.`, monto:j.amount}); });
    return out;
  }

  /* ---------- Mensajes del día (en orden de importancia) ---------- */
  function mensajes(D, cfg, R){
    var M = [], add = function(nivel, texto, extra){ M.push(Object.assign({nivel:nivel, texto:texto}, extra||{})); };
    if(R.hoyEsPago) add(R.extraSueldoHoy>0 ? 'info' : 'ojo', R.extraSueldoHoy>0 ? `Hoy es día de pago: ya cuento tu sueldo (≈${fmt(R.extraSueldoHoy)}). Cuando llegue, regístralo en Gastos para dejarlo exacto.` : 'Hoy es día de pago. Cuando llegue tu sueldo, regístralo en Gastos y aquí se arma el período nuevo.');
    if(R.sueldoAtrasado && !R.llego) add('ojo', `No veo registrado tu sueldo del ${fCorta(R.sueldoAtrasado)}. Si ya llegó, regístralo en Gastos como «Salario»; mientras tanto, no lo cuento.`);
    if(R.cierre){
      var c = R.cierre, aho = c.ahorro>0 ? ` (sin contar ${fmt(c.ahorro)} que pasaste al ahorro)` : '';
      if(c.delta >= 0) add('bien', `Cerraste el período anterior con ${fmt(c.delta)} de sobra${aho}. Tu colchón quedó en ${fmt(c.despues)} y no se reparte: este período vive de lo que entra en él.`);
      else add('ojo', `El período anterior gastaste ${fmt(-c.delta)} más de lo que entró${aho}: salió de tu colchón, que bajó de ${fmt(c.antes)} a ${fmt(c.despues)}.`);
    }
    if(R.deficit>0 && R.deficitColchon){
      var ideasC = [];
      if(R.quiero>0) ideasC.push(`en este período llevas ${fmt(R.quiero)} en gastos «Quiero»`);
      if(R.hormiga.total>0) ideasC.push(`los gastos hormiga van en ${fmt(R.hormiga.total)}`);
      add('ojo', `En este período ya gastaste ${fmt(R.deficit)} más de lo que te deja tu sueldo para el día a día (≈${fmt0(R.flujo.cupo)}). La plata está en tus cuentas, pero lo que gastes de aquí al pago sale de tu colchón.`+(ideasC.length ? ' Para frenar: '+ideasC.join('; ')+'.' : ''));
    } else if(R.deficit>0){
      var ideas = [];
      if(R.quiero>0) ideas.push(`en este período llevas ${fmt(R.quiero)} en gastos «Quiero»`);
      var fq = R.fijos.filter(function(f){ return f.nivel==='quiero' && f.falta>0; });
      if(fq.length) ideas.push('podrías pausar '+fq.map(function(f){ return f.nombre+' ('+fmt(f.falta)+')'; }).join(', '));
      if(R.hormiga.total>0) ideas.push(`los gastos hormiga van en ${fmt(R.hormiga.total)}`);
      add('mal', `Te faltan ${fmt(R.deficit)} para cubrir todo hasta el pago del ${fCorta(R.pago)}. Hoy no hay presupuesto para gastos del día a día.`+(ideas.length ? ' Para cuadrar: '+ideas.join('; ')+'.' : ''));
    } else if(R.quedaHoy < 0){
      add('mal', `Hoy te pasaste ${fmt(-R.quedaHoy)}. No pasa nada grave: se reparte entre los ${R.dias-1>0 ? R.dias-1+' días que quedan' : 'días que quedan'} y mañana tendrás ≈${fmt0(R.manana||0)} por día.`);
    }
    if(R.ayer && Math.abs(R.ayer.diferencia) >= 1){
      if(R.ayer.presupuesto<=0 && R.ayer.gasto>0) add('ojo', `Ayer gastaste ${fmt(R.ayer.gasto)} cuando ya no había presupuesto libre: eso agranda lo que falta para llegar al pago.`);
      else if(R.ayer.diferencia > 0) add('ojo', `Ayer gastaste ${fmt(R.ayer.gasto)} y tu presupuesto era ≈${fmt0(R.ayer.presupuesto)}: te pasaste ${fmt0(R.ayer.diferencia)}. Por eso hoy tienes un poco menos por día.`);
      else if(R.ayer.gasto>0) add('bien', `Ayer gastaste ${fmt(R.ayer.gasto)} de ≈${fmt0(R.ayer.presupuesto)}: te sobraron ${fmt0(-R.ayer.diferencia)} y se repartieron en los días que quedan.`);
      else add('bien', `Ayer no registraste gastos del día a día: los ≈${fmt0(R.ayer.presupuesto)} de ayer se repartieron en los días que quedan.`);
    }
    (R.ayer ? R.ayer.cambios : []).forEach(function(c){ add((R.limita==='flujo' && !c.flujo) || !c.delta ? 'info' : c.delta<0 ? 'ojo' : 'bien', 'Ayer · '+c.texto, {cambio:c.tipo}); });
    var nivelC = function(c){ return (R.limita==='flujo' && !c.flujo) || !c.delta ? 'info' : c.delta<0 ? 'ojo' : 'bien'; };
    R.cambiosHoy.forEach(function(c){ add(nivelC(c), c.texto, {cambio:c.tipo}); });
    R.gastosHoy.filter(function(g){ return g.tarjeta; }).forEach(function(g){
      add('info', g.cuotas>1 ? `${g.desc}: lo compraste a ${g.cuotas} cuotas. Hoy cuenta la primera (${fmt(g.valor)}); el resto (${fmt(g.amount - g.valor)}) va en los próximos meses.` : `${g.desc} (${fmt(g.amount)}) con tarjeta: cuenta hoy aunque la pagues después.`);
    });
    R.fijos.forEach(function(f){
      if(f.estado==='atrasado') add('ojo', `${f.nombre} era para el ${fCorta(f.fecha)} y no aparece pagado. Lo sigo apartando (${fmt(f.falta)}). Si ya lo pagaste, regístralo en Gastos o márcalo como resuelto.`, {fijo:f.clave});
      else if(f.estado==='pendiente' && f.modo!=='suma' && entre(R.hoy, f.fecha)>=0 && entre(R.hoy, f.fecha)<=2) add('info', `${entre(R.hoy, f.fecha)===0 ? 'Hoy' : entre(R.hoy, f.fecha)===1 ? 'Mañana' : 'Pasado mañana'} toca ${f.nombre} (${f.modo==='variable'?'≈':''}${fmt(f.falta)}). Ya está apartado.`);
      else if(f.estado==='parcial') add('info', `De ${f.nombre} pagaste ${fmt(f.pagado)}; sigo apartando lo que falta (${fmt(f.falta)}).`);
    });
    R.esperados.forEach(function(x){
      if(x.estado==='atrasado' && masDias(x.hasta,1)!==R.hoy) add('ojo', `${x.nombre} (≈${fmt(x.monto)}) no ha llegado: lo esperabas entre el ${fCorta(x.desde)} y el ${fCorta(x.hasta)}. No lo cuento hasta que lo registres.`);
      if(x.estado==='despues') add('info', `${x.nombre} (≈${fmt(x.monto)}) podría llegar después de tu pago, así que todavía no lo cuento.`);
    });
    TJ_avisos(R, add);
    var umbral = R.presupuestoHoy || R.tipico || 0;
    if(R.hormiga.n>=3 && umbral>0 && R.hormiga.total >= umbral) add('info', `Gastos hormiga del período: ${R.hormiga.n} compras pequeñas de «Quiero» que suman ${fmt(R.hormiga.total)}${R.presupuestoHoy>0 ? ` (≈${(R.hormiga.total/R.presupuestoHoy).toLocaleString('es-CO',{maximumFractionDigits:1})} días de presupuesto)` : ''}.`);
    if(!M.length && R.presupuestoHoy>0) add('bien', R.gastoHoy>0 ? `Vas bien: llevas ${fmt(R.gastoHoy)} de ${fmt0(R.presupuestoHoy)}.` : 'Vas bien. Hoy todavía no registras gastos del día a día.');
    return M;
  }
  function TJ_avisos(R, add){
    R.tarjetas.forEach(function(t){
      if(t.sinDia && t.previo>0) add('info', `${t.nombre}: estoy suponiendo que lo de tu extracto (${fmt(t.previo)}) se paga antes de tu sueldo. Si no es así, pon su día límite de pago en Ajustes.`, {ajuste:'tarjetas'});
    });
  }

  /* ---------- Propuestas: pagos que parecen fijos e ingresos que se repiten ---------- */
  function propuestas(D, cfg, hoy){
    var mHoy = mIdx(hoy), meses = [mHoy-3, mHoy-2, mHoy-1], seis = [mHoy-6, mHoy-5, mHoy-4, mHoy-3, mHoy-2, mHoy-1];
    var ya = {}; cfg.fijos.forEach(function(f){ ya[f.catId+'/'+f.subId] = 1; }); D.debts.forEach(function(d){ ya[d.catId+'/'+(d.subId||'')] = 1; ya[d.catId+'/*'] = !d.subId; });
    var desc = {}; cfg.descartados.forEach(function(x){ desc[x] = 1; });
    var porSub = {};
    D.expenses.forEach(function(e){
      if(e.noGasto || e.catId==='costos_financieros') return; var m = mIdx(e.date); if(seis.indexOf(m)<0) return;
      var k = e.catId+'/'+e.subId; (porSub[k] = porSub[k] || []).push(e);
    });
    var fijos = [];
    Object.keys(porSub).forEach(function(k){
      if(ya[k] || ya[k.split('/')[0]+'/*'] || desc['f:'+k] || !D.sub[k]) return;
      var l = porSub[k], porMes = {}; l.forEach(function(e){ var m = mIdx(e.date); (porMes[m] = porMes[m] || []).push(e); });
      var en3 = meses.filter(function(m){ return porMes[m]; });
      var mesesCon = Object.keys(porMes).map(Number).sort(function(a,b){ return a-b; });
      var veces = l.length / Math.max(1, mesesCon.length);
      if(veces > 2) return;                                            // se compra muchas veces al mes: no es un fijo
      var periodo = 0;
      if(en3.length>=2) periodo = 1;
      else if(mesesCon.length>=2 && mesesCon.every(function(m,i){ return i===0 || m-mesesCon[i-1]===2; }) && mesesCon[mesesCon.length-1] >= mHoy-2) periodo = 2;
      if(!periodo) return;
      var usar = periodo===1 ? en3 : mesesCon.slice(-3);
      var sumas = usar.map(function(m){ return suma(porMes[m], function(e){ return e.amount; }); });
      var prom = r2(suma(sumas)/sumas.length), mx = Math.max.apply(null, sumas), mn = Math.min.apply(null, sumas);
      var dias = []; usar.forEach(function(m){ porMes[m].forEach(function(e){ dias.push(+e.date.slice(8,10)); }); }); dias.sort(function(a,b){ return a-b; });
      var x = D.sub[k];
      fijos.push({clave:'f:'+k, catId:k.split('/')[0], subId:k.split('/')[1], nombre:x.sub.name, cat:x.cat.name, nivel:x.sub.nivel, periodo:periodo, ancla: periodo>1 ? mKey(mesesCon[mesesCon.length-1]) : '',
        dia:dias[Math.floor(dias.length/2)], monto: mx-mn <= prom*0.05 ? r2(sumas[sumas.length-1]) : prom, modo: mx-mn <= prom*0.05 ? 'fijo' : 'variable', meses:usar.length});
    });
    fijos.sort(function(a,b){ return b.monto-a.monto; });
    var yaI = {}; cfg.ingresos.forEach(function(i){ yaI[norm(i.nombre)] = 1; });
    var porNom = {};
    D.incomes.forEach(function(i){ if(i.noIngreso || esSalario(i, cfg)) return; var m = mIdx(i.date); if(meses.indexOf(m)<0) return; var n = norm(i.desc); if(!n) return; (porNom[n] = porNom[n] || []).push(i); });
    var ingresos = [];
    Object.keys(porNom).forEach(function(n){
      if(desc['i:'+n] || Object.keys(yaI).some(function(y){ return coincideNombre(y, n); })) return;
      var l = porNom[n], ms = {}; l.forEach(function(i){ ms[mIdx(i.date)] = (ms[mIdx(i.date)]||0) + i.amount; });
      if(Object.keys(ms).length<2) return;
      var dias = l.map(function(i){ return +i.date.slice(8,10); }).sort(function(a,b){ return a-b; }), v = Object.keys(ms).map(function(m){ return ms[m]; });
      var spread = dias[dias.length-1]-dias[0];
      ingresos.push({clave:'i:'+n, nombre:l[l.length-1].desc, dia:dias[Math.floor(dias.length/2)], margen: Math.min(10, Math.max(3, Math.ceil(spread/2)+1)), monto: r2(Math.min.apply(null, v)), meses:Object.keys(ms).length});
    });
    ingresos.sort(function(a,b){ return b.monto-a.monto; });
    return {fijos:fijos.slice(0,6), ingresos:ingresos.slice(0,4)};
  }

  /* ---------- ¿Me alcanza? ---------- */
  function simular(R, monto, medio){
    monto = r2(Math.max(0, Number(monto)||0)); medio = medio || {};
    var n = Math.max(1, Math.round(medio.cuotas||1)), i = Math.max(0, Number(medio.tasaM)||0), tarjeta = medio.tipo==='tarjeta';
    var cuota = tarjeta && n>1 ? Math.round(i>0 ? monto*i/(1-Math.pow(1+i,-n)) : monto/n) : monto;
    var impacto = tarjeta ? cuota : monto;
    var libre = r2(R.libre - impacto), pres = r2(Math.max(0, (R.libreInicioHoy - impacto)/R.dias)), manana = R.dias>1 ? r2(Math.max(0, libre/(R.dias-1))) : null;
    var total = tarjeta && n>1 ? r2(cuota*n) : monto, intereses = r2(Math.max(0, total - monto));
    var veredicto = libre < 0 ? 'no' : (R.tipico && pres < 0.7*R.tipico) || pres < 0.5*R.presupuestoHoy ? 'apretado' : 'si';
    return {monto:monto, impacto:impacto, cuota:cuota, cuotas:n, total:total, intereses:intereses, libre:libre, presupuesto:pres, manana:manana, veredicto:veredicto, falta: libre<0 ? r2(-libre) : 0};
  }

  var API = {calcular:calcular, simular:simular, limpiarConfig:limpiarConfig, diaDePago:diaDePago, habil:habil, festivos:festivos,
    util:{iso:iso, masDias:masDias, entre:entre, fCorta:fCorta, fLarga:fLarga, fmt:fmt, fmt0:fmt0, norm:norm, r2:r2, MESES:MESES}};
  root.HoyMotor = API;
  if(typeof module!=='undefined' && module.exports) module.exports = API;
})(typeof window!=='undefined' ? window : globalThis);
