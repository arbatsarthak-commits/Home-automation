# SmartNest Home Automation Cockpit

[![Build](https://img.shields.io/github/actions/workflow/status/your-username/smartnest/streamlit-deploy.yml?branch=main&label=CI)](https://github.com/your-username/smartnest/actions)
[![Version](https://img.shields.io/badge/version-v1.0.0-purple)](#versioning)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://www.python.org/)

SmartNest delivers an end‑to‑end MQTT dashboard featuring device analytics, automation scenes, security controls, CI/CD ready deployment, and Plotly-powered telemetry. It targets ESP8266/ESP32 devices connected to HiveMQ Cloud (or any MQTT broker) and can be hosted as a static PWA or a Streamlit app.

## Features

- Glassmorphism UI with responsive grid, PWA support, offline caching, mobile bottom-nav, install prompt, and swipe-friendly cards.
- Real-time MQTT controls for LEDs, bulb, motor, and servo plus keyboard shortcuts, batch operations, macros, and voice-style command parsing.
- Analytics hub: connection quality bar, queue visualization, latency tracker, command timeline, quick KPIs, energy gauge, and Plotly charts (line, bar, donut, area, heatmap).
- Scene automation: Good Morning, Movie Night, Sleep, Party, Away, plus customizable scenes with edit/delete.
- Device management: renaming, grouping, favorites, per-device history, mock energy stats, export/import of layouts.
- Security: PIN lock (MD5), session timeout, lockout counter, critical action confirmations, desktop notifications, toast alerts, and Streamlit secrets guidance.
- Deployment assets for Streamlit Cloud, GitHub Pages (docs), Docker/Compose, and GitHub Actions CI with lint, test, deploy steps.

## Quick Start

```bash
# clone and install dependencies (frontend only, optional http server)
git clone https://github.com/your-username/smartnest.git
cd smartnest
npm install -g serve
serve .
```

Open `http://localhost:3000` to interact with the dashboard. Update `env.example` with your HiveMQ credentials, copy to `.env`, and keep secrets out of git.

## Streamlit Backend (optional)

Use Streamlit when you want server-side secrets, authentication, or CSV/JSON export endpoints.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Populate `.streamlit/secrets.toml`:

```toml
MQTT_BROKER = "wss://..."
MQTT_USERNAME = "..."
MQTT_PASSWORD = "..."
```

## Configuration

1. Copy `env.example` → `.env` and set:
   - `MQTT_BROKER`
   - `MQTT_USERNAME`
   - `MQTT_PASSWORD`
2. Update `manifest.json` icons if you have branded assets.
3. Adjust `MQTT_CONFIG` inside `app.js` or load via secrets (Streamlit).

## Deployment Options

See `docs/DEPLOYMENT.md` for a step-by-step walkthrough of:

- **Option A – Streamlit Cloud:** connect repo, add secrets, auto-deploy on push.
- **Option B – GitHub Pages:** publish documentation/generated static assets.
- **Option C – Docker:** build `Dockerfile`, run `docker compose up`, push to any registry/cloud.

## CI/CD

`.github/workflows/streamlit-deploy.yml` runs on every push to `main`:

1. Install Python 3.11, cache pip.
2. `pip install flake8 black pytest streamlit`.
3. `black --check` & `flake8`.
4. `pytest` (extend with hardware mocks as needed).
5. Deploy Streamlit app via `streamlit deploy`.
6. Build docs site → GitHub Pages branch.

Add repository secrets (`MQTT_*`, `STREAMLIT_EMAIL`, `STREAMLIT_TOKEN`) before enabling the workflow.

## Project Structure

```
.
├── index.html           # Dashboard shell
├── styles.css           # Design system & layout
├── app.js               # MQTT logic, analytics, charts, security
├── service-worker.js    # Offline cache/PWA
├── manifest.json        # PWA manifest
├── env.example          # Secrets template
├── docs/
│   └── DEPLOYMENT.md    # Streamlit/GitHub Pages/Docker guide
├── .github/workflows/
│   └── streamlit-deploy.yml
├── README.md
└── LICENSE
```

## Versioning & Branches

- `main`: stable releases (tagged `vX.Y.Z`)
- `develop`: integration/testing
- Feature branches → PR → develop → main

Use semantic versioning for release tags and update the badge above.

## License

MIT © 2025 SmartNest Contributors

