# Mi Suite Financiera — publicar en GitHub Pages y activar la sincronización con Google Drive

## 0. Novedades de esta versión (auditoría de octubre de 2026)
**Fallos corregidos**
- *Importar respaldo* ya funciona: antes la confirmación volvía a abrir el selector de archivos sin terminar nunca.
- Dos avisos seguidos (por ejemplo, al pagar la tarjeta con más de lo que debes y desde una cuenta sin saldo) ya no se repiten sin fin.
- **Saldos:** cada cuenta guarda su saldo inicial y el saldo de hoy se calcula con los movimientos. La sincronización ya no puede descuadrarlos (antes, un gasto con fecha futura podía descontarse dos veces). Los datos viejos se convierten solos la primera vez que abres la app.
- **Sincronización:** lo que registras mientras sincroniza no se pierde; si otro dispositivo guardó al mismo tiempo, se vuelve a fusionar en vez de pisarlo; las copias diarias se ordenan por fecha antes de borrar las viejas; la copia base vive en IndexedDB y ya no ocupa el doble de espacio.
- **Intereses de cesantías:** se calculan por los días trabajados (antes daban el 12 % completo aunque entraras en septiembre).

**Normativa colombiana**
- **Contratistas:** la retención por defecto es la **tabla del art. 383** (para quien no tiene 2 o más trabajadores), con aportes y 25 % exento. El 10/11 % queda como opción.
- **Retención por servicios:** base de **2 UVT** (Decreto 572 de 2025, vigente otra vez desde el 1-jul-2026), con fechas.
- **Reforma pensional:** desde el **1-abr-2027** el Fondo de Solidaridad sube (1,5 % a 3 %) para quien no esté en el régimen de transición; hay una casilla para marcarlo (aparece al pasar a 2027).
- **Prima en junio y diciembre:** se resta la retención en la fuente estimada.
- **Cesantías:** base con el último salario si no cambió en los últimos 3 meses (art. 253 CST); en Renta cuentan el año en que se consignan (las de 2026 son ingreso de 2027).
- **Para tu contador:** 72 UVT por dependiente adicional, 1 % de compras con factura electrónica (si la activas en el gestor) y aviso cuando las transferencias entre tus cuentas te hacen pasar el tope de consignaciones.
- Liquidación: el mínimo de 15 días aplica solo al contrato por obra o labor (opción nueva). El auxilio de transporte también cubre el de conectividad.

**Nuevo**
- **Pagos no salariales** (Contrato): tarjeta o bonos de alimentación y otros pagos que el contrato llama «no salariales». No cuentan para prima, cesantías ni vacaciones; pagan salud y pensión solo en lo que pase del 40 % (Ley 1393 de 2010); la alimentación no es ingreso tuyo hasta 41 UVT al mes si tu salario no pasa de 310 UVT (art. 387-1 ET). El Resumen separa lo que llega a tu cuenta de lo que va a la tarjeta.
- **Cambio de año:** cada año guarda su «cierre». En enero aparecen solos los intereses de cesantías del año anterior (calculados con tus datos de ese año; si escribes el valor real, manda ese), Renta suma las cesantías del año anterior con esos mismos datos y, si cobras mes vencido, lo variable de diciembre se paga en enero del año siguiente. Lo de un año nunca toca el enero de ese mismo año.
- **Aumento o ascenso:** en Contrato, «Registrar aumento o ascenso» con la fecha desde la que rige. Los meses anteriores conservan el salario de antes y el mes del cambio se paga por días.
- **Tarjetas:** al pagar, lo que es interés o cuota de manejo queda como gasto en «Costos financieros» y el resto baja la deuda. Avisos si una compra pasa el cupo o un gasto pasa el saldo.
- **Factura electrónica (opcional):** se activa en ⚙ Ajustes del gestor y agrega una casilla discreta al registrar gastos (no aparece con efectivo).
- **Resumen por bloques:** ⚙ Ajustes → «Personalizar el resumen» para mostrar, quitar u ordenar: ritmo de gasto (comparado con el mes anterior), tu colchón, tendencia, saldo del mes, uso del cupo, gastos hormiga, ingresos, gastos, categorías y debo/necesito/quiero.
- Selector de mes «‹ Octubre 2026 ▾ ›», el neto ya no sale dos veces y Renta muestra lo que falta en una lista corta.

**Ajustes tras revisar datos reales (v26):** la alerta verde ya no promete un «excelente colchón» cuando el colchón es bajo (usa el mismo cálculo del bloque «Tu colchón»); en Categorías, el mes en curso se compara con el anterior hasta el mismo día; la línea punteada del saldo solo sale si hay movimientos con fecha futura; la dona del cupo en 0 % ya no pinta un punto; los títulos que estaban en MAYÚSCULAS quedaron como el resto de la app. Los centavos se mantienen a propósito (hay deudas con centavos).

**Registro de movimientos (v26):** la pestaña Gastos muestra también las transferencias, los pagos de tarjeta, los avances (pasar cupo de una tarjeta a tu cuenta) y los ajustes de saldo, cada uno con una explicación de qué hizo y qué cuentas tocó; todos se pueden abrir para editarlos o borrarlos, y las transferencias aceptan una nota. El filtro «Transferencias» los muestra solos. Los avances cuentan como plata que entró (en Resumen e Ingresos). «Ver cuentas y flujo de caja» cuadra el saldo paso a paso: lo que tenías, lo que entró, lo que salió por gastos, pagos a tarjetas y ajustes.

**Compras con tarjeta de crédito (v27):** comprar con la tarjeta no toca tus cuentas, así que la compra queda registrada en su categoría como **pendiente** (no suma a Gastos). Cuando pagas la tarjeta, el pago **confirma** las compras pendientes, de la más vieja a la más nueva, y cada una cuenta como gasto en su categoría en el mes del pago: nada se cuenta dos veces. Lo que el pago cubre de avances o de deuda anterior a registrar la tarjeta no es gasto. Para la DIAN (Renta) las compras se siguen contando en la fecha en que las hiciste, que es lo que reporta el banco.

**Préstamos, devoluciones y deudas viejas (v28):** al registrar o editar un ingreso hay una casilla «No es un ingreso» (préstamo o compra de cartera, plata que te devuelven, nivelaciones) y en los gastos una casilla «No cuenta como gasto» (pagar una deuda vieja con plata de otro préstamo, ahorro que sale a otra parte). Lo marcado se sigue viendo en las listas y mueve el saldo, pero no infla ingresos, gastos, promedios ni gráficas; en «Ver cuentas y flujo de caja» aparece en su propia línea. Para la DIAN, los depósitos siguen contando en consignaciones (el banco los reporta igual) y lo marcado como «no gasto» no cuenta como compra.

**Limpieza:** las apps abiertas sueltas (`/gastos/`, `/calculadora/`) llevan a la suite; se quitaron el respaldo propio de la calculadora, `icon.png` (copia de `icons/icon-512.png`) y `_headers` (solo servía en Netlify). El color de arranque de la app instalada es el azul del ícono AURORA y la barra del celular sigue el tema que elijas.

**Sigue fuera (decidido):** incapacidades y licencias, descuentos de nómina, 4×1000, próximas cuotas de tarjeta y dólares.

**Para actualizar:** sube **todo el contenido** de la carpeta a GitHub (esta vez `suite-config.js` ya trae tu ID de cliente, así que no se pierde nada).

## 1. Qué hay en esta carpeta
- `index.html` — la app (calculadora + gestor). **Sube la carpeta completa**, no solo este archivo.
- `calculadora/`, `gastos/` — las dos aplicaciones.
- `suite-*.js`, `suite-tema.css`, `sw.js`, `manifest.json`, `fonts/`, `icons/` — diseño, modo sin conexión, íconos.
- `suite-config.js` — configuración (opcional): aquí puedes pegar el **ID de cliente de Google** y tu **correo de contacto**.
- `suite-sync-core.js`, `suite-sync.js` — la sincronización con Google Drive.
- `suite-ui.js` — ventanas de aviso y confirmación propias.
- `privacidad.html` — política de privacidad (tu correo aparece ahí si lo pones en `suite-config.js`).

## 2. Subir la versión nueva a GitHub
1. Descomprime el zip. Dentro hay una carpeta `mi-suite-financiera/`: lo que subes es **su contenido**, no la carpeta contenedora.
2. En tu repositorio `suite-financiera`: *Add file → Upload files* y arrastra todo el contenido (incluidas las carpetas `fonts/`, `icons/`, `calculadora/`, `gastos/`). Si el navegador no deja arrastrar carpetas, súbelas una por una.
3. Escribe un mensaje (ej. «sincronización con Drive») y haz *Commit changes* a `main`.
4. Espera 1–2 minutos (pestaña *Actions* o *Settings → Pages* muestra el despliegue). Abre `https://andresamez1995.github.io/suite-financiera/`.
5. En la app ya instalada saldrá «Hay una versión nueva · Actualizar» (o menú ⋯ → *Buscar actualización*).
6. Limpieza opcional: subir archivos no borra los viejos. En GitHub puedes eliminar `icon.png` y `_headers` (ya no se usan; dejarlos no rompe nada).

Tus datos **no se tocan** al actualizar: la dirección es la misma.

## 3. Crear el acceso de Google (una sola vez, gratis)
1. Entra a **console.cloud.google.com** con la cuenta de Google que será la dueña del proyecto → selector de proyecto (arriba) → **Proyecto nuevo** → nombre `Mi Suite` → *Crear*.
2. **APIs y servicios → Biblioteca** → busca **Google Drive API** → *Habilitar*.
3. Menú ☰ → **Google Auth Platform** → *Comenzar*:
   - Nombre de la app: `Mi Suite Financiera`. Correo de asistencia: el tuyo.
   - Público: **Externo**. Correo de contacto: el tuyo. Acepta la política → *Crear*.
   - En **Branding** deja **vacíos** los campos «Página principal de la aplicación» y «Enlace a la política de privacidad». (GitHub no deja registrar `github.io` como dominio autorizado, y Google los exige en un dominio verificado. La política igual está en la app: `privacidad.html`.)
4. **Acceso a los datos** → *Agregar o quitar permisos* → busca `drive.appdata` → marca **`.../auth/drive.appdata`** («Ver, crear y borrar sus propios datos de configuración en tu Google Drive») → *Actualizar* → *Guardar*. Es el único permiso y Google lo clasifica como **no sensible**.
5. **Público** (Audience) → **Usuarios de prueba** → *Add users* → agrega **tu Gmail** (y el de cada persona que vaya a usarla; hasta 100). Deja el estado en **Pruebas**.
6. **Clientes** → *Crear cliente* → tipo **Aplicación web** → nombre `Mi Suite web`:
   - **Orígenes autorizados de JavaScript** → *Agregar URI*:  
     `https://andresamez1995.github.io`  
     **Exactamente así**: sin `/suite-financiera`, sin barra final, con `https`.
   - No pongas URI de redireccionamiento.
   - *Crear* y copia el **ID de cliente** (termina en `.apps.googleusercontent.com`). Es público, no es un secreto.
   - Los cambios de orígenes pueden tardar unos minutos en aplicarse (a veces más).

## 4. Poner el ID en la app
- **Más fácil (cada dispositivo):** menú ⋯ → *Sincronizar con Google Drive* → pega el ID → *Guardar*. Hay que hacerlo en cada celular/computador.
- **Una sola vez para todos:** en GitHub abre `suite-config.js` (lápiz ✏️), pega el ID en `googleClientId: '...'` (y tu correo en `contacto`), *Commit changes*. Así los demás dispositivos ya lo traen.

## 5. Conectar
1. Menú ⋯ → *Sincronizar con Google Drive* → lee el aviso → marca «Entiendo y acepto» → *Conectar con Google*.
2. En la ventana de Google elige tu cuenta. Saldrá **«Google no ha verificado esta app»**: es normal mientras el estado sea *Pruebas* y no haya dominio propio. Toca *Avanzado → Ir a Mi Suite Financiera (no seguro)* y acepta el permiso.
3. En el segundo dispositivo: abre la misma dirección, conecta con la **misma cuenta**. En un celular nuevo, la bienvenida ofrece «Traer mis datos con Google Drive».
4. Para comprobar: en drive.google.com → ⚙ *Configuración → Administrar aplicaciones* → la app aparece con «Datos ocultos de la aplicación».

## 6. Cómo funciona
- Los datos de **cada persona** se guardan en la carpeta **oculta de la app en su propio Drive** (`suite-datos.json` y copias automáticas de los últimos 7 días). Quien publica la app no tiene servidor ni acceso.
- Se sincroniza al abrir, a los pocos segundos de cada cambio y cada ~30 segundos con la app abierta. **No es instantáneo.**
- El permiso de Google dura ~1 hora. El siguiente toque en la app lo renueva; si no, aparece «Reconectar». En modo *Pruebas*, Google puede volver a pedir permiso cada ~7 días. Sin internet todo sigue funcionando y se pone al día al volver.
- Si dos dispositivos cambian a la vez, se **combinan registro por registro** (los saldos suman los movimientos de ambos). Si uno borra algo que el otro editó, **se conserva lo editado**. Antes de combinar con conflictos se guarda una copia en Drive.
- Con un formulario abierto, los cambios entrantes esperan a que lo cierres.
- Si borras tu copia de Drive, los demás dispositivos se desconectan solos y conservan sus datos.
- «Restaurar» una copia automática lleva **todos** tus dispositivos a ese punto.

## 7. Problemas comunes
- **`origin_mismatch`**: el origen no coincide exactamente (revisa `https://andresamez1995.github.io`, sin ruta ni barra final) o aún no se aplicó; espera unos minutos.
- **`access_denied` / «no completó el proceso de verificación»**: esa cuenta no está en *Usuarios de prueba* (paso 3.5).
- **Error 403 al guardar en Drive / `accessNotConfigured`**: falta habilitar Google Drive API (paso 3.2).
- **No se abre la ventana de Google**: permite ventanas emergentes para el sitio y vuelve a tocar *Conectar*.
- **«Reconectar» cada hora**: es normal con este tipo de acceso; un toque en la app lo renueva.

## 8. Dominio propio (opcional, más adelante)
Con `github.io` no se puede verificar la marca en Google (nombre y logo en la pantalla de permisos): por eso aparece la advertencia de «app no verificada». Si algún día la compartes con muchas personas, un dominio propio la quita. Para ti y unas pocas personas de confianza no hace falta.

## 9. Antes de dar la app a otras personas
Revisa `privacidad.html` y el aviso del panel con alguien que sepa de protección de datos (Ley 1581 de 2012). El texto es una base razonable, **no asesoría legal**.
