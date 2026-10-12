#!/bin/bash
# Run Cab Clash on any Linux server you already have (EC2 Amazon Linux / Ubuntu / Debian / RHEL).
#   git clone https://github.com/Dhruvch1244/cab-clash && cd cab-clash && sudo ./deploy/setup.sh
# Re-run any time (e.g. after git pull) to restart with the latest code. Data is kept.
# Options via env: PORT=9000 ADMIN_PASSWORD=cd2026 PUBLIC_URL=http://my.host:9000/
set -euo pipefail
PORT=${PORT:-9000}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-cd2026}
APP_DIR=$(cd "$(dirname "$0")/.." && pwd)
DATA_DIR=${DATA_DIR:-/var/lib/cab-clash}
SUDO=; [ "$(id -u)" -ne 0 ] && SUDO=sudo

# 1. Node.js (any version 16+ works; the server has no npm dependencies)
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 16 ]; then
  echo "Installing Node.js…"
  if command -v dnf >/dev/null; then $SUDO dnf install -y nodejs
  elif command -v yum >/dev/null; then curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash - && $SUDO yum install -y nodejs
  elif command -v apt-get >/dev/null; then curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash - && $SUDO apt-get install -y nodejs
  else echo "Install Node.js 16+ manually, then re-run." >&2; exit 1; fi
fi
NODE=$(command -v node)

# 2. Public address for the admin QR code
if [ -z "${PUBLIC_URL:-}" ]; then
  TOKEN=$(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
  IP=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
  [ -z "$IP" ] && IP=$(curl -s -m 3 https://checkip.amazonaws.com || true)
  [ -z "$IP" ] && IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  PUBLIC_URL="http://$IP:$PORT/"
fi

# 3. Run as a service that restarts on crash and reboot
$SUDO mkdir -p "$DATA_DIR"
RUN_USER=${SUDO_USER:-$(id -un)}
$SUDO chown "$RUN_USER" "$DATA_DIR"
if command -v systemctl >/dev/null && [ -d /run/systemd/system ]; then
  $SUDO tee /etc/systemd/system/cab-clash.service >/dev/null <<UNIT
[Unit]
Description=Cab Clash game + tracker
After=network-online.target
[Service]
User=$RUN_USER
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
Environment=ADMIN_PASSWORD=$ADMIN_PASSWORD
Environment=DATA_DIR=$DATA_DIR
Environment=PUBLIC_URL=$PUBLIC_URL
ExecStart=$NODE $APP_DIR/server.js
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable cab-clash >/dev/null 2>&1
  $SUDO systemctl restart cab-clash
  LOGS="sudo journalctl -u cab-clash -f"
else
  pkill -f "$APP_DIR/server.js" || true
  PORT=$PORT ADMIN_PASSWORD=$ADMIN_PASSWORD DATA_DIR=$DATA_DIR PUBLIC_URL=$PUBLIC_URL \
    nohup "$NODE" "$APP_DIR/server.js" > "$DATA_DIR/server.log" 2>&1 &
  LOGS="tail -f $DATA_DIR/server.log"
fi

# 4. Check it answers
for i in $(seq 1 20); do curl -fs -o /dev/null "http://127.0.0.1:$PORT/" && OK=1 && break; sleep 0.5; done
[ -z "${OK:-}" ] && { echo "Server did not start. Logs: $LOGS" >&2; exit 1; }

cat <<MSG

  Cab Clash is running.
  Game:   $PUBLIC_URL
  Admin:  ${PUBLIC_URL}admin   (password: $ADMIN_PASSWORD)
  Logs:   $LOGS
  Data:   $DATA_DIR

  Not loading from outside? Open inbound TCP $PORT in the instance's security group
  (EC2 → Security groups → Edit inbound rules → Custom TCP $PORT, source 0.0.0.0/0).
MSG
