#!/bin/bash
# One-shot launcher: creates a security group with port 9000 open and starts a t3.micro running the game.
# Needs the AWS CLI configured (aws configure). Usage: ./deploy/launch-ec2.sh [region]
set -euo pipefail
REGION=${1:-${AWS_REGION:-ap-south-1}}
TYPE=${INSTANCE_TYPE:-t3.micro}
NAME=cab-clash
HERE=$(cd "$(dirname "$0")" && pwd)
export AWS_REGION=$REGION

AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --query Parameter.Value --output text)
VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)

SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=$NAME Name=vpc-id,Values=$VPC --query 'SecurityGroups[0].GroupId' --output text)
if [ "$SG" = "None" ]; then
  SG=$(aws ec2 create-security-group --group-name $NAME --description "Cab Clash game on port 9000" --vpc-id "$VPC" --query GroupId --output text)
  aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 9000 --cidr 0.0.0.0/0 >/dev/null
fi

ID=$(aws ec2 run-instances --image-id "$AMI" --instance-type "$TYPE" --security-group-ids "$SG" \
  --user-data "file://$HERE/user-data.sh" --associate-public-ip-address \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME}]" \
  --query 'Instances[0].InstanceId' --output text)
echo "Launched $ID in $REGION, waiting for it to start…"
aws ec2 wait instance-running --instance-ids "$ID"
IP=$(aws ec2 describe-instances --instance-ids "$ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "Installing the game (about 1–2 minutes)…"
for i in $(seq 1 60); do curl -fs -o /dev/null "http://$IP:9000/" && break; sleep 5; done
echo
echo "Game:   http://$IP:9000/"
echo "Admin:  http://$IP:9000/admin   (password cd2026)"
echo "Stop:   aws ec2 terminate-instances --region $REGION --instance-ids $ID"
