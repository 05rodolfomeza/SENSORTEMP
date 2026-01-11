// ==========================================
// CONFIGURACIÓN ADAFRUIT IO
// ==========================================
const AIO_USERNAME = "Rodolfoo13";
const PREFIJO = "aio_";
const SECRETO = "lCEa54hiDweU9IqEpv78E62R3AVZ";
const AIO_KEY = PREFIJO + SECRETO;

const FEED_TEMP = AIO_USERNAME + "/feeds/temperatura";
const FEED_HUM = AIO_USERNAME + "/feeds/humedad";
const FEED_LUM = AIO_USERNAME + "/feeds/luminosidad";

let chartTemp, chartHum, chartLum, client;

// ==========================================
// RELOJ EN TIEMPO REAL
// ==========================================
function actualizarReloj() {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    
    document.getElementById('reloj').textContent = `${horas}:${minutos}:${segundos}`;
    
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaFormateada = ahora.toLocaleDateString('es-PE', opciones);
    document.getElementById('fecha').textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
}

setInterval(actualizarReloj, 1000);
actualizarReloj();

// ==========================================
// CONFIGURACIÓN DE GRÁFICAS
// ==========================================
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#94a3b8';

const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: 12,
            borderColor: 'rgba(59, 130, 246, 0.3)',
            borderWidth: 1
        }
    },
    scales: {
        y: { grid: { color: 'rgba(59, 130, 246, 0.1)' } },
        x: { grid: { display: false } }
    }
};

// Inicialización de Gráficas de Líneas
const ctxTemp = document.getElementById('tempChart').getContext('2d');
chartTemp = new Chart(ctxTemp, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Temperatura (°C)', data: [], borderColor: '#ff6b6b', backgroundColor: 'rgba(255, 107, 107, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0 }] },
    options: chartConfig
});

const ctxHum = document.getElementById('humChart').getContext('2d');
chartHum = new Chart(ctxHum, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Humedad (%)', data: [], borderColor: '#4ecdc4', backgroundColor: 'rgba(78, 205, 196, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0 }] },
    options: chartConfig
});

const ctxLum = document.getElementById('lumChart').getContext('2d');
chartLum = new Chart(ctxLum, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Luminosidad', data: [], borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0 }] },
    options: chartConfig
});

// ==========================================
// CONFIGURACIÓN DE MEDIDORES (GAUGES)
// ==========================================
const gaugeConfig = {
    responsive: true,
    maintainAspectRatio: false,
    circumference: 180,
    rotation: -90,
    cutout: '75%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } }
};

const centerTextPlugin = {
    id: 'centerText',
    afterDatasetsDraw(chart) {
        if (!chart.config.options.plugins.centerText) return;
        const { ctx, chartArea: { width, height } } = chart;
        ctx.save();
        const value = Number(chart.config.data.datasets[0].data[0]) || 0;
        const unit = chart.config.options.plugins.centerText.unit || '';
        ctx.font = 'bold 2.5em Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toFixed(1) + unit, width / 2, height / 2 + 30);
        ctx.restore();
    }
};
Chart.register(centerTextPlugin);

const tempPieChart = new Chart(document.getElementById('tempPieChart'), {
    type: 'doughnut',
    data: { datasets: [{ data: [0, 100], backgroundColor: ['#ff6b6b', 'rgba(59, 130, 246, 0.1)'], borderWidth: 0, borderRadius: 10 }] },
    options: { ...gaugeConfig, plugins: { centerText: { unit: '°C' } } }
});

const humPieChart = new Chart(document.getElementById('humPieChart'), {
    type: 'doughnut',
    data: { datasets: [{ data: [0, 100], backgroundColor: ['#4ecdc4', 'rgba(59, 130, 246, 0.1)'], borderWidth: 0, borderRadius: 10 }] },
    options: { ...gaugeConfig, plugins: { centerText: { unit: '%' } } }
});

const lumPieChart = new Chart(document.getElementById('lumPieChart'), {
    type: 'doughnut',
    data: { datasets: [{ data: [0, 100], backgroundColor: ['#fbbf24', 'rgba(59, 130, 246, 0.1)'], borderWidth: 0, borderRadius: 10 }] },
    options: { ...gaugeConfig, plugins: { centerText: { unit: '' } } }
});

// ==========================================
// CONEXIÓN MQTT
// ==========================================
function connectMQTT() {
    let clientID = "client_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client("io.adafruit.com", 443, clientID);

    client.onConnectionLost = (resp) => { if (resp.errorCode !== 0) setTimeout(connectMQTT, 3000); };
    client.onMessageArrived = onMessageArrived;

    client.connect({
        useSSL: true,
        userName: AIO_USERNAME,
        password: AIO_KEY,
        onSuccess: () => {
            document.getElementById('status-badge').innerHTML = '<span class="status-dot"></span>CONECTADO';
            document.getElementById('status-badge').style.color = '#22c55e';
            client.subscribe(FEED_TEMP);
            client.subscribe(FEED_HUM);
            client.subscribe(FEED_LUM);
        }
    });
}

function onMessageArrived(message) {
    const topic = message.destinationName;
    const valor = parseFloat(message.payloadString);
    const time = new Date().toLocaleTimeString('es-PE', { hour12: false });

    if (topic === FEED_TEMP) {
        document.getElementById("temp-value").innerText = valor.toFixed(1);
        document.getElementById("temp-mini").innerText = valor.toFixed(1);
        updateUI(chartTemp, tempPieChart, time, valor, 100);
    } else if (topic === FEED_HUM) {
        document.getElementById("hum-value").innerText = valor.toFixed(1);
        document.getElementById("hum-mini").innerText = valor.toFixed(1);
        updateUI(chartHum, humPieChart, time, valor, 100);
    } else if (topic === FEED_LUM) {
        document.getElementById("lum-value").innerText = valor.toFixed(0);
        document.getElementById("lum-mini").innerText = valor.toFixed(0);
        updateUI(chartLum, lumPieChart, time, valor, 100);
    }
}

function updateUI(chart, gauge, label, value, max) {
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update('none');

    const clamped = Math.max(0, Math.min(value, max));
    gauge.data.datasets[0].data = [clamped, max - clamped];
    gauge.update('none');
}

connectMQTT();
