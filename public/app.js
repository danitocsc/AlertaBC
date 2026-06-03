const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const ALERT_THRESHOLDS = { yellow: 5, orange: 15, red: 25 };

let userLocation = null;
let userWeatherData = null;
let alertsData = [];
let lastUpdateTime = null;
let autoRefreshInterval = null;

$(document).ready(function () {
    try { checkUserLocation(); } catch (e) { console.error("Error calling checkUserLocation:", e); }
    setupAutoRefresh();
    updateLastUpdateTime();
    setInterval(updateTimeAgo, 30000);
    setInterval(updateAlertTimes, 60000);
    setupNotifications();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.error('SW failed:', err));
    }
});

function checkUserLocation() {
    const stored = localStorage.getItem('userLocation');
    if (stored) {
        userLocation = JSON.parse(stored);
        $('#postalCodeInput').val(userLocation.postal_code || '');
        loadUserWeatherData();
        loadHistoricalEvents();
    } else {
        updateWeatherCard(null);
    }
}

function switchTab(tabName) {
    $('.nav-item-bottom').removeClass('active');
    $(`.nav-item-bottom[onclick="switchTab('${tabName}')"]`).addClass('active');
    $('.view-container').removeClass('active');
    $(`#view-${tabName}`).addClass('active');
    if (tabName === 'charts') setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    window.scrollTo(0, 0);
}

function updateWeatherCard(data) {
    const container = $('#weatherCardContainer');
    if (!userLocation) { renderLocationSearch(container); return; }
    if (!data) return;

    const weather = data.current_weather;
    const hourly = weather.hourly || {};
    const weatherInfo = getWeatherIcon(weather.weather_code || 0);

    const html = `
        <div class="weather-card-hero animate__animated animate__fadeIn">
            <div class="hero-header pt-3 px-3">
                <button onclick="useGeolocation()" class="btn-location-header mb-3 justify-content-center">
                    <div class="d-flex align-items-center text-truncate">
                        <i class="fas fa-map-marker-alt text-primary me-2 flex-shrink-0" style="font-size: 1.1rem;"></i>
                        <span class="text-dark fw-bold text-truncate">${userLocation.location_name}</span>
                    </div>
                </button>
                <div class="search-wrapper">
                    <i class="fas fa-search text-muted ms-3"></i>
                    <input type="text" id="postalCodeInput" placeholder="Ingresa Código Postal (5 dígitos)" value="${userLocation.postal_code || ''}" maxlength="5">
                    <button onclick="searchLocationFromInput()" class="search-action-btn" title="Buscar">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div id="locationStatus" class="text-center small mb-2"></div>
            </div>
            <div class="hero-content">
                <div class="hero-left">
                    <div class="temp-display">${Math.round(weather.temperature)}°</div>
                    <i class="${weatherInfo.icon} weather-icon-large" style="color: ${weatherInfo.color}"></i>
                </div>
                <div class="hero-right">
                    <div class="data-chip">
                        <i class="fas fa-tint text-primary"></i>
                        <span>${weather.precipitation} mm</span>
                    </div>
                    <div class="data-chip">
                        <i class="fas fa-wind text-secondary"></i>
                        <span>${weather.wind_speed} km/h</span>
                    </div>
                    <div class="data-chip">
                        <i class="fas fa-water text-info"></i>
                        <span>${weather.humidity}%</span>
                    </div>
                </div>
            </div>
            <div class="hourly-slider-container">
                <div class="hourly-slider">
                    ${renderHourlySlider(hourly)}
                </div>
            </div>
        </div>
    `;
    container.html(html);

    $('#postalCodeInput').on('keypress', function (e) {
        if (e.which === 13) searchLocationFromInput();
    });
}

function renderLocationSearch(container) {
    const html = `
        <div class="weather-card-hero p-4">
            <h4 class="text-center fw-bold text-dark mb-1">Bienvenido a Alerta BC</h4>
            <p class="text-center text-muted small mb-4">Configura tu ubicación para continuar</p>
            <button onclick="useGeolocation()" class="btn-location-header mb-4 w-100 justify-content-center">
                 <div class="d-flex align-items-center">
                    <i class="fas fa-map-marker-alt text-primary me-2" style="font-size: 1.1rem;"></i>
                    <span class="text-primary fw-bold">Buscar tu ubicación</span>
                </div>
            </button>
            <div class="search-wrapper">
                <i class="fas fa-search text-muted ms-3"></i>
                <input type="text" id="postalCodeInput" placeholder="O Ingresa Código Postal (5 dígitos)" maxlength="5">
                <button onclick="searchLocationFromInput()" class="search-action-btn" title="Buscar">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div id="locationStatus" class="text-center small mt-3"></div>
        </div>
    `;
    container.html(html);
    $('#postalCodeInput').on('keypress', function (e) {
        if (e.which === 13) searchLocationFromInput();
    });
}

function renderHourlySlider(hourly) {
    if (!hourly || !hourly.time) return '<div class="text-center w-100 small text-muted">Pronóstico no disponible</div>';
    let html = '';
    const now = new Date();
    const currentHour = now.getHours();
    let startIndex = 0;
    for (let i = 0; i < hourly.time.length; i++) {
        if (new Date(hourly.time[i]).getHours() >= currentHour) { startIndex = i; break; }
    }
    for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i++) {
        const time = new Date(hourly.time[i]);
        const hourStr = time.getHours() + ':00';
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = hourly.weather_code[i];
        const iconInfo = getWeatherIcon(code);
        const isNow = i === startIndex;
        const timeLabel = isNow ? 'Ahora' : hourStr;
        const weight = isNow ? 'fw-bold' : '';
        html += `
            <div class="hourly-cell ${weight}">
                <span class="hourly-time">${timeLabel}</span>
                <i class="${iconInfo.icon} hourly-icon" style="color: ${iconInfo.color}"></i>
                <span class="hourly-temp">${temp}°</span>
            </div>
        `;
    }
    return html;
}

function getWeatherIcon(code) {
    if (code === 0) return { icon: 'fas fa-sun', color: '#fbbc04' };
    if (code >= 1 && code <= 3) return { icon: 'fas fa-cloud-sun', color: '#9aa0a6' };
    if (code >= 45 && code <= 48) return { icon: 'fas fa-smog', color: '#bdc1c6' };
    if (code >= 51 && code <= 67) return { icon: 'fas fa-cloud-rain', color: '#4285f4' };
    if (code >= 80 && code <= 82) return { icon: 'fas fa-cloud-showers-heavy', color: '#1967d2' };
    if (code >= 95) return { icon: 'fas fa-bolt', color: '#ea4335' };
    return { icon: 'fas fa-cloud', color: '#9aa0a6' };
}

function searchLocationFromInput() {
    const postalCode = $('#postalCodeInput').val().trim();
    if (!postalCode) { showLocationStatus('warning', 'Ingresa un código postal'); return; }
    if (!/^\d{5}$/.test(postalCode)) { showLocationStatus('error', 'Debe tener 5 dígitos'); return; }
    searchLocation(postalCode);
}

function searchLocation(postalCode) {
    showLocationStatus('info', '<i class="fas fa-spinner fa-spin"></i> Buscando...');
    const locationInfo = getLocationInfoByPostalCode(postalCode);
    if (!locationInfo) { showLocationStatus('error', 'CP no encontrado en BC'); return; }

    const loc = {
        postal_code: postalCode,
        latitude: locationInfo.lat,
        longitude: locationInfo.lon,
        location_name: `${locationInfo.colonia}, ${locationInfo.municipio}`,
        municipio: locationInfo.municipio,
        colonia: locationInfo.colonia,
        state: 'Baja California'
    };
    saveLocation(loc);
    showLocationStatus('success', `Ubicación: ${loc.location_name}`);
    loadUserWeatherData();
    loadHistoricalEvents();
}

function useGeolocation() {
    showLocationStatus('info', '<i class="fas fa-spinner fa-spin"></i> Localizando...');
    if (!navigator.geolocation) { showLocationStatus('error', 'Geolocalización no soportada'); return; }

    const optionsHigh = { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 };
    const optionsLow = { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 };

    function onPositionFound(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const closestCode = findClosestPostalCode(lat, lon);
        let loc;
        if (closestCode) {
            const info = getLocationInfoByPostalCode(closestCode);
            loc = {
                postal_code: closestCode,
                latitude: lat,
                longitude: lon,
                location_name: `${info.colonia}, ${info.municipio}`,
                municipio: info.municipio,
                colonia: info.colonia,
                state: 'Baja California'
            };
        } else {
            loc = {
                postal_code: 'N/A',
                latitude: lat,
                longitude: lon,
                location_name: `Ubicación (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
                municipio: 'Desconocido',
                state: 'Baja California'
            };
        }
        saveLocation(loc);
        showLocationStatus('success', `Ubicación: ${loc.location_name}`);
        loadUserWeatherData();
        loadHistoricalEvents();
    }

    function onLowError(error) {
        let msg = 'No se pudo obtener la ubicación';
        if (error.code === 1) msg = 'Permiso denegado';
        else if (error.code === 2) msg = 'Ubicación no disponible';
        else if (error.code === 3) msg = 'Tiempo de espera agotado';
        showLocationStatus('error', msg);
    }

    function onHighError(error) {
        navigator.geolocation.getCurrentPosition(onPositionFound, onLowError, optionsLow);
    }

    navigator.geolocation.getCurrentPosition(onPositionFound, onHighError, optionsHigh);
}

function showLocationStatus(type, message) {
    const color = type === 'error' ? 'text-danger' : type === 'success' ? 'text-success' : type === 'warning' ? 'text-warning' : 'text-primary';
    $('#locationStatus').html(`<span class="${color}">${message}</span>`);
}

function saveLocation(loc) {
    userLocation = loc;
    localStorage.setItem('userLocation', JSON.stringify(loc));
}

function loadUserWeatherData() {
    if (!userLocation) return;
    fetchWeatherData(userLocation.latitude, userLocation.longitude).then(data => {
        if (data) {
            userWeatherData = data;
            updateWeatherCard(data);
            checkAndGenerateAlert(data);
            lastUpdateTime = new Date();
            updateLastUpdateTime();
        }
    }).catch(() => showLocationStatus('error', 'Error de conexión'));
}

async function fetchWeatherData(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,precipitation,rain,showers,weather_code,wind_speed_10m,relative_humidity_2m,surface_pressure",
        hourly: "precipitation_probability,precipitation,temperature_2m,weather_code",
        daily: "precipitation_sum,precipitation_probability_max",
        timezone: "America/Tijuana",
        forecast_days: "2"
    });
    try {
        const response = await fetch(`${OPEN_METEO_FORECAST}?${params}`);
        if (!response.ok) throw new Error('API error');
        const rawData = await response.json();
        return { location: userLocation, current_weather: processWeatherData(rawData) };
    } catch (e) {
        console.error("Error fetching weather:", e);
        return { location: userLocation, current_weather: getMockWeatherData() };
    }
}

function processWeatherData(data) {
    if (!data || !data.current) return getMockWeatherData();
    const current = data.current;
    const precip = current.precipitation || 0.0;
    const dailySum = (data.daily && data.daily.precipitation_sum && data.daily.precipitation_sum[0]) || 0;

    let alertLevel = 'green';
    let message = "Condiciones normales.";
    if (precip > ALERT_THRESHOLDS.red || dailySum > 50) {
        alertLevel = 'red';
        message = `¡ALERTA ROJA! Lluvia torrencial detectada (${precip}mm/h o ${dailySum}mm/24h). Riesgo alto de inundación.`;
    } else if (precip > ALERT_THRESHOLDS.orange) {
        alertLevel = 'orange';
        message = `Alerta Naranja: Lluvia fuerte detectada (${precip}mm/h). Precaución en zonas bajas.`;
    } else if (precip > ALERT_THRESHOLDS.yellow) {
        alertLevel = 'yellow';
        message = `Alerta Amarilla: Lluvia moderada (${precip}mm/h). Conduzca con precaución.`;
    }

    return {
        timestamp: new Date().toISOString(),
        temperature: current.temperature_2m,
        precipitation: precip,
        wind_speed: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        pressure: current.surface_pressure,
        weather_code: current.weather_code,
        alert_level: alertLevel,
        message: message,
        location_name: userLocation.location_name,
        postal_code: userLocation.postal_code,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        hourly: data.hourly || {}
    };
}

function getMockWeatherData() {
    const now = new Date();
    return {
        timestamp: now.toISOString(),
        temperature: 22.5,
        precipitation: 0.0,
        wind_speed: 12.0,
        humidity: 45,
        pressure: 1015.0,
        weather_code: 1,
        alert_level: 'green',
        message: "Condiciones normales.",
        hourly: {
            time: Array.from({ length: 24 }, (_, i) => { const d = new Date(now); d.setHours(now.getHours() + i, 0, 0, 0); return d.toISOString(); }),
            precipitation_probability: Array(24).fill(0),
            precipitation: Array(24).fill(0.0),
            temperature_2m: Array(24).fill(22.0),
            weather_code: Array(24).fill(1)
        }
    };
}

function checkAndGenerateAlert(data) {
    const weather = data.current_weather;
    if (weather.alert_level !== 'green') {
        const alert = {
            type: 'alert',
            id: Date.now(),
            alert_level: weather.alert_level,
            timestamp: weather.timestamp,
            message: weather.message,
            location_name: weather.location_name
        };
        prependAlert(alert);
        if (alert.alert_level === 'red') {
            $('#emergencyMessage').html('<i class="fas fa-exclamation-triangle"></i> ' + alert.message);
            $('#emergencyBanner').show().addClass('pulse');
        }
        if (Notification.permission === 'granted') {
            const title = `ALERTA: ${alert.alert_level.toUpperCase()}`;
            const options = {
                body: alert.message,
                icon: '/icon.svg',
                vibrate: [200, 100, 200],
                tag: 'alert-' + alert.id
            };
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
            } else {
                new Notification(title, options);
            }
        }
    }
}

function loadHistoricalEvents() {
    if (!userLocation) return;
    const lat = Math.round(userLocation.latitude * 100) / 100;
    const lon = Math.round(userLocation.longitude * 100) / 100;
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 730 * 86400000).toISOString().split('T')[0];

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        start_date: start,
        end_date: end,
        daily: "precipitation_sum",
        timezone: "America/Tijuana"
    });

    fetch(`${OPEN_METEO_ARCHIVE}?${params}`)
        .then(r => r.json())
        .then(data => {
            const events = [];
            if (data.daily && data.daily.precipitation_sum && data.daily.time) {
                for (let i = 0; i < data.daily.time.length; i++) {
                    const precip = data.daily.precipitation_sum[i];
                    if (precip !== null && precip > 10) {
                        const severity = precip > 30 ? 'RED' : precip > 20 ? 'ORANGE' : 'YELLOW';
                        events.push({ date: data.daily.time[i], precipitation: precip, severity: severity });
                    }
                }
            }
            events.sort((a, b) => new Date(b.date) - new Date(a.date));
            renderHistoricalEvents(events);
        })
        .catch(() => renderHistoricalEvents([]));
}

function renderHistoricalEvents(data) {
    const container = $('#impactHistoryList');

    if (data && data.length > 0) {
        const totalEvents = data.length;
        const maxRain = Math.max(...data.map(e => e.precipitation));
        const lastEventDate = new Date(data[0].date + 'T12:00:00');
        const lastDateStr = lastEventDate.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
        $('#statTotalEvents').text(totalEvents);
        $('#statMaxRain').text(Math.round(maxRain));
        $('#statLastDate').text(lastDateStr);
    } else {
        $('#statTotalEvents').text('0');
        $('#statMaxRain').text('0');
        $('#statLastDate').text('-');
        $('#historicalTimelineChart').html('<div class="d-flex align-items-center justify-content-center h-100 text-muted small">Sin eventos registrados recientemente</div>');
        container.html('<div class="col-12 text-center text-muted small py-4">No hay registros históricos de riesgo.</div>');
        return;
    }

    const isMobile = window.innerWidth < 768;
    let chartData = isMobile ? data.slice(0, 25) : data;
    const plotData = [...chartData].reverse();

    const dates = plotData.map(e => e.date);
    const values = plotData.map(e => e.precipitation);
    const primaryColor = '#4f46e5';
    const colors = plotData.map(e => e.severity === 'RED' ? '#dc3545' : primaryColor);

    const barTrace = {
        x: dates,
        y: values,
        type: 'bar',
        marker: { color: colors },
        name: 'Lluvia',
        hovertemplate: '%{x|%a %d %b}<br><b>%{y:.1f} mm</b><extra></extra>'
    };

    const layout = {
        margin: isMobile ? { t: 10, l: 30, r: 10, b: 40 } : { t: 10, l: 40, r: 20, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: { type: 'category', showgrid: false, tickfont: { color: '#9ca3af', size: isMobile ? 11 : 10 } },
        yaxis: { title: '', showgrid: true, gridcolor: '#f3f4f6', zeroline: false, tickfont: { color: '#9ca3af', size: isMobile ? 11 : 10 } },
        showlegend: false,
        autosize: true,
        font: { family: 'Segoe UI, sans-serif' },
        dragmode: false,
        hovermode: 'closest'
    };

    Plotly.newPlot('historicalTimelineChart', [barTrace], layout, { responsive: true, displayModeBar: false, staticPlot: false, scrollZoom: false }).then(gd => {
        gd.on('plotly_click', function (data) {
            if (data.points.length > 0) {
                const point = data.points[0];
                const dateFormatted = new Date(point.x + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' });
                $('#chartSelectedDate').text(capitalize(dateFormatted));
                $('#chartSelectedValue').text(Math.round(point.y));
                $('#chartDataDisplay').removeClass('d-none').addClass('animate__fadeIn');
            }
        });
    });

    container.empty();
    data.forEach(event => {
        const dateObj = new Date(event.date + 'T12:00:00');
        const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
        const severityColor = event.severity === 'RED' ? '#dc3545' : event.severity === 'ORANGE' ? '#fd7e14' : '#ffc107';
        const riskWidth = Math.min(event.precipitation, 100);
        container.append(`
            <div class="col-12 col-md-6">
                <div class="card border-0 shadow-sm h-100" style="border-radius: 16px; background: white;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="text-capitalize fw-bold text-dark">${dateStr}</span>
                            <span class="badge rounded-pill text-dark" style="background-color: ${severityColor}20; color: ${severityColor} !important;">${translateSeverity(event.severity)}</span>
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <div class="flex-grow-1 me-3">
                                <div class="progress" style="height: 6px; border-radius: 10px; background-color: #f0f2f5;">
                                    <div class="progress-bar" role="progressbar" style="width: ${riskWidth}%; background-color: ${severityColor}; border-radius: 10px;"></div>
                                </div>
                            </div>
                            <span class="fw-bold text-dark">${Math.round(event.precipitation)} mm</span>
                        </div>
                        <p class="mb-0 text-muted small lh-sm">${getImpactDescription(event.precipitation)}</p>
                    </div>
                </div>
            </div>
        `);
    });
}

function getImpactDescription(precip) {
    if (precip > 50) return "Equivalente a 1 mes de lluvia en 24h.";
    if (precip > 30) return "Riesgo alto de inundaciones y corrientes.";
    if (precip > 20) return "Posibles encharcamientos en zonas bajas.";
    return "Lluvia moderada, sin riesgo mayor.";
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 30) return `hace ${diffMins} min`;
    if (diffMins < 60) return 'hace media hora';
    return 'hace 1 hora';
}

function updateAlertTimes() {
    $('.alert-card').each(function () {
        const timestamp = $(this).data('timestamp');
        if (timestamp) {
            const timeText = formatTimeAgo(timestamp);
            const diffMs = Date.now() - new Date(timestamp).getTime();
            if (diffMs > 3660000) {
                $(this).fadeOut(500, function () { $(this).remove(); });
            } else {
                $(this).find('.time-ago-display').text(timeText);
            }
        }
    });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function setupAutoRefresh() {
    autoRefreshInterval = setInterval(refreshData, 60000);
    $('#autoRefreshToggle').change(function () {
        if (this.checked) {
            if (!autoRefreshInterval) autoRefreshInterval = setInterval(refreshData, 60000);
        } else {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    });
    $('#autoRefreshToggle').prop('checked', true);
}

function refreshData() {
    loadUserWeatherData();
    loadHistoricalEvents();
    const btn = $('#manualRefreshBtn');
    const originalText = btn.text();
    btn.prop('disabled', true).text('Actualizando...');
    setTimeout(() => { btn.prop('disabled', false).text(originalText); }, 1000);
}

function setupNotifications() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = ('standalone' in window.navigator) && (window.navigator.standalone);

    if (!('Notification' in window)) {
        $('#notifyBtn').prop('disabled', true).text('No soportado');
        return;
    }
    if (Notification.permission === 'granted') {
        $('#notifyBtn').html('<i class="fas fa-check"></i> Notificaciones Activas').removeClass('btn-outline-primary').addClass('btn-success');
    }
    $('#notifyBtn').click(function () {
        if (isIOS && !isStandalone && Notification.permission !== 'granted') {
            alert("En iPhone/iPad, para recibir notificaciones debes agregar esta página a tu Pantalla de Inicio.");
        }
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    $(this).html('<i class="fas fa-check"></i> Notificaciones Activas').removeClass('btn-outline-primary').addClass('btn-success');
                    new Notification("Sistema de Alertas", { body: "Notificaciones activadas correctamente." });
                } else {
                    alert("Permiso denegado. Habilítalo en la configuración del navegador.");
                }
            });
        }
    });
}

function prependAlert(alert) {
    const alertClass = `alert-${alert.alert_level}`;
    let dotColor = '#ffc107';
    if (alert.alert_level === 'red') dotColor = '#dc3545';
    else if (alert.alert_level === 'orange') dotColor = '#fd7e14';
    else if (alert.alert_level === 'green') dotColor = '#198754';

    const alertElement = `
        <div class="alert-card ${alertClass} animate__animated animate__fadeInDown mb-3 border-0 shadow-sm" data-timestamp="${alert.timestamp}" style="border-left: 5px solid ${dotColor} !important; background: white; border-radius: 8px;">
            <div class="p-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-circle me-2" style="color: ${dotColor}; font-size: 0.8rem;"></i>
                        <span class="fw-bold text-dark">ALERTA</span>
                    </div>
                    <span class="text-muted small time-ago-display">${formatTimeAgo(alert.timestamp)}</span>
                </div>
                <div class="text-muted small mb-3">
                    <i class="fas fa-map-marker-alt me-1"></i> ${capitalize(alert.location_name || '')}
                </div>
                <div class="mb-2">
                    <span class="badge rounded-pill text-uppercase text-dark" style="background-color: ${dotColor}; padding: 0.5em 1em; font-weight: 600;">${translateSeverity(alert.alert_level)}</span>
                </div>
                <p class="mb-0 text-secondary" style="font-size: 0.95rem; line-height: 1.4;">${alert.message}</p>
            </div>
        </div>
    `;
    $('#alertsList').prepend(alertElement);
}

function translateSeverity(severity) {
    if (!severity) return '';
    const s = severity.toLowerCase();
    if (s === 'red') return 'ROJA';
    if (s === 'orange') return 'NARANJA';
    if (s === 'yellow') return 'AMARILLA';
    if (s === 'green') return 'VERDE';
    return severity.toUpperCase();
}

function updateTimeAgo() {
    if (!lastUpdateTime) return;
    const diffMs = Date.now() - lastUpdateTime;
    const diffMinutes = Math.floor(diffMs / 60000);
    let text = '';
    if (diffMinutes < 1) text = 'hace un momento';
    else if (diffMinutes < 60) text = `hace ${diffMinutes} min`;
    else text = `hace ${Math.floor(diffMinutes / 60)} h`;
    $('#timeAgo').text(text);
}

function updateLastUpdateTime() {
    const now = new Date();
    $('#lastUpdateTime').text(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
    updateTimeAgo();
}
