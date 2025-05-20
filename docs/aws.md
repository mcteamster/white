# AWS Hosting Architecture
The game is hosted on AWS using the following services:
- CloudFront for the Web App
- AppRunner for the `boardgame.io` Lobby and Server in multiple regions (latency routing)
- API Gateway, SQS, and Lambda for the Global Card Creation and 'Like' API

![AWS Hosting Architecture](./img/aws.svg)