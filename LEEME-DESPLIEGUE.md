# Mi Suite Financiera — publicar en GitHub Pages y activar la sincronización con Google Drive

## 0. Novedades de esta versión
- **Modo simple / avanzado** en la calculadora (por defecto simple: Resumen, Contrato y Prestaciones) y **asistente de primera vez**.
- **Salario integral**, **aporte voluntario (AFC/pensión)** y **retención por procedimiento 2** (pegas el % de tu desprendible), en Contrato → Avanzado.
- **Vacaciones** (saldo informativo) y **liquidación e indemnización** estimadas, en Prestaciones.
- **Renta con los 5 criterios de la DIAN**: usa los datos del gestor (compras, tarjetas, consignaciones) y «Mis bienes» para el patrimonio.
- **Intereses de vivienda** desde el módulo de deudas hacia las deducciones.
- Ventanas propias en lugar de los avisos del navegador; accesibilidad revisada (0 problemas WCAG A/AA en las pantallas principales).
- Aviso cuando el espacio del dispositivo pasa del 70%.
- **Tarjetas de crédito:** muestran el cupo **disponible**; las compras se registran como gasto (con su categoría) y pueden ir **a cuotas**; «Pagar tarjeta» es una transferencia (no es gasto) con pago total, de este extracto u otro valor; «Ver cuotas» muestra lo que viene.
- **Para tu contador:** en cada deducción (vivienda, prepagada, dependientes) el interruptor «Mi empresa ya me lo aplica». Si no la aplica, tu neto sigue igual al desprendible y la deducción queda para tu declaración. En Renta, el **resumen para tu contador** (imprimir/PDF o CSV).
- **Renta más clara:** arriba solo el veredicto con su causa; el detalle y los 5 criterios quedan plegados. Con pocos meses de datos dice «hasta ahora, bajo el tope» (no «bajo el tope»); concluye «no declaras» solo si el año está cubierto.
- **Si empiezas a registrar tarde:** en «Lo que pasó antes de empezar a registrar» escribes los totales del año anterior a tu registro (compras, tarjetas, consignaciones). Para empleos anteriores, si ya tienes el certificado, escribes su total y reemplaza lo mensual.
- **Deducciones con fecha:** prepagada y leasing tienen «¿desde qué mes?»; el leasing admite «intereses pagados antes de registrar la deuda». El resumen para el contador llega **hasta hoy**, marca lo aproximado y separa lo proyectado a diciembre. Se quitó la cifra de «retención de más».
- **Documentos que vas a necesitar:** lista según lo que marcaste (certificados de ingresos, intereses del leasing y contrato, prepagada, dependientes, saldos y deudas al 31-dic), con casillas para ir tachando; sale también en el resumen para imprimir o CSV.
- **Sigue fuera:** incapacidades y licencias, 4×1000 y dólares.

**Para actualizar:** sube **todo el contenido** de la carpeta a GitHub (esta vez `suite-config.js` ya trae tu ID de cliente, así que no se pierde nada).

## 1. Qué hay en esta carpeta
- `index.html` — la app (calculadora + gestor). **Sube la carpeta completa**, no solo este archivo.
- `calculadora/`, `gastos/` — las dos aplicaciones.
- `suite-*.js`, `suite-tema.css`, `sw.js`, `manifest.json`, `fonts/`, `icons/` — diseño, modo sin conexión, íconos.
- `suite-config.js` — configuración (opcional): aquí puedes pegar el **ID de cliente de Google** y tu **correo de contacto**.
- `suite-sync-core.js`, `suite-sync.js` — la sincronización con Google Drive.
- `suite-ui.js` — ventanas de aviso y confirmación propias.
- `privacidad.html` — política de privacidad (tu correo aparece ahí si lo pones en `suite-config.js`).
- `_headers` — solo lo usa Netlify; en GitHub Pages se ignora (puedes subirlo igual).

## 2. Subir la versión nueva a GitHub
1. Descomprime el zip. Dentro hay una carpeta `mi-suite-financiera/`: lo que subes es **su contenido**, no la carpeta contenedora.
2. En tu repositorio `suite-financiera`: *Add file → Upload files* y arrastra todo el contenido (incluidas las carpetas `fonts/`, `icons/`, `calculadora/`, `gastos/`). Si el navegador no deja arrastrar carpetas, súbelas una por una.
3. Escribe un mensaje (ej. «sincronización con Drive») y haz *Commit changes* a `main`.
4. Espera 1–2 minutos (pestaña *Actions* o *Settings → Pages* muestra el despliegue). Abre `https://andresamez1995.github.io/suite-financiera/`.
5. En la app ya instalada saldrá «Hay una versión nueva · Actualizar» (o menú ⋯ → *Buscar actualización*).

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
