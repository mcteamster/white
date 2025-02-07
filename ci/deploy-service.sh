#!/bin/bash
account='922236493844'

# server deploy
podman build -f ./ci/Dockerfile -t white-service .
podman tag white-service:latest $account.dkr.ecr.ap-southeast-2.amazonaws.com/white-service:latest
aws ecr get-login-password --region ap-southeast-2 | podman login --username AWS --password-stdin $account.dkr.ecr.ap-southeast-2.amazonaws.com
podman push $account.dkr.ecr.ap-southeast-2.amazonaws.com/white-service:latest
aws cloudformation update-stack --stack-name white-service --template-body file://ci/ecs.yaml