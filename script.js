// ── CONFIG ──────────────────────────────────────────────────────────────────
// Using Open-Meteo (free, no key) + geocoding API
const GEO_URL  = 'https://geocoding-api.open-meteo.com/v1/search';
const WTHR_URL = 'https://api.open-meteo.com/v1/forecast';

let unit = 'metric'; // metric | imperial
let lastLat = null, lastLon = null;
let lastCity = '', lastCountry = '';

// ── BACKGROUND INIT ──────────────────────────────────────────────────────────
function makeStars() {
  const c = document.getElementById('stars');
  for (let i = 0; i < 130; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      left:${Math.random()*100}%; top:${Math.random()*100}%;
      width:${sz}px; height:${sz}px;
      --dur:${2+Math.random()*4}s; --op:${0.3+Math.random()*0.7};
      animation-delay:${-Math.random()*6}s;
    `;
    c.appendChild(s);
  }
}

function makeClouds(n=5, opacity=0.12) {
  const c = document.getElementById('clouds');
  c.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const cl = document.createElement('div');
    cl.className = 'cloud';
    const w = 120 + Math.random()*200, h = w*0.35;
    cl.style.cssText = `
      width:${w}px; height:${h}px; top:${5+Math.random()*50}%;
      background:rgba(255,255,255,${opacity});
      animation-duration:${40+Math.random()*60}s;
      animation-delay:${-Math.random()*60}s;
    `;
    c.appendChild(cl);
  }
}

function makeRain(active) {
  const w = document.getElementById('rainWrap');
  w.style.display = active ? 'block' : 'none';
  if (!active) return;
  w.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const d = document.createElement('div');
    d.className = 'rain-drop';
    const h = 15 + Math.random()*25;
    d.style.cssText = `
      left:${Math.random()*100}%; height:${h}px;
      animation-duration:${0.5+Math.random()*0.7}s;
      animation-delay:${-Math.random()*1.5}s;
    `;
    w.appendChild(d);
  }
}

function makeSnow(active) {
  const w = document.getElementById('snowWrap');
  w.style.display = active ? 'block' : 'none';
  if (!active) return;
  w.innerHTML = '';
  const flakes = ['❄','❅','❆','*'];
  for (let i = 0; i < 50; i++) {
    const s = document.createElement('div');
    s.className = 'snowflake';
    s.textContent = flakes[Math.floor(Math.random()*flakes.length)];
    s.style.cssText = `
      left:${Math.random()*100}%; font-size:${10+Math.random()*14}px;
      animation-duration:${3+Math.random()*5}s;
      animation-delay:${-Math.random()*6}s;
    `;
    w.appendChild(s);
  }
}

makeStars(); makeClouds();

// ── WEATHER CODE MAPPING ─────────────────────────────────────────────────────
function decodeWMO(code, isDay=1) {
  const map = {
    0:  { icon: isDay?'☀️':'🌙', desc:'Clear sky',       sky:'day'  },
    1:  { icon:'🌤',             desc:'Mainly clear',    sky:'day'  },
    2:  { icon:'⛅',             desc:'Partly cloudy',   sky:'day'  },
    3:  { icon:'☁️',             desc:'Overcast',        sky:'cloudy'},
    45: { icon:'🌫',             desc:'Fog',             sky:'cloudy'},
    48: { icon:'🌫',             desc:'Icy fog',         sky:'cloudy'},
    51: { icon:'🌦',             desc:'Light drizzle',   sky:'rainy' },
    53: { icon:'🌦',             desc:'Drizzle',         sky:'rainy' },
    55: { icon:'🌧',             desc:'Heavy drizzle',   sky:'rainy' },
    61: { icon:'🌧',             desc:'Slight rain',     sky:'rainy' },
    63: { icon:'🌧',             desc:'Rain',            sky:'rainy' },
    65: { icon:'🌧',             desc:'Heavy rain',      sky:'rainy' },
    71: { icon:'🌨',             desc:'Slight snow',     sky:'snowy' },
    73: { icon:'❄️',             desc:'Snow',            sky:'snowy' },
    75: { icon:'❄️',             desc:'Heavy snow',      sky:'snowy' },
    77: { icon:'🌨',             desc:'Snow grains',     sky:'snowy' },
    80: { icon:'🌦',             desc:'Rain showers',    sky:'rainy' },
    81: { icon:'🌧',             desc:'Rain showers',    sky:'rainy' },
    82: { icon:'⛈',             desc:'Heavy showers',   sky:'rainy' },
    85: { icon:'🌨',             desc:'Snow showers',    sky:'snowy' },
    86: { icon:'❄️',             desc:'Heavy snow shower',sky:'snowy'},
    95: { icon:'⛈',             desc:'Thunderstorm',    sky:'rainy' },
    96: { icon:'⛈',             desc:'Thunderstorm+hail',sky:'rainy'},
    99: { icon:'⛈',             desc:'Heavy thunderstorm',sky:'rainy'},
  };
  return map[code] || { icon:'🌈', desc:'Unknown', sky:'day' };
}

// ── SKY THEME ────────────────────────────────────────────────────────────────
function applySky(sky, code) {
  const bg = document.getElementById('skyBg');
  bg.className = 'sky-bg ' + sky;
  const isNight = sky === 'day' && code === 0; // night = clear + code 0 with isDay=0
  document.getElementById('stars').style.opacity = (sky === 'cloudy' || sky === 'day') ? '0.3' : '1';
  makeClouds(sky === 'cloudy' ? 9 : sky === 'rainy' ? 7 : 3,
             sky === 'cloudy' ? 0.2 : sky === 'snowy' ? 0.35 : 0.1);
  makeRain(sky === 'rainy');
  makeSnow(sky === 'snowy');
}

// ── UI ────────────────────────────────────────────────────────────────────────
function showStatus(msg, loading=false) {
  const el = document.getElementById('statusMsg');
  el.style.display = 'block';
  el.innerHTML = loading
    ? `<div class="loader"></div>${msg}`
    : msg;
  document.getElementById('weatherCard').classList.remove('visible');
}

function hideStatus() {
  document.getElementById('statusMsg').style.display = 'none';
}

function switchUnit(u) {
  unit = u;
  document.getElementById('btnC').classList.toggle('active', u==='metric');
  document.getElementById('btnF').classList.toggle('active', u==='imperial');
  if (lastLat !== null) fetchWeather(lastLat, lastLon, lastCity, lastCountry);
}

function updateDateTime(tz) {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric',
                 hour:'2-digit', minute:'2-digit', timeZone: tz||'UTC' };
  document.getElementById('dateTime').textContent = now.toLocaleString('en-US', opts);
}

// ── GEOCODING ────────────────────────────────────────────────────────────────
async function searchCity(query) {
  showStatus('Locating city…', true);
  try {
    const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(query)}&count=1&language=en`);
    const d = await res.json();
    if (!d.results?.length) { showStatus('City not found. Try another name.'); return; }
    const { latitude, longitude, name, country_code, timezone } = d.results[0];
    lastLat = latitude; lastLon = longitude;
    lastCity = name; lastCountry = country_code;
    await fetchWeather(latitude, longitude, name, country_code, timezone);
  } catch(e) {
    showStatus('Network error. Please try again.');
  }
}

// ── WEATHER FETCH ────────────────────────────────────────────────────────────
async function fetchWeather(lat, lon, city, country, tz='auto') {
  showStatus('Fetching weather…', true);
  const tempParam = unit === 'metric' ? 'celsius' : 'fahrenheit';
  const windParam = unit === 'metric' ? 'kmh' : 'mph';
  try {
    const url = `${WTHR_URL}?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,`
      + `wind_speed_10m,surface_pressure,visibility,weather_code,is_day`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min`
      + `&temperature_unit=${tempParam}&wind_speed_unit=${windParam}`
      + `&timezone=${encodeURIComponent(tz)}&forecast_days=6`;

    const res = await fetch(url);
    const d = await res.json();
    renderWeather(d, city, country, tz);
  } catch(e) {
    showStatus('Could not load weather data. Check your connection.');
  }
}

// ── RENDER ───────────────────────────────────────────────────────────────────
function renderWeather(d, city, country, tz) {
  hideStatus();
  const c = d.current;
  const code = c.weather_code;
  const isDay = c.is_day;
  const info = decodeWMO(code, isDay);

  document.getElementById('cityName').textContent = city;
  document.getElementById('countryCode').textContent = country;
  document.getElementById('tempVal').textContent = Math.round(c.temperature_2m);
  document.getElementById('tempUnit').textContent = unit === 'metric' ? '°C' : '°F';
  document.getElementById('descText').textContent = info.desc;
  document.getElementById('iconBig').textContent = info.icon;
  document.getElementById('feelsLike').textContent =
    `Feels like ${Math.round(c.apparent_temperature)}${unit==='metric'?'°C':'°F'}`;
  document.getElementById('humidity').textContent = c.relative_humidity_2m + '%';
  document.getElementById('windSpeed').textContent =
    Math.round(c.wind_speed_10m) + (unit==='metric'?' km/h':' mph');
  document.getElementById('visibility').textContent =
    c.visibility >= 1000 ? (c.visibility/1000).toFixed(1)+' km' : c.visibility+' m';
  document.getElementById('pressure').textContent = Math.round(c.surface_pressure) + ' hPa';

  // Forecast
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const fr = document.getElementById('forecastRow');
  fr.innerHTML = '';
  const today = new Date().getDay();
  for (let i = 1; i < 6; i++) {
    const di = decodeWMO(d.daily.weather_code[i]);
    const dayLabel = i === 1 ? 'Tmrw' : days[(today + i) % 7];
    const max = Math.round(d.daily.temperature_2m_max[i]);
    const min = Math.round(d.daily.temperature_2m_min[i]);
    const u = unit==='metric'?'°':'°';
    fr.innerHTML += `
      <div class="fc-item">
        <div class="fc-day">${dayLabel}</div>
        <div class="fc-icon">${di.icon}</div>
        <div class="fc-temp">${max}${u} <span style="opacity:.55">${min}${u}</span></div>
      </div>`;
  }

  updateDateTime(tz);
  applySky(!isDay ? 'night' : info.sky, code);
  document.getElementById('weatherCard').classList.add('visible');

  // re-apply night stars
  if (!isDay) {
    document.getElementById('stars').style.opacity = '1';
    document.getElementById('skyBg').style.background =
      'linear-gradient(160deg, #000308 0%, #050d1a 50%, #0a1628 100%)';
  }
}

// ── EVENTS ───────────────────────────────────────────────────────────────────
document.getElementById('searchBtn').addEventListener('click', () => {
  const q = document.getElementById('searchInput').value.trim();
  if (q) searchCity(q);
});
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    if (q) searchCity(q);
  }
});

// ── INIT: default city ────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  searchCity('London');
});
