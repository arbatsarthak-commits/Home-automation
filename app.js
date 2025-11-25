const MQTT_CONFIG = {
  url: 'wss://b6340d49c97943efbdd999a355bd00d0.s1.eu.hivemq.cloud:8884/mqtt',
  options: {
    username: 'sarthak',
    password: 'Sarthak@825',
    keepalive: 60,
    clean: true,
    reconnectPeriod: 0,
    clientId: `smartnest-${Math.random().toString(16).slice(2, 10)}`
  }
};

const DEVICE_CATALOG = [
  { id: 'led1', name: 'LED 1', icon: '💡', group: 'Living Room', topic: 'home/led1', type: 'binary', location: 'Accent Light' },
  { id: 'led2', name: 'LED 2', icon: '✨', group: 'Garden', topic: 'home/led2', type: 'binary', location: 'Pathway' },
  { id: 'bulb', name: 'Bulb', icon: '🔆', group: 'Dining', topic: 'home/bulb', type: 'binary', location: 'Chandelier' },
  { id: 'motor', name: 'Motor', icon: '⚙️', group: 'Utility', topic: 'home/motor', type: 'binary', location: 'Ventilation' },
  { id: 'servo', name: 'Servo', icon: '🔄', group: 'Bedroom', topic: 'home/servo', type: 'servo', location: 'Window Blind' }
];

const PRESET_SCENES = [
  {
    id: 'good-morning',
    label: 'Good Morning',
    description: 'All lights ON · Servo 0°',
    icon: '☀️',
    actions: [
      { topic: 'home/led1', payload: 'ON' },
      { topic: 'home/led2', payload: 'ON' },
      { topic: 'home/bulb', payload: 'ON' },
      { topic: 'home/servo', payload: '0' }
    ]
  },
  {
    id: 'movie-night',
    label: 'Movie Night',
    description: 'LED1 ON · Servo 90°',
    icon: '🎬',
    actions: [
      { topic: 'home/led1', payload: 'ON' },
      { topic: 'home/led2', payload: 'OFF' },
      { topic: 'home/bulb', payload: 'OFF' },
      { topic: 'home/servo', payload: '90' }
    ]
  },
  {
    id: 'sleep-mode',
    label: 'Sleep Mode',
    description: 'Everything OFF',
    icon: '🌙',
    actions: [
      { topic: 'home/led1', payload: 'OFF' },
      { topic: 'home/led2', payload: 'OFF' },
      { topic: 'home/bulb', payload: 'OFF' },
      { topic: 'home/motor', payload: 'OFF' },
      { topic: 'home/servo', payload: '0' }
    ]
  },
  {
    id: 'party-mode',
    label: 'Party Mode',
    description: 'All lights + motor',
    icon: '🎉',
    actions: [
      { topic: 'home/led1', payload: 'ON' },
      { topic: 'home/led2', payload: 'ON' },
      { topic: 'home/bulb', payload: 'ON' },
      { topic: 'home/motor', payload: 'ON' }
    ]
  },
  {
    id: 'away-mode',
    label: 'Away Mode',
    description: 'Randomized lighting',
    icon: '🧳',
    actions: [
      { topic: 'home/led1', payload: 'OFF' },
      { topic: 'home/led2', payload: 'ON' },
      { topic: 'home/bulb', payload: 'OFF' },
      { topic: 'home/motor', payload: 'OFF' }
    ]
  }
];

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

const DEFAULT_STATE = {
  devices: DEVICE_CATALOG.reduce((acc, device) => {
    acc[device.id] = {
      name: device.name,
      group: device.group,
      favorite: false,
      status: device.type === 'servo' ? 90 : 'OFF',
      history: [],
      lastUpdated: null
    };
    return acc;
  }, {}),
  preferences: {
    theme: 'dark',
    notifications: 'toast-sound',
    servoDefault: 90,
    autoReconnect: 'on',
    sessionTimeout: 15,
    soundEnabled: true,
    contrast: false,
    criticalConfirm: true
  },
  stats: {
    totalCommands: 0,
    avgResponse: 0,
    uptimeStart: Date.now(),
    devicesOnline: 0
  },
  security: {
    pinHash: md5('0000'),
    attemptsLeft: 5,
    locked: true,
    autoLockAt: null
  },
  customScenes: [],
  activity: [],
  servoHistory: [{ time: Date.now(), value: 90 }],
  responseTimes: [],
  queue: [],
  reconnects: 0,
  macros: [
    { id: 'vent-boost', label: 'Vent Boost', actions: [{ topic: 'home/motor', payload: 'ON' }] },
    { id: 'lights-cycle', label: 'Lights Cycle', actions: [{ topic: 'home/led1', payload: 'ON' }, { topic: 'home/led2', payload: 'OFF' }] }
  ]
};

let state = loadState();
let mqttClient;
let reconnectTimer;
let sessionTimer;
let deferredPrompt;
let audioCtx;

const selectors = {
  deviceGrid: document.getElementById('deviceGrid'),
  sceneGrid: document.getElementById('sceneGrid'),
  activityTimeline: document.getElementById('activityTimeline'),
  commandCount: document.getElementById('commandCount'),
  queueSize: document.getElementById('queueSize'),
  connectionStatus: document.getElementById('connectionStatus'),
  devicesOnline: document.getElementById('devicesOnline'),
  latencyValue: document.getElementById('latencyValue'),
  uptimeValue: document.getElementById('uptimeValue'),
  quickStats: document.getElementById('quickStats'),
  energyGauge: document.getElementById('energyGauge'),
  connectionQuality: document.getElementById('connectionQuality'),
  reconnectCount: document.getElementById('reconnectCount'),
  autoRetry: document.getElementById('autoRetry'),
  queueVisualizer: document.getElementById('queueVisualizer'),
  deviceHistory: document.getElementById('deviceHistory'),
  toastStack: document.getElementById('toastStack'),
  installPrompt: document.getElementById('installPrompt'),
  sessionStatus: document.getElementById('sessionStatus'),
  pinOverlay: document.getElementById('pinLockOverlay'),
  pinInput: document.getElementById('pinInput'),
  pinAttempts: document.getElementById('pinAttempts'),
  themeToggle: document.getElementById('themeToggle'),
  contrastToggle: document.getElementById('contrastToggle'),
  soundToggle: document.getElementById('soundToggle')
};

function loadState() {
  const saved = localStorage.getItem('smartnest-v2');
  if (!saved) return clone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(saved);
    return { ...clone(DEFAULT_STATE), ...parsed };
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function persistState() {
  localStorage.setItem('smartnest-v2', JSON.stringify(state));
}

function init() {
  setupTheme();
  renderScenes();
  renderDevices();
  renderAnalytics();
  renderMonitoring();
  renderCharts();
  bindUI();
  enforceSecurity();
  connectMQTT();
  startLoops();
  registerPWA();
}

function setupTheme() {
  document.body.classList.toggle('light', state.preferences.theme === 'light');
  document.documentElement.dataset.theme = state.preferences.theme;
  document.documentElement.dataset.contrast = state.preferences.contrast ? 'high' : 'normal';
  if (selectors.themeToggle) selectors.themeToggle.checked = state.preferences.theme !== 'light';
  if (selectors.contrastToggle) selectors.contrastToggle.checked = state.preferences.contrast;
  if (selectors.soundToggle) selectors.soundToggle.checked = state.preferences.soundEnabled;
}

function renderDevices() {
  const markup = DEVICE_CATALOG.map((device) => {
    const meta = state.devices[device.id];
    const statusClass = device.type === 'servo' ? 'running' : meta.status.toString().toLowerCase();
    const statusLabel = device.type === 'servo' ? `${meta.status}°` : meta.status;
    const favoriteClass = meta.favorite ? 'favorite active' : 'favorite';
    const controls = device.type === 'servo'
      ? `
        <div class="servo-track">
            <input type="range" min="0" max="180" value="${meta.status}" data-device="${device.id}" class="servo-slider">
            <p class="hotkeys">Current: <span data-servo="${device.id}">${meta.status}°</span></p>
        </div>
        <button class="primary" data-action="servo-send" data-device="${device.id}">Send Angle</button>`
      : `
        <div class="device-controls">
            <button class="primary" data-action="device" data-device="${device.id}" data-state="ON">Turn On</button>
            <button class="secondary" data-action="device" data-device="${device.id}" data-state="OFF">Turn Off</button>
        </div>`;

    return `
      <article class="card glass device-card" data-device="${device.id}" tabindex="0">
        <div class="device-header">
          <div class="device-meta">
            <h3>${meta.name}</h3>
            <span>${device.group} · ${device.location}</span>
          </div>
          <button class="${favoriteClass}" data-action="favorite" data-device="${device.id}" aria-label="Toggle favorite">★</button>
        </div>
        <span class="status-badge ${statusClass}" data-status="${device.id}">${statusLabel}</span>
        <div class="device-icon">${device.icon}</div>
        ${controls}
        <div class="device-footer">
          <button class="ghost sm" data-action="rename" data-device="${device.id}">Rename</button>
          <button class="ghost sm" data-action="history" data-device="${device.id}">History</button>
          <button class="ghost sm" data-action="group" data-device="${device.id}">Group</button>
        </div>
      </article>`;
  }).join('');

  selectors.deviceGrid.innerHTML = markup;
}

function renderScenes() {
  const scenes = [...PRESET_SCENES, ...state.customScenes];
  selectors.sceneGrid.innerHTML = scenes.map((scene) => `
    <button class="scene-card" data-action="scene" data-scene="${scene.id}">
      <div class="scene-icon">${scene.icon ?? '✨'}</div>
      <strong>${scene.label}</strong>
      <p>${scene.description}</p>
    </button>`).join('');
}

function renderAnalytics() {
  const uptime = ((Date.now() - state.stats.uptimeStart) / (1000 * 60 * 60)).toFixed(1);
  const stats = [
    { label: 'Commands Today', value: state.stats.totalCommands },
    { label: 'Avg Response', value: `${state.stats.avgResponse.toFixed(1)} ms` },
    { label: 'Devices Online', value: state.stats.devicesOnline },
    { label: 'Uptime (hrs)', value: uptime }
  ];
  selectors.quickStats.innerHTML = stats.map(stat => `
    <li>
      <span>${stat.label}</span>
      <strong>${stat.value}</strong>
    </li>`).join('');

  selectors.uptimeValue.textContent = `${uptime}h`;
  selectors.devicesOnline.textContent = state.stats.devicesOnline;
  selectors.energyGauge.textContent = `${(1 + Math.random()).toFixed(2)} kWh · ${(10 + Math.random() * 5).toFixed(1)} hrs`;
}

function renderMonitoring() {
  selectors.activityTimeline.innerHTML = state.activity.slice(0, 20).map(entry => `
    <li>
      <span>${entry.label}</span>
      <span>${entry.payload} · ${entry.time}</span>
    </li>`).join('') || '<li>No activity yet</li>';

  selectors.commandCount.textContent = `${state.stats.totalCommands} cmds`;

  selectors.queueSize.textContent = state.queue.length;
  selectors.queueVisualizer.innerHTML = state.queue.map((item, idx) => `
    <div class="queue-bar" style="height:${30 + idx * 6}px"></div>`).join('');

  const historyMarkup = DEVICE_CATALOG.map(device => {
    const entries = state.devices[device.id].history.slice(-4).map(entry => `<div>${entry}</div>`).join('') || '<div>No history</div>';
    return `<div class="history-card"><strong>${state.devices[device.id].name}</strong>${entries}</div>`;
  }).join('');
  selectors.deviceHistory.innerHTML = historyMarkup;
}

function renderCharts() {
  const servoTrace = {
    x: state.servoHistory.map(item => new Date(item.time)),
    y: state.servoHistory.map(item => item.value),
    type: 'scatter',
    line: { color: '#6366f1' }
  };
  Plotly.newPlot('servoChart', [servoTrace], { margin: { t: 20 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' } }, { displayModeBar: false });

  const durationData = {
    x: DEVICE_CATALOG.filter(d => d.type === 'binary').map(d => state.devices[d.id].name),
    y: DEVICE_CATALOG.filter(d => d.type === 'binary').map(() => Math.round(Math.random() * 60)),
    marker: { color: '#14b8a6' },
    type: 'bar'
  };
  Plotly.newPlot('durationChart', [durationData], { margin: { t: 20 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' } }, { displayModeBar: false });

  Plotly.newPlot('energyDonut', [{
    values: DEVICE_CATALOG.map(() => Math.round(Math.random() * 40) + 10),
    labels: DEVICE_CATALOG.map(d => d.name),
    hole: .5,
    type: 'pie'
  }], { margin: { t: 20 }, paper_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' } }, { displayModeBar: false });

  const activityTrace = {
    x: Array.from({ length: 8 }, (_, idx) => idx),
    y: Array.from({ length: 8 }, () => Math.round(Math.random() * 50)),
    fill: 'tozeroy',
    type: 'scatter',
    line: { color: '#8b5cf6' }
  };
  Plotly.newPlot('activityArea', [activityTrace], { margin: { t: 20 }, paper_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' } }, { displayModeBar: false });

  const heatmapData = [{
    z: Array.from({ length: 5 }, () => Array.from({ length: 7 }, () => Math.random())),
    x: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    y: DEVICE_CATALOG.map(d => d.name),
    type: 'heatmap',
    colorscale: 'Portland'
  }];
  Plotly.newPlot('usageHeatmap', heatmapData, { margin: { t: 20 }, paper_bgcolor: 'rgba(0,0,0,0)', font: { color: '#e2e8f0' } }, { displayModeBar: false });
}

function bindUI() {
  document.addEventListener('click', handleClick);
  document.addEventListener('input', handleInput);
  document.addEventListener('keydown', handleHotkeys);
  document.getElementById('preferencesForm').addEventListener('submit', handlePreferences);
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('importData').addEventListener('change', importData);
  document.getElementById('voiceSubmit').addEventListener('click', handleVoice);
  document.getElementById('batchExecute').addEventListener('click', handleBatch);
  document.getElementById('profileApply').addEventListener('click', handleProfile);
  document.getElementById('lockConsole').addEventListener('click', lockConsole);
  document.getElementById('enableDesktopNoti').addEventListener('click', enableDesktopNotifications);
  document.getElementById('criticalConfirm').addEventListener('change', (e) => state.preferences.criticalConfirm = e.target.checked);
  document.getElementById('soundEffects').addEventListener('change', (e) => state.preferences.soundEnabled = e.target.checked);
  document.getElementById('voiceBtn').addEventListener('click', () => document.getElementById('voiceInput').focus());
  document.getElementById('macroBtn').addEventListener('click', runMacro);
  document.getElementById('createSceneBtn').addEventListener('click', createScene);
  document.getElementById('manageScenesBtn').addEventListener('click', manageScenes);
  document.getElementById('openDocs').addEventListener('click', openDocs);
  document.getElementById('installBtn').addEventListener('click', triggerInstall);
  document.getElementById('dismissInstall').addEventListener('click', () => selectors.installPrompt.classList.add('hidden'));
  selectors.pinOverlay.addEventListener('click', (event) => {
    if (event.target === selectors.pinOverlay) return;
  });
  document.getElementById('pinSubmit').addEventListener('click', unlockConsole);
  document.getElementById('pinReset').addEventListener('click', resetPin);
  document.getElementById('batchSelect').addEventListener('change', resetSessionTimer);
  selectors.themeToggle.addEventListener('change', toggleTheme);
  selectors.contrastToggle.addEventListener('change', toggleContrast);
  selectors.soundToggle.addEventListener('change', toggleSound);
  document.getElementById('criticalConfirm').checked = state.preferences.criticalConfirm;
  document.getElementById('soundEffects').checked = state.preferences.soundEnabled;
  document.getElementById('criticalConfirm').addEventListener('change', (e) => {
    state.preferences.criticalConfirm = e.target.checked;
    persistState();
  });
  document.getElementById('soundEffects').addEventListener('change', (e) => {
    state.preferences.soundEnabled = e.target.checked;
    selectors.soundToggle.checked = e.target.checked;
    persistState();
  });
}

function handleClick(event) {
  const action = event.target.dataset.action;
  const deviceId = event.target.dataset.device;
  if (!action) return;

  resetSessionTimer();

  if (action === 'device') {
    sendDeviceCommand(deviceId, event.target.dataset.state);
  } else if (action === 'servo-send') {
    const slider = document.querySelector(`.servo-slider[data-device="${deviceId}"]`);
    sendDeviceCommand(deviceId, slider.value);
  } else if (action === 'favorite') {
    state.devices[deviceId].favorite = !state.devices[deviceId].favorite;
    persistState();
    renderDevices();
  } else if (action === 'rename') {
    const name = prompt('Rename device', state.devices[deviceId].name);
    if (name) {
      state.devices[deviceId].name = name;
      persistState();
      renderDevices();
    }
  } else if (action === 'history') {
    toast(`${state.devices[deviceId].history.slice(-5).join('\n') || 'No history yet'}`);
  } else if (action === 'group') {
    const group = prompt('Assign group', state.devices[deviceId].group);
    if (group) {
      state.devices[deviceId].group = group;
      persistState();
      renderDevices();
    }
  } else if (action === 'scene') {
    runScene(event.target.dataset.scene);
  }
}

function handleInput(event) {
  if (event.target.classList.contains('servo-slider')) {
    const deviceId = event.target.dataset.device;
    const value = event.target.value;
    document.querySelector(`[data-servo="${deviceId}"]`).textContent = `${value}°`;
  }
}

function handleHotkeys(event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
  if (event.code === 'Space') {
    const focused = document.activeElement.closest('.device-card');
    if (focused) {
      const deviceId = focused.dataset.device;
      const current = state.devices[deviceId].status;
      sendDeviceCommand(deviceId, current === 'ON' ? 'OFF' : 'ON');
    }
  }
  if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    const servoSlider = document.querySelector('.servo-slider');
    if (servoSlider) {
      const delta = event.code === 'ArrowLeft' ? -5 : 5;
      servoSlider.value = Math.min(180, Math.max(0, parseInt(servoSlider.value, 10) + delta));
      document.querySelector('[data-servo="servo"]').textContent = `${servoSlider.value}°`;
    }
  }
  if (event.ctrlKey && event.key.toLowerCase() === 'm') {
    sendDeviceCommand('motor', state.devices.motor.status === 'ON' ? 'OFF' : 'ON');
  }
}

function handlePreferences(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  state.preferences.theme = data.get('theme');
  state.preferences.notifications = data.get('notifications');
  state.preferences.servoDefault = Number(data.get('servoDefault'));
  state.preferences.autoReconnect = data.get('autoReconnect');
  state.preferences.sessionTimeout = Number(data.get('sessionTimeout'));
  persistState();
  setupTheme();
  toast('Preferences saved', 'success');
}

function toggleTheme(event) {
  state.preferences.theme = event.target.checked ? 'dark' : 'light';
  persistState();
  setupTheme();
}

function toggleContrast(event) {
  state.preferences.contrast = event.target.checked;
  persistState();
  setupTheme();
}

function toggleSound(event) {
  state.preferences.soundEnabled = event.target.checked;
  const soundEffectsToggle = document.getElementById('soundEffects');
  if (soundEffectsToggle) {
    soundEffectsToggle.checked = event.target.checked;
  }
  persistState();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'smartnest-backup.json';
  link.click();
  URL.revokeObjectURL(url);
  toast('Configuration exported', 'success');
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  file.text().then((text) => {
    try {
      const imported = JSON.parse(text);
      state = imported;
      persistState();
      renderDevices();
      renderScenes();
      renderAnalytics();
      renderMonitoring();
      toast('Configuration imported', 'success');
    } catch {
      toast('Invalid file', 'error');
    }
  });
}

function handleVoice() {
  const input = document.getElementById('voiceInput');
  const value = input.value.trim().toLowerCase();
  if (!value) return;
  const [command, device] = value.split(' ').filter(Boolean).slice(-2);
  if (device && command === 'on' || command === 'off') {
    const deviceId = DEVICE_CATALOG.find(d => d.id === device || d.name.toLowerCase() === device);
    if (deviceId) {
      sendDeviceCommand(deviceId.id, command.toUpperCase());
      input.value = '';
      return;
    }
  }
  toast('Could not parse command', 'error');
}

function handleBatch() {
  const value = document.getElementById('batchSelect').value;
  const actions = {
    'all-on': () => DEVICE_CATALOG.filter(d => d.type === 'binary').forEach(d => sendDeviceCommand(d.id, 'ON')),
    'all-off': () => DEVICE_CATALOG.filter(d => d.type === 'binary').forEach(d => sendDeviceCommand(d.id, 'OFF')),
    'lights-on': () => ['led1', 'led2', 'bulb'].forEach(id => sendDeviceCommand(id, 'ON')),
    'motor-cycle': () => {
      sendDeviceCommand('motor', 'ON');
      setTimeout(() => sendDeviceCommand('motor', 'OFF'), 3000);
    }
  };
  actions[value]?.();
  toast('Batch executed', 'success');
}

function handleProfile() {
  const value = document.getElementById('profileSelect').value;
  const profiles = {
    eco: () => {
      ['led1', 'led2', 'bulb'].forEach(id => sendDeviceCommand(id, 'OFF'));
      sendDeviceCommand('motor', 'OFF');
      sendDeviceCommand('servo', '10');
    },
    comfort: () => {
      ['led1', 'bulb'].forEach(id => sendDeviceCommand(id, 'ON'));
      sendDeviceCommand('servo', '45');
    },
    party: () => runScene('party-mode')
  };
  profiles[value]?.();
  toast('Profile applied', 'success');
}

function sendDeviceCommand(deviceId, payload) {
  const device = DEVICE_CATALOG.find(d => d.id === deviceId);
  if (!device) return;

  if (state.preferences.criticalConfirm && ['motor', 'bulb'].includes(deviceId) && payload === 'ON') {
    const confirmAction = confirm(`Confirm turning ${device.name} ${payload}?`);
    if (!confirmAction) return;
  }

  const command = {
    topic: device.topic,
    payload: device.type === 'servo' ? payload : payload.toUpperCase(),
    deviceId,
    timestamp: Date.now()
  };

  state.queue.push(command);
  renderMonitoring();
  if (mqttClient?.connected) {
    publishCommand(command);
  } else {
    toast('Offline. Command queued.', 'warning');
  }
}

function publishCommand(command) {
  mqttClient.publish(command.topic, command.payload, {}, (err) => {
    if (err) {
      toast('Failed to send command', 'error');
      return;
    }
    finalizeCommand(command);
  });
}

function finalizeCommand(command) {
  const deviceState = state.devices[command.deviceId];
  if (!deviceState) return;

  if (command.deviceId === 'servo') {
    deviceState.status = Number(command.payload);
    state.servoHistory.push({ time: Date.now(), value: Number(command.payload) });
  } else {
    deviceState.status = command.payload;
  }

  deviceState.lastUpdated = new Date().toLocaleTimeString();
  deviceState.history.push(`${command.payload} · ${deviceState.lastUpdated}`);
  state.stats.totalCommands += 1;
  const responseTime = Date.now() - command.timestamp;
  state.responseTimes.push(responseTime);
  state.stats.avgResponse = state.responseTimes.reduce((a, b) => a + b, 0) / state.responseTimes.length;

  state.activity.unshift({
    label: `${deviceState.name}`,
    payload: command.payload,
    time: new Date().toLocaleTimeString()
  });
  state.activity = state.activity.slice(0, 20);

  state.queue = state.queue.filter(item => item !== command);

  renderDevices();
  renderMonitoring();
  renderAnalytics();
  renderCharts();
  persistState();
  toast(`Command sent: ${deviceState.name} → ${command.payload}`, 'success');
  playFx();
}

function handleIncoming(topic, payload) {
  const value = payload.toString();
  const device = DEVICE_CATALOG.find(dev => topic.endsWith(dev.topic.split('/').pop()));
  if (!device) return;
  state.devices[device.id].status = device.type === 'servo' ? Number(value) : value.toUpperCase();
  state.devices[device.id].lastUpdated = new Date().toLocaleTimeString();
  persistState();
  renderDevices();
  renderMonitoring();
}

function connectMQTT() {
  mqttClient?.end(true);
  selectors.connectionStatus.querySelector('.status-value').textContent = 'Connecting…';

  mqttClient = window.mqtt?.connect(MQTT_CONFIG.url, MQTT_CONFIG.options);
  if (!mqttClient) {
    toast('MQTT library unavailable', 'error');
    return;
  }

  mqttClient.on('connect', () => {
    selectors.connectionStatus.classList.add('connected');
    selectors.connectionStatus.querySelector('.status-value').textContent = 'Connected';
    toast('Connected to HiveMQ', 'success');
    state.stats.devicesOnline = DEVICE_CATALOG.length;
    mqttClient.subscribe(DEVICE_CATALOG.map(d => d.topic));
    flushQueue();
    renderAnalytics();
    persistState();
  });

  mqttClient.on('reconnect', () => {
    selectors.connectionStatus.querySelector('.status-value').textContent = 'Reconnecting…';
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT error', err);
    selectors.connectionStatus.classList.remove('connected');
    selectors.connectionStatus.querySelector('.status-value').textContent = 'Error';
    toast('MQTT error encountered', 'error');
    scheduleReconnect();
  });

  mqttClient.on('offline', () => {
    selectors.connectionStatus.querySelector('.status-value').textContent = 'Offline';
    toast('Broker offline', 'warning');
  });

  mqttClient.on('message', (topic, payload) => handleIncoming(topic, payload));
}

function flushQueue() {
  while (state.queue.length && mqttClient.connected) {
    publishCommand(state.queue[0]);
  }
}

function scheduleReconnect() {
  if (state.preferences.autoReconnect === 'off') return;
  clearTimeout(reconnectTimer);
  state.reconnects += 1;
  selectors.reconnectCount.textContent = state.reconnects;
  reconnectTimer = setTimeout(connectMQTT, Math.min(20000, 2000 * state.reconnects));
}

function runScene(sceneId) {
  const scene = [...PRESET_SCENES, ...state.customScenes].find(s => s.id === sceneId);
  if (!scene) {
    toast('Scene not found', 'error');
    return;
  }
  scene.actions.forEach(action => {
    const device = DEVICE_CATALOG.find(d => d.topic === action.topic);
    if (device) {
      sendDeviceCommand(device.id, action.payload);
    }
  });
  toast(`${scene.label} activated`, 'success');
}

function createScene() {
  const name = prompt('Scene name');
  if (!name) return;
  const description = prompt('Description');
  const actions = prompt('Actions (comma separated: led1=ON,servo=45)');
  if (!actions) return;
  const parsedActions = actions.split(',').map(item => {
    const [id, value] = item.split('=');
    const device = DEVICE_CATALOG.find(d => d.id === id.trim());
    if (!device) return null;
    return { topic: device.topic, payload: value.trim() };
  }).filter(Boolean);
  state.customScenes.push({
    id: `custom-${Date.now()}`,
    label: name,
    description: description || 'Custom scene',
    icon: '⚙️',
    actions: parsedActions
  });
  persistState();
  renderScenes();
  toast('Scene saved', 'success');
}

function manageScenes() {
  if (!state.customScenes.length) {
    toast('No custom scenes stored', 'info');
    return;
  }
  const label = state.customScenes.map((scene, idx) => `${idx + 1}. ${scene.label}`).join('\n');
  const choice = prompt(`Delete scene number?\n${label}`);
  const idx = Number(choice) - 1;
  if (!Number.isNaN(idx) && state.customScenes[idx]) {
    state.customScenes.splice(idx, 1);
    persistState();
    renderScenes();
    toast('Scene deleted', 'success');
  }
}

function renderMonitoringStats() {
  const quality = Math.max(20, 100 - state.queue.length * 10);
  selectors.connectionQuality.style.setProperty('--quality', `${quality}%`);
  selectors.connectionQuality.style.background = `linear-gradient(90deg, #10b981 ${quality}%, rgba(255,255,255,0.1) ${quality}%)`;
  selectors.autoRetry.textContent = state.preferences.autoReconnect === 'on' ? 'Enabled' : 'Disabled';
  selectors.latencyValue.textContent = `${Math.round(Math.random() * 50) + 20}ms`;
}

function startLoops() {
  setInterval(() => {
    renderMonitoring();
    renderMonitoringStats();
    renderAnalytics();
  }, 4000);
  resetSessionTimer();
}

function toast(message, type = 'info') {
  const toastEl = document.createElement('div');
  toastEl.className = `toast ${type}`;
  toastEl.textContent = message;
  selectors.toastStack.appendChild(toastEl);
  setTimeout(() => toastEl.remove(), 4200);
}

function playFx() {
  if (!state.preferences.soundEnabled) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (error) {
    console.warn('Audio unavailable', error);
  }
}

function lockConsole() {
  state.security.locked = true;
  state.security.autoLockAt = null;
  persistState();
  selectors.pinOverlay.classList.remove('hidden');
  selectors.pinInput.value = '';
  selectors.pinInput.focus();
  selectors.sessionStatus.textContent = 'Session locked';
}

function unlockConsole() {
  const value = selectors.pinInput.value.trim();
  if (!value) return;
  if (md5(value) === state.security.pinHash) {
    state.security.locked = false;
    state.security.attemptsLeft = 5;
    selectors.pinOverlay.classList.add('hidden');
    selectors.sessionStatus.textContent = 'Session active';
    resetSessionTimer();
    persistState();
    toast('Console unlocked', 'success');
  } else {
    state.security.attemptsLeft -= 1;
    selectors.pinAttempts.textContent = `Attempts left: ${state.security.attemptsLeft}`;
    if (state.security.attemptsLeft <= 0) {
      toast('Too many attempts. Lockout for 1 minute.', 'error');
      setTimeout(() => {
        state.security.attemptsLeft = 5;
        selectors.pinAttempts.textContent = 'Attempts left: 5';
      }, 60000);
    } else {
      toast('Invalid PIN', 'error');
    }
  }
}

function resetPin() {
  const newPin = prompt('Set new 4-digit PIN');
  if (!newPin || newPin.length !== 4) {
    toast('PIN must be 4 digits', 'error');
    return;
  }
  state.security.pinHash = md5(newPin);
  persistState();
  toast('PIN updated', 'success');
}

function enforceSecurity() {
  if (state.security.locked) {
    selectors.pinOverlay.classList.remove('hidden');
    selectors.pinInput.focus();
  } else {
    selectors.pinOverlay.classList.add('hidden');
  }
}

function resetSessionTimer() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    toast('Session timed out', 'warning');
    lockConsole();
  }, state.preferences.sessionTimeout * 60 * 1000);
}

function enableDesktopNotifications() {
  if (!('Notification' in window)) {
    toast('Notifications not supported', 'error');
    return;
  }
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      new Notification('SmartNest', { body: 'Desktop alerts enabled.' });
      toast('Desktop notifications enabled', 'success');
    }
  });
}

function runMacro() {
  const macro = state.macros[Math.floor(Math.random() * state.macros.length)];
  macro.actions.forEach(action => {
    const device = DEVICE_CATALOG.find(d => d.topic === action.topic);
    if (device) {
      sendDeviceCommand(device.id, action.payload);
    }
  });
  toast(`${macro.label} macro run`, 'success');
}

function openDocs() {
  window.open('docs/DEPLOYMENT.md', '_blank');
}

function handleOffline() {
  toast('You are offline. Commands will queue.', 'warning');
}

function handleOnline() {
  toast('Network restored. Reconnecting…', 'success');
  connectMQTT();
}

window.addEventListener('offline', handleOffline);
window.addEventListener('online', handleOnline);

function registerPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(console.error);
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    selectors.installPrompt.classList.remove('hidden');
  });
}

function triggerInstall() {
  selectors.installPrompt.classList.add('hidden');
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(() => deferredPrompt = null);
}

init();

