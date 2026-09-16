# Seguimiento diario y alertas

La pestaña **Seguimiento** y `?desk=1` añaden cinco listas sin reemplazar el
screener, las watchlists anteriores ni el laboratorio. No hay conexión de órdenes
con Interactive Brokers. El capital de referencia es USD 1.000 y los datos son gratuitos.

## Listas y movimientos

- **Buy Alert**: tendencia completa, RS mínimo 90, contracción decreciente de tres
  bloques de diez sesiones (último <=8%), volumen de cinco sesiones <70% del de 50,
  y precio a <=5% del máximo de 20 sesiones. Estar en la lista no significa que
  el correo esté habilitado: cada condición pendiente se muestra.
- **Watchlist**: crecimiento de ventas/EPS trimestral >=20%, márgenes positivos,
  liquidez y tendencia, con patrón aún incompleto. Sale si pierde calidad/tendencia.
- **IPO**: prometedoras con fecha reportada por Finnhub dentro de los últimos siete
  años. No se confunde el inicio del historial de Yahoo con una IPO. Puede incluir
  salidas mediante cotización directa o SPAC según la clasificación del proveedor.
  Si está lista, pasa a Buy Alert conservando su fecha IPO. Mínimo 50 sesiones para
  seguimiento; el plan completo exige al menos 252 sesiones.
- **Portafolio**: compras que el usuario registra. Una caída no borra una posición:
  muestra deterioro. Una venta parcial reduce las acciones y permanece en Portafolio.
- **Recent Sold**: ventas completas de los últimos 30 días. La recompra mueve a
  Portafolio; después de 30 días vuelve a la lista que corresponda por criterios.

Precedencia: posición registrada > venta reciente > Buy Alert > IPO > Watchlist.
Los cambios automáticos de investigación guardan fecha, origen, destino y motivo.
Los cambios por compra/venta quedan en el registro de operaciones privado del navegador.

## Screening

`scripts/trading-desk/nightly.mjs` pagina todo el universo que devuelve TradingView
para acciones >USD 10, filtra comunes en NYSE/Nasdaq/AMEX y liquidez aproximada de
USD 10 millones diarios. Descarga dos años de OHLCV y precio ajustado para todas
las elegibles, no solo para las ganadoras. Mantiene snapshot observado y errores.

Los indicadores usan sesiones cerradas. Una captura inicial durante el mercado
se identifica como preliminar y no arma alertas. La fecha NYSE aplica horario
de verano, festivos y cierres anticipados; calendario verificado 2026–2027 en
https://www.nyse.com/trade/hours-calendars. Fuera de esa cobertura falla explícitamente.

RS es el percentil conservador del retorno ajustado de 126 sesiones. Los historiales
desconocidos cuentan por encima del activo al calcular su cota inferior; nunca se
asumen perdedores. La interfaz muestra cobertura y fecha. Los fundamentales son
del proveedor; no se presentan como auditoría de estados financieros.

El contexto exige SPY y QQQ por encima de SMA50. El sector del proveedor debe
tener >=5 empresas, >=50% por encima de SMA50 y retorno medio de 63 sesiones
superior al SPY. No se equipara esa taxonomía con los sectores GICS de los ETF.
La calidad del sector y de los fundamentales se estudia prospectivamente: esta
selección no constituye una ventaja ni una rentabilidad ya validada.

## Alertas

Cada plan se congela al cierre para **una sola próxima sesión**. Entrada desde
el máximo de 20 sesiones +USD 0,01; stop en el mínimo de cinco sesiones; máximo
de entrada limitado a 2% sobre el pivot y 6% de distancia al stop. Distancia mínima
de stop 2%. Bloquea resultados próximos (7 días) o sin fecha confirmada.

Para enviar el aviso, el precio debe estar en la zona y el volumen acumulado debe
superar 1,5 veces el promedio diario de 50 sesiones. No se extrapola el volumen
intradía. Se requiere cotización con menos de 120 segundos y sesión regular abierta.
Si la fuente tiene 15 minutos de retraso se bloquea; no se etiqueta como tiempo real.
Si el mínimo del día perfora el stop, se invalida. Si supera el máximo de compra,
se retira el plan para esa sesión. Caduca al terminar la sesión válida.

El tamaño de referencia usa riesgo 0,25% de USD 1.000 y costos supuestos de 10 bps
por lado, máximo 25% de capital por posición y acciones enteras. No se envía si no
cabe una acción. **El monitor no conoce el portafolio privado del navegador:** no
gestiona efectivo real ni exposición agregada. El correo exige revisar esas
condiciones antes de decidir. No sustituye controles de riesgo en IBKR, ni garantiza
el presupuesto de pérdida anual de 5%. No hay compras, ventas ni fills automáticos.

No se cambia silenciosamente la especificación histórica de `research/minervini-edge`.
Esta versión 1.0 es una nueva política prospectiva para listas cercanas al pivot y
confirmación intradía, solicitada por el usuario; sus reglas quedan en
`config/trading-desk.json` y deben versionarse si cambian.

## GitHub Actions y correo

El workflow `Daily screening and buy alerts` corre en la rama por defecto:

- Screening: lunes a viernes 22:37 UTC / **17:37 Colombia**, después del cierre
  tanto en invierno como verano. Festivos conservan el último análisis.
- Monitor: cada cinco minutos dentro de una ventana UTC amplia, con comprobación
  interna de sesión NYSE. GitHub puede retrasar o saltar ejecuciones programadas;
  no es un feed instantáneo ni un servicio de ejecución garantizado.

La rama `trading-data` conserva el estado, el historial de movimientos y las
observaciones. `public.json` solo publica investigación de mercado, sin correo,
claves ni operaciones personales. La web lo consulta cada minuto y conserva un
fallback generado durante el despliegue. No requiere que el PC esté encendido.

Secretos requeridos en **Settings > Secrets and variables > Actions**:

- `ALERT_EMAIL_TO`: destinatario autorizado, ya configurado por el agente.
- `FINNHUB_API_KEY`: credencial existente para verificar fechas IPO, ya configurada.
- `RESEND_API_KEY`: clave de envío del usuario, pendiente si no está configurada.
- `ALERT_EMAIL_FROM`: remitente permitido por su cuenta de Resend.

No se compra un plan ni se inventa un remitente. Con esos dos últimos secretos,
ejecutar manualmente el workflow con `mode=email-test`. Éxito significa **aceptado
por Resend**, no confirmación de entrega en bandeja. Nunca registrar enviado antes
de recibir el ID del proveedor.

Un plan tiene ID estable por fecha y símbolo; se persiste antes del envío y se usa
una clave de idempotencia. Envíos de resultado incierto quedan retenidos para
reconciliación, evitando reintentos duplicados. El estado no se guarda en una caché
temporal de Actions. El monitor y el screening comparten exclusión de concurrencia.

Fuentes técnicas: [programación GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[Resend](https://resend.com/docs/api-reference/emails/send-email),
[idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Portafolio y datos personales

La web pública no incluye servidor de cuentas. Por ello las operaciones se guardan
en **este navegador**, con importación/exportación de respaldo JSON. No se publican
en el repositorio, no se sincronizan entre dispositivos ni llegan al monitor.
Una sincronización privada requiere un servicio autenticado adicional.

El registro calcula efectivo, costo medio incluyendo comisiones, ganancias
realizadas y posiciones restantes; rechaza compras sin efectivo y ventas sin
acciones. Las posiciones sin cotización reciente se muestran valoradas al costo y
el patrimonio se marca estimado. Splits, dividendos e impuestos del portafolio
manual todavía requieren conciliación con IBKR; no se inventan ajustes.

Validación: `npm test`, `npm run build`. Los tests cubren cambios de lista,
compras/ventas parciales, comisiones, datos futuros, ranking con ausencias,
caducidad, gaps, sesión de mercado y respuestas del proveedor de correo.
