let userLocation = null;
let userWeatherData = null;
let alertsData = [];
let lastUpdateTime = null;
let autoRefreshInterval = null;

// Load data on page load
$(document).ready(function () {
    console.log("Document ready - initializing...");
    try {
        checkUserLocation();
    } catch (e) {
        console.error("Error calling checkUserLocation:", e);
    }
    loadAlerts();
    setupAutoRefresh();
    updateLastUpdateTime();
    setInterval(updateTimeAgo, 30000);
    setupNotifications();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registred:', reg.scope))
            .catch(err => console.error('SW failed:', err));
    }
});

function checkUserLocation() {
    console.log("Checking user location...");
    $.get('/api/location/current', function (data) {
        console.log("User location found:", data);
        userLocation = data;
        $('#postalCodeInput').val(userLocation.postal_code || '');
        loadUserWeatherData();
        loadHistoricalEvents();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('No user location set or error:', textStatus, errorThrown);
        updateWeatherCard(null);
    });
}

// SPA Tab Switching
function switchTab(tabName) {
    $('.nav-item-bottom').removeClass('active');
    $(`.nav-item-bottom[onclick="switchTab('${tabName}')"]`).addClass('active');
    $('.view-container').removeClass('active');
    $(`#view-${tabName}`).addClass('active');

    if (tabName === 'charts') {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }
    window.scrollTo(0, 0);
}

// --- Weather Card Logic ---

function updateWeatherCard(data) {
    const container = $('#weatherCardContainer');

    if (!userLocation) {
        renderLocationSearch(container);
        return;
    }

    if (!data) return;

    const weather = data.current_weather;
    const hourly = weather.hourly || {};
    const weatherInfo = getWeatherIcon(weather.weather_code || 0);

    const html = `
        <div class="weather-card-hero animate__animated animate__fadeIn">
            <div class="hero-header pt-3 px-3">
                <!-- Location Selector Button (Redesigned) -->
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
        if (new Date(hourly.time[i]).getHours() >= currentHour) {
            startIndex = i;
            break;
        }
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

// --- Search Logic ---

function searchLocationFromInput() {
    const postalCode = $('#postalCodeInput').val().trim();
    if (!postalCode) {
        showLocationStatus('warning', 'Ingresa un código postal');
        return;
    }
    if (!/^\d{5}$/.test(postalCode)) {
        showLocationStatus('error', 'Debe tener 5 dígitos');
        return;
    }
    searchLocation(postalCode);
}

function searchLocation(postalCode) {
    showLocationStatus('info', '<i class="fas fa-spinner fa-spin"></i> Buscando...');

    $.get(`/api/location/search?postal_code=${postalCode}`, function (data) {
        $.ajax({
            url: '/api/location/set',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ postal_code: postalCode }),
            success: function (response) {
                userLocation = response.location;
                showLocationStatus('success', `Ubicación: ${userLocation.location_name}`);
                loadUserWeatherData();
                loadHistoricalEvents();
            },
            error: function () {
                showLocationStatus('error', 'Error al configurar');
            }
        });
    }).fail(function () {
        showLocationStatus('error', 'CP no encontrado en BC');
    });
}

function useGeolocation() {
    showLocationStatus('info', '<i class="fas fa-spinner fa-spin"></i> Localizando...');

    if (!navigator.geolocation) {
        showLocationStatus('error', 'Geolocalización no soportada');
        return;
    }

    const optionsHighAccuracy = {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 0
    };

    const optionsLowAccuracy = {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes cache
    };

    function onPositionFound(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        $.ajax({
            url: '/api/location/set',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ latitude: lat, longitude: lon }),
            success: function (response) {
                userLocation = response.location;
                showLocationStatus('success', `Ubicación: ${userLocation.location_name}`);
                loadUserWeatherData();
                loadHistoricalEvents();
            },
            error: function () {
                showLocationStatus('error', 'Error al configurar');
            }
        });
    }

    function onLowAccuracyError(error) {
        console.error("Geolocation Final Error:", error);
        let msg = 'No se pudo obtener la ubicación';
        if (error.code === 1) msg = 'Permiso denegado';
        else if (error.code === 2) msg = 'Ubicación no disponible';
        else if (error.code === 3) msg = 'Tiempo de espera agotado';
        showLocationStatus('error', msg);
    }

    function onHighAccuracyError(error) {
        console.warn("High accuracy geolocation failed, trying low accuracy...", error);
        // Fallback to low accuracy (helps on Desktop Chrome without GPS)
        navigator.geolocation.getCurrentPosition(onPositionFound, onLowAccuracyError, optionsLowAccuracy);
    }

    // Attempt 1: High Accuracy (Best for Mobile)
    navigator.geolocation.getCurrentPosition(onPositionFound, onHighAccuracyError, optionsHighAccuracy);
}

function showLocationStatus(type, message) {
    const color = type === 'error' ? 'text-danger' : type === 'success' ? 'text-success' : type === 'warning' ? 'text-warning' : 'text-primary';
    $('#locationStatus').html(`<span class="${color}">${message}</span>`);
}

// --- Data Loading & Charts ---

function loadUserWeatherData() {
    if (!userLocation) return;

    $.get('/api/location/user-weather', function (data) {
        userWeatherData = data;
        updateWeatherCard(data);
        updateEmergencyBanner();
        lastUpdateTime = new Date();
        updateLastUpdateTime();
    }).fail(function () {
        showLocationStatus('error', 'Error de conexión');
    });
}

function updateEmergencyBanner() {
    // Logic handled in connectEventSource mostly
}

function updateTimeAgo() {
    if (!lastUpdateTime) return;
    const now = new Date();
    const diffMs = now - lastUpdateTime;
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

function loadHistoricalEvents() {
    $.get('/api/historical-alerts', function (data) {
        const container = $('#impactHistoryList');

        // 1. Calculate and Render Stats
        if (data && data.length > 0) {
            const totalEvents = data.length;
            const maxRain = Math.max(...data.map(e => e.precipitation));
            const lastEventDate = new Date(data[0].date + 'T12:00:00'); // Assuming sorted DESC
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

        // 2. Render Chart
        const dates = data.map(e => e.date);
        const values = data.map(e => e.precipitation);
        const colors = data.map(e => {
            if (e.severity === 'RED') return '#dc3545';
            if (e.severity === 'ORANGE') return '#fd7e14';
            return '#ffc107'; // yellow
        });

        const barTrace = {
            x: dates,
            y: values,
            type: 'bar',
            marker: {
                color: values,
                colorscale: [
                    [0, '#a5b4fc'], [0.5, '#6366f1'], [1, '#4f46e5']
                ],
                showscale: false
            },
            name: 'Lluvia',
            hovertemplate: '%{y} mm<br>%{x}<extra></extra>'
        };

        const layout = {
            margin: { t: 10, l: 30, r: 10, b: 30 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: {
                type: 'category',
                showgrid: false,
                tickfont: { color: '#9ca3af', size: 10 }
            },
            yaxis: {
                title: '',
                showgrid: true,
                gridcolor: '#f3f4f6',
                zeroline: false,
                tickfont: { color: '#9ca3af', size: 10 }
            },
            showlegend: false,
            height: 300,
            font: { family: 'Segoe UI, sans-serif' },
            dragmode: false,
            hovermode: 'closest'
        };

        const config = { responsive: true, displayModeBar: false, staticPlot: false };

        Plotly.newPlot('historicalTimelineChart', [barTrace], layout, config).then(function (gd) {
            gd.on('plotly_click', function (data) {
                if (data.points.length > 0) {
                    const point = data.points[0];
                    const date = point.x;
                    const value = point.y;

                    const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long' });

                    $('#chartSelectedDate').text(capitalize(dateFormatted));
                    $('#chartSelectedValue').text(Math.round(value));

                    $('#chartDataDisplay').removeClass('d-none').addClass('animate__fadeIn');
                    // Scroll slightly if needed or just show
                }
            });
        });

        // 3. Render List
        container.empty();

        data.forEach(event => {
            const dateObj = new Date(event.date + 'T12:00:00');
            const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });

            const severityColor = event.severity === 'RED' ? '#dc3545' : event.severity === 'ORANGE' ? '#fd7e14' : '#ffc107';
            const riskWidth = Math.min(event.precipitation, 100);

            const cardHtml = `
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
                            
                            <p class="mb-0 text-muted small lh-sm">
                                ${getImpactDescription(event.precipitation)}
                            </p>
                        </div>
                    </div>
                </div>
            `;
            container.append(cardHtml);
        });
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
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;
    return date.toLocaleDateString();
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
    loadAlerts();
    const btn = $('#manualRefreshBtn');
    const originalText = btn.text();
    btn.prop('disabled', true).text('Actualizando...');
    setTimeout(() => {
        btn.prop('disabled', false).text(originalText);
    }, 1000);
}

function loadAlerts() {
    $.get('/api/alerts', function (data) {
        $('#alertsList').empty();
        data.forEach(alert => prependAlert(alert));
    });
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
        connectEventSource();
    }

    $('#notifyBtn').click(function () {
        if (isIOS && !isStandalone && Notification.permission !== 'granted') {
            alert("En iPhone/iPad, para recibir notificaciones debes agregar esta página a tu Pantalla de Inicio.");
        }

        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    $(this).html('<i class="fas fa-check"></i> Notificaciones Activas').removeClass('btn-outline-primary').addClass('btn-success');
                    connectEventSource();
                    new Notification("Sistema de Alertas", { body: "Notificaciones activadas correctamente." });
                } else {
                    alert("Permiso denegado. Habilítalo en la configuración del navegador.");
                }
            });
        }
    });
}

function connectEventSource() {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.type === 'alert') {

            // Trigger Notification
            if (Notification.permission === 'granted') {
                const title = `ALERTA: ${data.alert_level.toUpperCase()}`;
                const options = {
                    body: data.message,
                    icon: '/static/icon.svg', // Fixed icon path
                    vibrate: [200, 100, 200],
                    badge: '/static/icon.svg',
                    tag: 'alert-' + data.id
                };

                // Try Service Worker registration first (better for mobile/PWA)
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(function (registration) {
                        registration.showNotification(title, options);
                    });
                } else {
                    // Fallback to classic API
                    new Notification(title, options);
                }
            }

            prependAlert(data);
            if (data.alert_level === 'red') {
                $('#emergencyMessage').html('<i class="fas fa-exclamation-triangle"></i> ' + data.message);
                $('#emergencyBanner').show().addClass('pulse');
            }
        }
    };
}

function prependAlert(alert) {
    const alertClass = `alert-${alert.alert_level}`;
    const badgeClass = `bg-${alert.alert_level}`;
    const isCritical = alert.alert_level === 'red' || alert.alert_level === 'orange';
    const stickyClass = isCritical ? 'sticky-alert' : '';

    // Colors for the dot
    let dotColor = '#ffc107'; // yellow default
    if (alert.alert_level === 'red') dotColor = '#dc3545';
    else if (alert.alert_level === 'orange') dotColor = '#fd7e14';
    else if (alert.alert_level === 'green') dotColor = '#198754';

    const alertElement = `
        <div class="alert-card ${alertClass} ${stickyClass} animate__animated animate__fadeInDown mb-3 border-0 shadow-sm" style="border-left: 5px solid ${dotColor} !important; background: white; border-radius: 8px;">
            <div class="p-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-circle me-2" style="color: ${dotColor}; font-size: 0.8rem;"></i>
                        <span class="fw-bold text-dark">ALERTA</span>
                    </div>
                    <span class="text-muted small">${formatTimeAgo(alert.timestamp)}</span>
                </div>
                
                <div class="text-muted small mb-3">
                    <i class="fas fa-map-marker-alt me-1"></i> ${capitalize(alert.location_name || alert.location)}
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
