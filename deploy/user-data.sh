#!/bin/bash
# EC2 user data (Amazon Linux 2023 or Ubuntu): installs Node, clones the game, runs it on port 9000.
# Paste this into "Advanced details → User data" when launching, or let launch-ec2.sh pass it.
set -euxo pipefail
REPO=https://github.com/Dhruvch1244/cab-clash.git
PORT=9000
ADMIN_PASSWORD=cd2026

if command -v dnf >/dev/null; then dnf install -y nodejs git
else apt-get update -y && apt-get install -y nodejs git; fi

id cabclash >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/cab-clash-home cabclash
rm -rf /opt/cab-clash && git clone --depth 1 "$REPO" /opt/cab-clash
mkdir -p /var/lib/cab-clash && chown cabclash /var/lib/cab-clash

# Public address for the admin QR code (IMDSv2).
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || true)

cat > /etc/systemd/system/cab-clash.service <<UNIT
[Unit]
Description=Cab Clash game + tracker
After=network-online.target
[Service]
User=cabclash
Environment=PORT=$PORT ADMIN_PASSWORD=$ADMIN_PASSWORD DATA_DIR=/var/lib/cab-clash PUBLIC_URL=${IP:+http://$IP:$PORT/}
ExecStart=/usr/bin/env node /opt/cab-clash/server.js
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now cab-clash
