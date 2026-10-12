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

# 5. Open the port: host firewall, then the EC2 security group (needs AWS CLI + an instance role
#    allowed ec2:DescribeSecurityGroups and ec2:AuthorizeSecurityGroupIngress, or exported credentials).
if command -v firewall-cmd >/dev/null && $SUDO firewall-cmd --state >/dev/null 2>&1; then
  $SUDO firewall-cmd --permanent --add-port=$PORT/tcp >/dev/null && $SUDO firewall-cmd --reload >/dev/null && echo "Opened $PORT in firewalld."
elif command -v ufw >/dev/null && $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
  $SUDO ufw allow $PORT/tcp >/dev/null && echo "Opened $PORT in ufw."
fi

SG_NOTE=""
MD=http://169.254.169.254/latest/meta-data
TOKEN=$(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 120" || true)
md(){ curl -fs -m 2 -H "X-aws-ec2-metadata-token: $TOKEN" "$MD/$1"; }
if MAC=$(md mac); then
  REGION=$(md placement/region || true)
  SGS=$(md network/interfaces/macs/$MAC/security-group-ids | tr '\n' ' ' || true)
  if [ -n "$SGS" ] && ! command -v aws >/dev/null; then
    ( command -v dnf >/dev/null && $SUDO dnf install -y -q awscli >/dev/null 2>&1 ) || \
    ( command -v apt-get >/dev/null && $SUDO apt-get install -y -qq awscli >/dev/null 2>&1 ) || true
  fi
  if [ -n "$SGS" ] && command -v aws >/dev/null; then
    for SG in $SGS; do
      OPEN=$(aws ec2 describe-security-groups --region "$REGION" --group-ids "$SG" \
        --query "SecurityGroups[0].IpPermissions[?IpProtocol=='-1' || (FromPort<=\`$PORT\` && ToPort>=\`$PORT\`)] | length(@)" --output text 2>/dev/null || echo ERR)
      if [ "$OPEN" = "ERR" ]; then SG_NOTE=noperm; break; fi
      if [ "$OPEN" != "0" ]; then echo "Port $PORT already open in security group $SG."; SG_NOTE=ok; break; fi
    done
    if [ -z "$SG_NOTE" ]; then
      SG=${SGS%% *}
      if aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG" \
           --ip-permissions "IpProtocol=tcp,FromPort=$PORT,ToPort=$PORT,IpRanges=[{CidrIp=0.0.0.0/0,Description=cab-clash}]" >/dev/null 2>&1; then
        echo "Opened TCP $PORT in security group $SG."; SG_NOTE=ok
      else SG_NOTE=noperm; fi
    fi
  fi
  if [ "$SG_NOTE" != "ok" ]; then
    SG=${SGS%% *}
    cat <<HELP

  !! Could not open port $PORT in the security group automatically (this instance has no IAM role
     allowed to change security groups). Do ONE of these:
     - Console: EC2 → Instances → this instance → Security → ${SG:-its security group} → Edit inbound rules
                → Add rule: Custom TCP, port $PORT, source 0.0.0.0/0 → Save
     - From a machine with AWS credentials:
         aws ec2 authorize-security-group-ingress --region ${REGION:-<region>} --group-id ${SG:-<sg-id>} --protocol tcp --port $PORT --cidr 0.0.0.0/0
HELP
  fi
fi

cat <<MSG

  Cab Clash is running.
  Game:   $PUBLIC_URL
  Admin:  ${PUBLIC_URL}admin   (password: $ADMIN_PASSWORD)
  Logs:   $LOGS
  Data:   $DATA_DIR

MSG
