        let userLocation = null;
        let userWeatherData = null;
        let alertsData = [];
        let lastUpdateTime = null;
        let autoRefreshInterval = null;

        document.body.insertAdjacentHTML('afterbegin', '<div style="background:blue;color:white;padding:10px;z-index:9999;">SCRIPT RUNNING</div>');

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
        });

        // ... (rest of code)

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
                // Ensure search bar is visible even if no location
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

        // --- Weather Card Logic (Google Style) ---

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
                    <div class="hero-header">
                        <!-- 1. GPS Button (Top Priority) -->
                        <button onclick="useGeolocation()" class="btn-gps-ghost">
                            <i class="fas fa-location-arrow me-2"></i> Buscar tu ubicación
                        </button>

                        <!-- 2. Search Input (Bottom) -->
                        <div class="search-wrapper">
                            <i class="fas fa-search text-muted ms-3"></i>
                            <input type="text" id="postalCodeInput" placeholder="Ingresa Código Postal (5 dígitos)" value="${userLocation.postal_code || ''}" maxlength="5">
                            <button onclick="searchLocationFromInput()" class="search-action-btn" title="Buscar">
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                        
                        <div class="text-center mt-3 mb-2">
                            <small class="text-muted"><i class="fas fa-map-marker-alt"></i> ${userLocation.location_name}</small>
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

                    <!-- Horizontal Hourly Slider -->
                    <div class="hourly-slider-container">
                        <div class="hourly-slider">
                            ${renderHourlySlider(hourly)}
                        </div>
                    </div>
                </div>
            `;
            container.html(html);

            // Re-attach enter key listener for search
            $('#postalCodeInput').on('keypress', function (e) {
                if (e.which === 13) searchLocationFromInput();
            });
        }

        function renderLocationSearch(container) {
            const html = `
                <div class="weather-card-hero p-4">
                    <h5 class="text-center mb-4 fw-bold text-dark">Configura tu Ubicación</h5>
                    
                    <!-- 1. GPS Button -->
                    <button onclick="useGeolocation()" class="btn-gps-ghost">
                        <i class="fas fa-location-arrow me-2"></i> Buscar tu ubicación
                    </button>

                    <!-- 2. Search Input -->
                    <div class="search-wrapper">
                        <i class="fas fa-search text-muted ms-3"></i>
                        <input type="text" id="postalCodeInput" placeholder="Ingresa Código Postal (5 dígitos)" maxlength="5">
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

            // Find start index (closest to current hour)
            let startIndex = 0;
            for (let i = 0; i < hourly.time.length; i++) {
                if (new Date(hourly.time[i]).getHours() >= currentHour) {
                    startIndex = i;
                    break;
                }
            }

            // Show next 24 hours
            for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i++) {
                const time = new Date(hourly.time[i]);
                const hourStr = time.getHours() + ':00';
                const temp = Math.round(hourly.temperature_2m[i]);
                const code = hourly.weather_code[i];
                const iconInfo = getWeatherIcon(code);

                // Highlight "Now"
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
            // WMO Weather interpretation codes (WW)
            if (code === 0) return { icon: 'fas fa-sun', color: '#fbbc04' };
            if (code >= 1 && code <= 3) return { icon: 'fas fa-cloud-sun', color: '#9aa0a6' };
            if (code >= 45 && code <= 48) return { icon: 'fas fa-smog', color: '#bdc1c6' };
            if (code >= 51 && code <= 67) return { icon: 'fas fa-cloud-rain', color: '#4285f4' };
            if (code >= 80 && code <= 82) return { icon: 'fas fa-cloud-showers-heavy', color: '#1967d2' };
            if (code >= 95) return { icon: 'fas fa-bolt', color: '#ea4335' };

            return { icon: 'fas fa-cloud', color: '#9aa0a6' }; // Default
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

            navigator.geolocation.getCurrentPosition(function (position) {
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
            }, function (error) {
                showLocationStatus('error', 'No se pudo obtener la ubicación');
            });
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
                updateWeatherCard(data); // Pass full data object for hourly
                updateEmergencyBanner();
                // Removed Gauge and Forecast calls
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
                if (!data || data.length === 0) {
                    $('#historicalTimelineChart').html('<div class="text-center text-muted py-5">Sin eventos críticos en los últimos 2 años.</div>');
                    container.html('<div class="col-12 text-center text-muted">Tu ubicación ha estado segura recientemente.</div>');
                    return;
                }

                // --- 1. Render Timeline Chart ---
                const dates = data.map(e => e.date);
                const values = data.map(e => e.precipitation);
                const colors = data.map(e => {
                    if (e.severity === 'RED') return '#dc3545'; // Danger
                    if (e.severity === 'ORANGE') return '#fd7e14'; // Warning
                    return '#ffc107'; // Caution
                });

                // REMOVED: Scatter trace (black triangles) to reduce visual noise

                const barTrace = {
                    x: dates,
                    y: values,
                    type: 'bar',
                    marker: { color: colors },
                    name: 'Lluvia (mm)',
                    hoverinfo: 'none' // DISABLE TOOLTIPS
                };

                const layout = {
                    margin: { t: 30, l: 40, r: 20, b: 40 },
                    xaxis: {
                        type: 'category',
                        tickangle: -45,
                        title: '',
                        tickmode: 'auto', // Auto ticks
                        nticks: 5 // Reduce density
                    },
                    yaxis: { title: 'Precipitación (mm)' }, // Fixed typo
                    showlegend: false,
                    height: 300,
                    font: { family: 'Segoe UI' },
                    dragmode: false // Disable zooming/panning
                };

                const config = {
                    responsive: true,
                    displayModeBar: false,
                    staticPlot: false
                };

                Plotly.newPlot('historicalTimelineChart', [barTrace], layout, config).then(function (gd) {
                    // Implement Click Handler
                    gd.on('plotly_click', function (data) {
                        if (data.points.length > 0) {
                            const point = data.points[0];
                            const date = point.x;
                            const value = point.y;

                            // Update Fixed Data Card
                            $('#chartSelectedDate').text(new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }));
                            $('#chartSelectedValue').text(Math.round(value));
                            $('#chartDataCard').slideDown(200);
                        }
                    });
                });

                // --- 2. Render Impact History Cards ---
                container.empty();

                data.forEach(event => {
                    const dateObj = new Date(event.date + 'T12:00:00'); // Fix timezone offset
                    const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const severityClass = event.severity === 'RED' ? 'danger' : event.severity === 'ORANGE' ? 'warning' : 'warning'; // Bootstrap colors
                    const severityLabel = event.severity === 'RED' ? 'Torrencial' : event.severity === 'ORANGE' ? 'Fuerte' : 'Moderada';

                    // Comparative logic ("Wow" factor)
                    let comparisonText = "Un día lluvioso promedio.";
                    if (event.precipitation > 50) comparisonText = "Equivalente a 1 mes de lluvia en 1 día.";
                    else if (event.precipitation > 30) comparisonText = "Riesgo alto de inundaciones urbanas.";
                    else if (event.precipitation > 20) comparisonText = "Suficiente para causar encharcamientos.";

                    const cardHtml = `
                <div class="col-12 col-md-6 mb-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title text-capitalize mb-0 text-dark fw-bold">${dateStr}</h6>
                                <span class="badge bg-${severityClass}">${severityLabel}</span>
                            </div>
                            <div class="d-flex align-items-center mb-3">
                                <div class="display-6 fw-bold text-dark me-3">${Math.round(event.precipitation)}<span class="fs-6 text-muted">mm</span></div>
                                <div class="text-muted small lh-sm border-start ps-3">
                                    ${comparisonText}
                                </div>
                            </div>
                            ${event.severity === 'RED' ? '<div class="alert alert-danger py-1 px-2 small mb-0"><i class="fas fa-exclamation-triangle me-1"></i> Alerta de Protección Civil emitida</div>' : ''}
                        </div>
                    </div>
                </div>
                `;
                    container.append(cardHtml);
                });
            });
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
            // Refresh every minute
            autoRefreshInterval = setInterval(refreshData, 60000);

            $('#autoRefreshToggle').change(function () {
                if (this.checked) {
                    if (!autoRefreshInterval) autoRefreshInterval = setInterval(refreshData, 60000);
                } else {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            });
            // Set initial state
            $('#autoRefreshToggle').prop('checked', true);
        }

        function refreshData() {
            loadUserWeatherData();
            loadHistoricalEvents();
            loadAlerts(); // Re-fetch alerts to keep list updated
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

        // --- Notifications & Alerts ---

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
                    // Show browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(`ALERTA: ${data.alert_level.toUpperCase()}`, {
                            body: data.message,
                            icon: '/static/alert-icon.png'
                        });
                    }
                    prependAlert(data);
                    if (data.alert_level === 'red') {
                        $('#emergencyMessage').text(data.message);
                        $('#emergencyBanner').show().addClass('pulse');
                    }
                };
            }
        }

        function prependAlert(alert) {
            const alertClass = `alert-${alert.alert_level}`;
            const badgeClass = `bg-${alert.alert_level}`;
            const isCritical = alert.alert_level === 'red' || alert.alert_level === 'orange';
            const stickyClass = isCritical ? 'sticky-alert' : '';
            const indicatorClass = `indicator-${alert.alert_level}`;

            const alertElement = `
                <div class="alert-card ${alertClass} ${stickyClass} animate__animated animate__fadeInDown">
                    <div class="alert-indicator ${indicatorClass}"></div>
                    <div class="alert-header">
                        <div class="d-flex align-items-center">
                            <span class="fw-bold text-uppercase small">${alert.alert_level === 'green' ? 'Normal' : 'Alerta'}</span>
                        </div>
                        <span class="alert-time">${formatTimeAgo(alert.timestamp)}</span>
                    </div>
                    <div class="alert-body ps-4 ms-2"> <!-- Added padding/margin for indicator -->
                        <div class="mb-2">
                            <span class="badge badge-pill ${badgeClass} mb-2">${alert.alert_level.toUpperCase()}</span>
                            <div class="small text-muted mb-1"><i class="fas fa-map-marker-alt"></i> ${capitalize(alert.location_name || alert.location)}</div>
                        </div>
                        <p class="mb-0 small">${alert.message}</p>
                    </div>
                </div>
            `;
            $('#alertsList').prepend(alertElement);
        }


    </script>
</body>

</html>
