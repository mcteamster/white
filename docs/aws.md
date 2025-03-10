# AWS Hosting Architecture
The game is hosted on AWS using the following services:
- CloudFront for the Web App
- EC2 for the `boardgame.io` Lobby
- EC2/ECS Fargate for the `boardgame.io` Server
- API Gateway, SQS, and Lambda for the Global Card Creation and 'Like' API

![AWS Hosting Architecture](./aws.svg)