# CarpFighter

A real-time web dashboard for visualizing carpal tunnel risk data from two MPU6050 gyroscopes connected to an Arduino via USB serial.

The backend reads gyroscope Z-values from the serial port, computes the difference between the two sensors, and serves the data over a REST API. The frontend displays a live chart and session summary stats.

---

## How it works

An Arduino reads from two MPU6050 sensors and sends one line per reading over USB serial:

```
D1: 1.2300 D2: 1.4500 Diff: 0.2200
```

The Flask backend parses each line in a background thread, keeps the last 500 readings in memory, and exposes them via API. The React frontend polls every second and renders a live line chart. A difference above **0.2** is flagged as potentially at-risk.

---

## Project structure

```
carpaltunnelapp/
├── backend/
│   ├── app.py              # Flask app + serial reader thread
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LiveData.jsx    # Real-time chart + diff display
    │   │   └── Report.jsx      # Session summary stats
    │   └── components/
    │       └── Navbar.jsx
    ├── package.json
    └── vite.config.js
```

---

## Requirements

- Python 3.10+
- Node.js 18+
- Arduino running a dual MPU6050 sketch, connected via USB

---

## Setup & running

### 1. Configure the serial port

Open `backend/app.py` and set `SERIAL_PORT` to match your system:

```python
SERIAL_PORT = "COM3"        # Windows
# SERIAL_PORT = "/dev/ttyUSB0"  # Linux
# SERIAL_PORT = "/dev/cu.usbmodem14101"  # macOS
```

To find your port: open Arduino IDE → Tools → Port, or run `python -m serial.tools.list_ports` after installing pyserial.

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Flask will start on `http://localhost:5000`. You'll see `[serial] connected on COM3 @ 9600` in the terminal once the Arduino is detected.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Vite proxies all `/api` requests to Flask automatically — no extra config needed.

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Returns the last 500 readings as JSON |
| GET | `/api/status` | Serial connection state, latest diff, threshold status |

Example `/api/status` response:
```json
{
  "connected": true,
  "port": "COM3",
  "threshold": 0.2,
  "total_readings": 142,
  "latest_diff": 0.1823,
  "above_threshold": false
}
```

---

## Arduino serial format

The backend expects lines in this format (case-insensitive):

```
D1: <float> D2: <float> Diff: <float>
```

If your sketch outputs something different, update `SERIAL_LINE_RE` in `backend/app.py` to match.

---

## Threshold

The risk threshold is set to **0.2** (difference between the two sensor Z-values). To change it, update `THRESHOLD` in `backend/app.py`. The frontend reads this value from `/api/status` and highlights accordingly — no frontend changes needed.
