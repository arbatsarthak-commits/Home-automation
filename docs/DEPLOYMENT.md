# SmartNest Deployment Playbook

This guide documents three supported deployment channels, required secrets, and verification steps.

## Option A — Streamlit Cloud (Recommended)

1. Fork/clone the repository on GitHub.
2. Sign in to [Streamlit Cloud](https://share.streamlit.io/) and select “New app”.
3. Connect the SmartNest repo, select `main` branch, and `streamlit_app.py` (placeholder) or custom entry point.
4. Add secrets via the Streamlit UI:
   ```toml
   MQTT_BROKER = "wss://..."
   MQTT_USERNAME = "..."
   MQTT_PASSWORD = "..."
   STREAMLIT_EMAIL = "alerts@example.com"
   ```
5. Deploy; Streamlit will auto-redeploy on every push to `main`.
6. Final URL format: `https://your-username-smartnest.streamlit.app`.

**Tips**

- Use the `env.example` template for local development.
- Keep assets small (Streamlit Cloud offers 1 GB RAM/storage).
- Document hardware wiring diagrams inside `docs/`.

## Option B — GitHub Pages (Documentation)

1. Ensure `docs/` contains the markdown you want to publish.
2. In Repository Settings → Pages, set Source = “GitHub Actions”.
3. The provided `streamlit-deploy.yml` workflow builds the docs site and publishes to the `gh-pages` branch.
4. Visit `https://your-username.github.io/smartnest/` for public documentation.

**Recommended Additions**

- Hardware pinout tables.
- Installation walkthroughs.
- API references for MQTT topics and payload formats.

## Option C — Docker / Compose

### Dockerfile

```
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8501
CMD ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### docker-compose.yml

```
services:
  smartnest:
    build: .
    ports:
      - "8501:8501"
    environment:
      MQTT_BROKER: ${MQTT_BROKER}
      MQTT_USERNAME: ${MQTT_USERNAME}
      MQTT_PASSWORD: ${MQTT_PASSWORD}
```

Run with `docker compose up --build`.

### Cloud Hosting

- Push image to GHCR, Docker Hub, or ECR.
- Deploy to AWS App Runner / Azure Web Apps / Google Cloud Run / Heroku.

## Secrets Management

| Secret              | Description                    | Where to store                |
|---------------------|--------------------------------|-------------------------------|
| `MQTT_BROKER`       | HiveMQ wss endpoint            | `.env`, Streamlit secrets     |
| `MQTT_USERNAME`     | HiveMQ username                | `.env`, Streamlit secrets     |
| `MQTT_PASSWORD`     | HiveMQ password                | `.env`, Streamlit secrets     |
| `STREAMLIT_EMAIL`   | Streamlit deploy notifications | Streamlit Cloud secrets       |
| `STREAMLIT_TOKEN`   | CLI deploy token               | GitHub Actions repo secrets   |

Never commit the actual values—use the `env.example` template and GitHub’s encrypted secrets.

## CI/CD Workflow

`.github/workflows/streamlit-deploy.yml` covers:

1. Install dependencies.
2. Lint (`black`, `flake8`) + tests (`pytest`).
3. Deploy Streamlit app using CLI + token.
4. Build docs and push to Pages.

Set `STREAMLIT_EMAIL`, `STREAMLIT_TOKEN`, `MQTT_*` in repository secrets before enabling.

## Verification Checklist

- [ ] MQTT broker reachable from deployment target.
- [ ] Topics aligned with firmware: `home/led1`, `home/servo`, etc.
- [ ] Plotly CDN accessible (allowlist if needed).
- [ ] Service worker served over HTTPS (required for PWA).
- [ ] Desktop notifications permitted by user agent.
- [ ] Session timeout & PIN lock tested on shared devices.

