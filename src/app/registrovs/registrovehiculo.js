// RegistroVehiculos.js — QR con ZXing, BarCode con BarcodeDetector (fallback ZXing 1D)

var empresa = '001';
let dataSend = [];
let qrScanner = null;
let modal = null;
let lastScan = null;

/* ====== Estado lector ZXing ====== */
let codeReader = null;
let activeControls = null;
let switchTimer = null;
let scanning = false;

/* ====== Init ====== */
function inicializarComponentes() {
    initControls();
    renderSucursal();
    modal = new bootstrap.Modal(document.getElementById('modalScanner'), { keyboard: true });
}

/* ====== Controles UI ====== */
function initControls() {
    $('#btnScan').off('click').on('click', () => {
        modal.show();
        collapseScanner(false);
        if ($('#rbBar').is(':checked')) {
            startBarcodeNative();     // ← BarcodeDetector (fallback ZXing 1D)
        } else {
            initCamera();             // ← QR-only con ZXing
        }
    });

    // Radios: cambiar de modo “en caliente”
    $('input[name="scanMode"]').off('change').on('change', () => {
        if (!$('#modalScanner').is(':visible')) return;
        stopScannerGlobal();
        collapseScanner(false);
        if ($('#rbBar').is(':checked')) {
            startBarcodeNative();
        } else {
            initCamera();
        }
    });

    // VIN manual (click + Enter)
    $('#btnVinManual').off('click').on('click', handleVinManual);
    $('#txtVinManual').off('keypress').on('keypress', (e) => {
        if (e.which === 13) { e.preventDefault(); handleVinManual(); }
    });

    // Guardar
    $('#btnGuardar').off('click').on('click', async () => {
        const $rows = $('#tblVehiculos tbody tr');
        if ($rows.length === 0) { alert('No hay vehículos en la lista para guardar.'); return; }

        const idEmpresa = '001';
        const idSucursal = $('#cbSucursal').val();
        const idAlmacen = $('#cbAlmacen').val();
        const fechaInput = ($('#dtpFecha').val() || '').trim();
        const fecha = fechaInput || moment().format('YYYY-MM-DD');

        if (!idSucursal || !idAlmacen) { alert('Selecciona Sucursal y Almacén antes de guardar.'); return; }

        const $btn = $('#btnGuardar');
        const originalHtml = $btn.html();

        // UI busy
        $btn.prop('disabled', true).html(
            '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...'
        );

        const resultados = [];

        try {
            for (const tr of $rows) {
                const $tr = $(tr);
                const $tds = $tr.children('td');

                const stock = ($tds.eq(1).text() || '').trim();
                const payload = { idEmpresa, idVehiculo: stock, idSucursal, idAlmacen, fecha };

                try {
                    // Timeout por fila (evita spinner infinito si el API nunca responde)
                    const resp = await withTimeout(SaveVehiculoData(payload), 20000, 'Timeout guardando');
                    $tr.removeClass('table-danger').addClass('table-success');
                    resultados.push({ stock, ok: true, resp });
                } catch (e) {
                    $tr.removeClass('table-success').addClass('table-danger');
                    resultados.push({ stock, ok: false, error: e?.message || String(e) });
                }
            }

            // Resumen
            const exitos = resultados.filter(r => r.ok);
            const fallos = resultados.filter(r => !r.ok);

            let resumenHtml = '';
            if (exitos.length) {
                resumenHtml += exitos.map(r => {
                    const d = r.resp || {};
                    const doc = [d.tipoDoc, d.serie, d.numeroDocumento].filter(Boolean).join('-');
                    return doc || `OK (stock: ${r.stock})`;
                }).join('<br>');
            }
            if (fallos.length) {
                resumenHtml += (resumenHtml ? '<br>' : '') + `<small>${fallos.length} fila(s) con error.</small>`;
            }
            $('#lblDocGenerado').html(resumenHtml || 'Sin respuestas del servidor.');

            // ✅ Si hubo al menos un fallo, re-habilita para reintentar.
            // ✅ Si todo OK, lo dejas deshabilitado (como pediste).
            if (fallos.length > 0) {
                $btn.prop('disabled', false).html(originalHtml);
            } else {
                $btn.html('✅ Guardado');
            }

        } finally {
            // Si quieres que SIEMPRE se restaure (incluso todo OK), mueve el restore aquí.
            // En tu caso, NO lo hago para dejarlo deshabilitado cuando fue exitoso.
        }
    });

    // Helper timeout
    function withTimeout(promise, ms, msg = 'Timeout') {
        const controller = new AbortController(); // (no aborta fetch aquí porque tu SaveVehiculoData no lo usa)
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
        ]);
    }


    $('#btnReiniciar').off('click').on('click', async () => {
        // Detener cualquier lector y mostrar el bloque de video
        stopScannerGlobal();
        collapseScanner(false);

        // Limpiar tabla
        $('#tblVehiculos tbody').empty();

        // Limpiar estado
        lastScan = null;

        // Limpiar UI de resultado
        $('#lblDocGenerado').html('');
        $('#txtVinManual').val('');

        // Fecha a hoy (o deja la que esté si prefieres)
        $('#dtpFecha').val(moment().format('YYYY-MM-DD'));

        // (Opcional) Resetear combos si quieres limpiar TODO:
        // $('#cbSucursal').val('').trigger('change');
        // $('#cbAlmacen').val('').trigger('change');

        // Reiniciar el modo de escaneo según radio seleccionado
        if ($('#rbBar').is(':checked')) {
            startBarcodeNative();   // BarcodeDetector (fallback ZXing 1D)
        } else {
            initCamera();           // ZXing QR-only
        }

        // Llevar foco visual al bloque de video
        const wrap = getVideoWrapper();
        if (wrap && wrap.length) {
            wrap[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // Nuevo scaneo
    $('#btnNewScan').off('click').on('click', async () => {
        lastScan = null;
        $('#dtpFecha').val(moment().format('YYYY-MM-DD'));
        $('#lblDocGenerado').html('');
        stopScannerGlobal();
        collapseScanner(false);
        if ($('#rbBar').is(':checked')) {
            startBarcodeNative();
        } else {
            initCamera();
        }
        const wrap = getVideoWrapper();
        if (wrap && wrap.length) wrap[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

/* ====== VIN manual ====== */
async function handleVinManual() {
    let vin = $('#txtVinManual').val() || '';
    vin = vin.replace(/\s+/g, ' ').trim();
    if (vin.includes(' ')) vin = vin.split(' ')[1]; // "1C  123207" -> "123207"
    if (!vin) return;

    const data = await getVehiculoData(vin); // ya alerta si no hay datos
    if (data) {
        lastScan = data;
        addVehiculoToGrid(data);
        collapseScanner(true);
        $('#txtVinManual').val('');
        const tableEl = document.getElementById('tblVehiculos');
        if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


// Intenta activar autofocus continuo, exposición y balance continuo, zoom y torch si el hardware lo soporta
async function applyBestCameraControls(video, { preferZoom = 1.0, torch = false } = {}) {
    try {
        const track = video?.srcObject?.getVideoTracks?.()[0];
        if (!track) return;

        const caps = track.getCapabilities ? track.getCapabilities() : {};
        const cons = {};

        // Autofocus continuo
        if (caps.focusMode && caps.focusMode.includes('continuous')) {
            cons.focusMode = 'continuous';
        } else if (caps.focusMode && caps.focusMode.includes('single-shot')) {
            cons.focusMode = 'single-shot'; // peor que continuous, pero mejor que nada
        }

        // Exposición / balance blanco automáticos
        if (caps.exposureMode && caps.exposureMode.includes('continuous')) {
            cons.exposureMode = 'continuous';
        }
        if (caps.whiteBalanceMode && caps.whiteBalanceMode.includes('continuous')) {
            cons.whiteBalanceMode = 'continuous';
        }

        // Zoom (si soporta): valores entre min y max; 1.0 ~ sin zoom
        if (caps.zoom) {
            const mid = Math.min(Math.max(caps.zoom.min ?? 1, preferZoom), caps.zoom.max ?? preferZoom);
            cons.zoom = mid;
        }

        // Linterna (torch) opcional (solo en algunos Android traseros)
        if (caps.torch) {
            cons.advanced = [{ torch: !!torch }];
        }

        if (Object.keys(cons).length) {
            await track.applyConstraints(cons);
        }
    } catch (e) {
        // no todos los navegadores/ cámaras soportan estas capacidades
        console.debug('applyBestCameraControls no disponible en este dispositivo:', e);
    }
}

// Tap-to-focus (si el hardware lo soporta). Llama esto en un handler de touch/click.
async function tapToFocus(video, clientX, clientY) {
    try {
        const track = video?.srcObject?.getVideoTracks?.()[0];
        const caps = track?.getCapabilities?.() || {};
        // Algunos navegadores soportan "pointsOfInterest" (0..1)
        if (caps.pointsOfInterest) {
            const rect = video.getBoundingClientRect();
            const x = (clientX - rect.left) / rect.width;
            const y = (clientY - rect.top) / rect.height;
            await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x, y }], focusMode: 'single-shot' }] });
            // vuelve a continuous si lo soporta
            if (caps.focusMode && caps.focusMode.includes('continuous')) {
                setTimeout(() => track.applyConstraints({ focusMode: 'continuous' }).catch(() => { }), 400);
            }
        }
    } catch (_) { /* ignorar */ }
}

/* ====================== ZXing: QR-only ====================== */
function initCamera() {
    if (!ZXing || !ZXing.BrowserMultiFormatReader) {
        console.error('ZXing no está disponible.');
        return;
    }

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.QR_CODE]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    hints.set(ZXing.DecodeHintType.ALSO_INVERTED, true);

    if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader(hints, 180);
    else {
        codeReader.hints = hints;
        codeReader.timeBetweenDecodingAttempts = 180;
    }

    const constraints = {
        audio: false,
        video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 }, // 1280x720 suele enfocar más rápido que 1080p
            height: { ideal: 720 },
            aspectRatio: { ideal: 16 / 9 }
        }
    };

    const cb = async (result, err, controls) => {
        activeControls = controls;
        if (result) {
            stopScannerGlobal();
            try { codeReader.reset(); } catch (_) { }
            await onScanSuccess(result.text);
            return;
        }
        if (err && !(err instanceof ZXing.NotFoundException)) {
            // silencioso
        }
    };

    // Deja que ZXing abra el stream…
    if (typeof codeReader.decodeFromConstraints === 'function') {
        codeReader.decodeFromConstraints(constraints, 'scannerVideo', cb);
    } else {
        codeReader.decodeFromVideoDevice(null, 'scannerVideo', cb);
    }

    // …y cuando el <video> tenga stream, aplica autofocus/zoom
    const videoEl = document.getElementById('scannerVideo');
    const onMeta = async () => {
        videoEl.removeEventListener('loadedmetadata', onMeta);
        try { await applyBestCameraControls(videoEl, { preferZoom: 1.2 }); } catch (_) { }
    };
    videoEl.addEventListener('loadedmetadata', onMeta);

    const modalEl = document.getElementById('modalScanner');
    const onHidden = () => { stopScannerGlobal(); modalEl.removeEventListener('hidden.bs.modal', onHidden); };
    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
}


/* ====================== BarCode: BarcodeDetector nativo (fallback ZXing 1D) ====================== */
let tapFocusBound = false;

async function startBarcodeNative() {
    if (!('BarcodeDetector' in window)) {
        $('#scanStatus').text('⚠️ BarcodeDetector no soportado. Usando ZXing 1D como fallback.')
            .removeClass('text-success').addClass('text-danger small');
        startBarcodeOnly();
        return;
    }

    $('#scanStatus').text('✅ Usando BarcodeDetector nativo para códigos de barras')
        .removeClass('text-danger').addClass('text-success small');

    collapseScanner(false);

    let detector;
    try {
        detector = new BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'upc_a', 'itf'] });
    } catch (e) {
        console.warn('BarcodeDetector no pudo inicializarse; fallback ZXing 1D.', e);
        startBarcodeOnly();
        return;
    }

    const video = document.getElementById('scannerVideo');

    // Bind tap-to-focus UNA sola vez
    if (!tapFocusBound) {
        tapFocusBound = true;
        video.addEventListener('click', (ev) => tapToFocus(video, ev.clientX, ev.clientY), { passive: true });
        video.addEventListener('touchend', (ev) => {
            const t = ev.changedTouches[0];
            tapToFocus(video, t.clientX, t.clientY);
        }, { passive: true });
    }

    if (!video.srcObject) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    aspectRatio: { ideal: 16 / 9 }
                },
                audio: false
            });
            video.srcObject = stream;
            await video.play();
            await applyBestCameraControls(video, { preferZoom: 1.3 });
        } catch (e) {
            console.warn('No se pudo abrir cámara para BarcodeDetector. Fallback ZXing 1D.', e);
            startBarcodeOnly();
            return;
        }
    }

    stopScannerGlobal(false); // no cortar stream

    let running = true;
    const stop = () => { running = false; };

    const modalEl = document.getElementById('modalScanner');
    const onHidden = () => { stop(); modalEl.removeEventListener('hidden.bs.modal', onHidden); };
    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });

    (async function loop() {
        while (running) {
            try {
                const barcodes = await detector.detect(video);
                if (barcodes && barcodes.length) {
                    const raw = (barcodes[0].rawValue || '').toString();
                    let code = raw.replace(/\s+/g, ' ').trim();
                    if (code.includes(' ')) code = code.split(' ')[1];

                    const data = await getVehiculoData(code);
                    if (data) {
                        lastScan = data;
                        addVehiculoToGrid(data);
                        collapseScanner(true);
                        document.getElementById('tblVehiculos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        stop();
                        break;
                    }
                }
            } catch (e) {
                console.warn('Fallo BarcodeDetector en runtime. Fallback ZXing 1D.', e);
                if (running) startBarcodeOnly();
                return;
            }
            await new Promise(r => setTimeout(r, 120));
        }
    })();
}


/* ====== ZXing 1D (fallback para BarCode) ====== */
function startBarcodeOnly() {
    if (!ZXing || !ZXing.BrowserMultiFormatReader) {
        console.error('ZXing no está disponible para fallback 1D.');
        return;
    }

    collapseScanner(false);
    stopScannerGlobal();

    const HINTS_1D = new Map();
    HINTS_1D.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.ITF
    ]);
    HINTS_1D.set(ZXing.DecodeHintType.TRY_HARDER, true);
    HINTS_1D.set(ZXing.DecodeHintType.ALSO_INVERTED, true);

    if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader(HINTS_1D, 150);
    else {
        codeReader.hints = HINTS_1D;
        codeReader.timeBetweenDecodingAttempts = 150;
    }

    const constraints = {
        audio: false,
        video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16 / 9 }
        }
    };

    const cb = async (result, err, controls) => {
        activeControls = controls;
        if (result) {
            stopScannerGlobal();
            try { codeReader.reset(); } catch (_) { }
            await onScanSuccess(result.text);
            return;
        }
        if (err && !(err instanceof ZXing.NotFoundException)) {
            // warnings silenciosos
        }
    };

    if (typeof codeReader.decodeFromConstraints === 'function') {
        codeReader.decodeFromConstraints(constraints, 'scannerVideo', cb);
    } else {
        codeReader.decodeFromVideoDevice(null, 'scannerVideo', cb);
    }

    const modalEl = document.getElementById('modalScanner');
    const onHidden = () => { stopScannerGlobal(); modalEl.removeEventListener('hidden.bs.modal', onHidden); };
    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
}

/* ====== Parada global del lector (no corta la cámara si keepStream=true) ====== */
function stopScannerGlobal(keepStream = false) {
    scanning = false;
    if (switchTimer) { clearTimeout(switchTimer); switchTimer = null; }
    if (activeControls) { try { activeControls.stop(); } catch (_) { } activeControls = null; }
    if (codeReader) { try { codeReader.reset(); } catch (_) { } }

    if (!keepStream) {
        // Detener el stream del <video> (por ejemplo al cerrar modal)
        const video = document.getElementById('scannerVideo');
        const src = video && video.srcObject;
        if (src && src.getTracks) {
            src.getTracks().forEach(t => { try { t.stop(); } catch (_) { } });
            video.srcObject = null;
        }
    }
}

/* ====== Mostrar/Ocultar bloque de video (para priorizar tabla) ====== */
function getVideoWrapper() {
    const $wrap = $('.pm-video-wrapper');
    if ($wrap.length) return $wrap;
    const $fallback = $('#scannerVideo').parent();
    return $fallback;
}

function collapseScanner(hide) {
    const $wrap = getVideoWrapper();
    if (!$wrap || !$wrap.length) return;
    if (hide) $wrap.addClass('d-none');
    else $wrap.removeClass('d-none');
}

/* ====== Callback de éxito común ====== */
async function onScanSuccess(decodedText, decodedResult) {
    const data = await getVehiculoData(decodedText);
    if (!data) return;
    lastScan = data;
    addVehiculoToGrid(data);
    collapseScanner(true);
    document.getElementById('tblVehiculos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ====== Tabla: agregar/actualizar fila ====== */
function addVehiculoToGrid(data) {
    if (!data) return;

    const vin = (data?.vin ?? '').toString();
    const stock = (data?.idVehiculo ?? '').toString();
    const modelo = `${data?.marca ?? ''} ${data?.modelo ?? ''}`.trim();
    const color = (data?.color ?? '').toString();

    const $tbody = $('#tblVehiculos tbody');
    if ($tbody.length === 0) {
        console.warn('No se encontró #tblVehiculos tbody. Verifica que la tabla exista en la vista.');
        return;
    }

    const $existing = vin ? $tbody.find(`tr[data-vin="${vin}"]`) : $();
    const rowHtml = `
        <tr data-vin="${escapeHtml(vin)}">
            <td>${escapeHtml(vin)}</td>
            <td>${escapeHtml(stock)}</td>
            <td>${escapeHtml(modelo)}</td>
            <td>${escapeHtml(color)}</td>
        </tr>`.trim();

    if ($existing.length) $existing.replaceWith(rowHtml);
    else $tbody.prepend(rowHtml);
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/* ====================== Combos y API ====================== */
async function renderSucursal() {
    $('#cbSucursal').html('');
    try {
        const data = await getSucursalData();
        data.forEach((element) => {
            $(`<option value="${element.id}">${element.nombre}</option>`).appendTo('#cbSucursal');
        });
    } catch (ex) { alert(ex); }

    $('#cbSucursal').off('change').on('change', async () => {
        const sucursal = $('#cbSucursal').val();
        localStorage.setItem('cbSucursal', sucursal);
        localStorage.removeItem('cbAlmacen');
        await renderAlmacen(sucursal);
    });
    const sucursalLoad = localStorage.getItem('cbSucursal');
    $('#cbSucursal').val(sucursalLoad);
    await renderAlmacen(sucursalLoad);
}

async function renderAlmacen(sucursal) {
    $('#cbAlmacen').html('');
    try {
        const data = await getAlmacenData(sucursal);
        data.forEach((element) => {
            $(`<option value="${element.id}">${element.nombre}</option>`).appendTo('#cbAlmacen');
        });
    } catch (ex) { alert(ex); }

    $('#cbAlmacen').off('change').on('change', () => {
        const almacen = $('#cbAlmacen').val();
        localStorage.setItem('cbAlmacen', almacen);
    });
    const almacenLoad = localStorage.getItem('cbAlmacen');
    $('#cbAlmacen').val(almacenLoad);
    $('#cbAlmacen').trigger('change');
}

async function getSucursalData() {
    const rq = await fetch(`${window.api}/Sucursal`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    return rq.json();
}

async function getAlmacenData(idSucursal) {
    const rq = await fetch(`${window.api}/Almacen/${idSucursal}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    return rq.json();
}

async function getVehiculoData(vin) {
    if (typeof vin === 'string') {
        vin = vin.replace(/\s+/g, ' ').trim();
        if (vin.includes(' ')) vin = vin.split(' ')[1];
    }
    try {
        const rq = await fetch(`${window.api}/Car/${vin}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!rq.ok) throw new Error(`Error HTTP ${rq.status}`);

        const data = await rq.json();
        if (!data || Object.keys(data).length === 0) {
            alert(`NO SE PUDO RECONOCER EL NRO DE VIN ${vin} EN EL SISTEMA`);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error en getVehiculoData:', error);
        alert(`NO SE PUDO RECONOCER EL NRO DE VIN ${vin} EN EL SISTEMA`);
        return null;
    }
}

async function SaveVehiculoData(data) {
    const rq = await fetch(`${window.api}/Car/ingreso`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
    });
    if (!rq.ok) throw new Error(`Error HTTP ${rq.status}`);
    return rq.json();
}

/* ====== Exponer init si es necesario fuera ====== */
window.inicializarComponentes = inicializarComponentes;
