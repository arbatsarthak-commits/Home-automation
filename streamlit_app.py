import json
import os
import time
from datetime import datetime

import plotly.express as px
import streamlit as st

MQTT_BROKER = os.environ.get("MQTT_BROKER", "wss://b6340d49c97943efbdd999a355bd00d0.s1.eu.hivemq.cloud:8884/mqtt")
MQTT_USERNAME = os.environ.get("MQTT_USERNAME", "sarthak")
MQTT_PASSWORD = os.environ.get("MQTT_PASSWORD", "Sarthaak@825")

st.set_page_config(page_title="SmartNest Control Center", layout="wide", page_icon="⚡")

st.title("SmartNest — Streamlit Control Surface")
st.caption("Mirror of the static dashboard for environments that require server-side secrets.")

st.sidebar.subheader("MQTT Connection")
st.sidebar.code(
    f"""
Broker  : {MQTT_BROKER}
User    : {MQTT_USERNAME}
Password: {'•' * len(MQTT_PASSWORD)}
"""
)

st.sidebar.subheader("Scenes")
scene = st.sidebar.selectbox(
    "Pre-built scene",
    ["Good Morning", "Movie Night", "Sleep Mode", "Party Mode", "Away Mode"],
)
if st.sidebar.button("Trigger Scene"):
    st.sidebar.success(f"{scene} scene dispatched (mock)")

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Commands Today", 42, "+8 vs yesterday")
with col2:
    st.metric("Average Latency", "38 ms", "-4 ms vs avg")
with col3:
    st.metric("Online Devices", 5, "+1 new")

st.subheader("Device Toggles (mock)")
devices = {
    "LED 1": st.toggle("LED 1", value=True),
    "LED 2": st.toggle("LED 2"),
    "Bulb": st.toggle("Bulb"),
    "Motor": st.toggle("Motor"),
}
st.write("Payload preview:", json.dumps(devices, indent=2))

st.subheader("Servo Position")
angle = st.slider("Servo Angle", min_value=0, max_value=180, value=90)
st.write(f"Sending `home/servo` → `{angle}`")

st.subheader("Plotly Telemetry")
timestamps = [datetime.now().replace(minute=i) for i in range(0, 60, 5)]
servo_vals = [90 + (i % 4) * 5 for i in range(len(timestamps))]
fig = px.line(x=timestamps, y=servo_vals, labels={"x": "Time", "y": "Servo °"})
fig.update_layout(template="plotly_dark", height=320)
st.plotly_chart(fig, use_container_width=True)

st.subheader("Activity Log")
log = [
    {"time": "10:04:11", "action": "LED1 → ON"},
    {"time": "10:05:49", "action": "Servo → 120°"},
    {"time": "10:07:03", "action": "Motor → OFF"},
]
st.table(log)

st.info(
    "This Streamlit surface demonstrates how to handle secrets on the server side. "
    "Use the static `index.html` for the production-grade PWA experience."
)

st.caption(f"Updated {time.strftime('%Y-%m-%d %H:%M:%S')} · MQTT username stored in Streamlit secrets.")

