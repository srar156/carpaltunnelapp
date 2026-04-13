"""
CarpFighter — Flask backend
Reads two MPU6050 gyroscopes from an Arduino over USB serial and serves
the buffered data via a simple REST API.

Expected Arduino serial format (one line per reading):
    D1: 1.2300 D2: 1.4500 Diff: 0.2200
The regex below is intentionally flexible; adjust SERIAL_LINE_RE if your
Arduino sketch uses a different format.
"""

import re
import threading
import time
from collections import deque
from datetime import datetime

import serial
from flask import Flask, jsonify
from flask_cors import CORS

# ── Configuration ────────────────────────────────────────────────────────────
SERIAL_PORT   = "COM3"   # change to your port, e.g. "/dev/ttyUSB0" on Linux
BAUD_RATE     = 9600
MAX_BUFFER    = 500      # keep only the last N readings in memory
THRESHOLD     = 0.2      # difference magnitude above this is flagged

# Regex that parses lines like:  D1: 1.23  D2: 4.56  Diff: 3.33
# Groups: (device1_z, device2_z, difference)
SERIAL_LINE_RE = re.compile(
    r"D1:\s*([-\d.]+).*?D2:\s*([-\d.]+).*?Diff:\s*([-\d.]+)",
    re.IGNORECASE,
)
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

# Shared state — all writes happen from the serial thread,
# reads happen from Flask request threads.  A deque is thread-safe for
# append/popleft operations under CPython's GIL.
readings: deque = deque(maxlen=MAX_BUFFER)
serial_connected = False
serial_error: str | None = None


def serial_reader():
    """Background thread: open the serial port and push parsed readings."""
    global serial_connected, serial_error

    while True:
        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2) as ser:
                serial_connected = True
                serial_error = None
                print(f"[serial] connected on {SERIAL_PORT} @ {BAUD_RATE}")

                while True:
                    raw = ser.readline()
                    if not raw:
                        continue
                    try:
                        line = raw.decode("utf-8", errors="replace").strip()
                    except Exception:
                        continue

                    m = SERIAL_LINE_RE.search(line)
                    if not m:
                        continue

                    d1   = float(m.group(1))
                    d2   = float(m.group(2))
                    diff = float(m.group(3))

                    readings.append({
                        "ts":   datetime.now().isoformat(timespec="milliseconds"),
                        "d1":   round(d1,   4),
                        "d2":   round(d2,   4),
                        "diff": round(diff, 4),
                    })

        except serial.SerialException as exc:
            serial_connected = False
            serial_error = str(exc)
            print(f"[serial] error: {exc} — retrying in 3 s")
            time.sleep(3)


# Start the background reader thread
_reader_thread = threading.Thread(target=serial_reader, daemon=True)
_reader_thread.start()


# ── API endpoints ─────────────────────────────────────────────────────────────

@app.route("/api/data")
def get_data():
    """Return buffered readings as a JSON array (oldest → newest)."""
    return jsonify(list(readings))


@app.route("/api/status")
def get_status():
    """Return serial connection state and current threshold status."""
    latest_diff = readings[-1]["diff"] if readings else None
    above = (latest_diff is not None) and (abs(latest_diff) > THRESHOLD)

    return jsonify({
        "connected":       serial_connected,
        "error":           serial_error,
        "port":            SERIAL_PORT,
        "threshold":       THRESHOLD,
        "total_readings":  len(readings),
        "latest_diff":     latest_diff,
        "above_threshold": above,
    })


if __name__ == "__main__":
    app.run(debug=False, port=5000)
