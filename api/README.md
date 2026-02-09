# White API

CDK stack for deploying the Blank White Cards submission API.

## Structure
```
api/
├── bin/app.ts              # CDK app entry point
├── lib/white-api-stack.ts  # Stack definition
├── handlers/               # Lambda function handlers
│   ├── queueCard.ts
│   ├── submitCard.ts
│   └── likeCard.ts
├── cdk.json
├── tsconfig.json
└── package.json
```

## Deploy

```bash
cd api
npm install
npm run build
npx cdk bootstrap  # First time only
npx cdk deploy
```

## API Endpoints
- `POST /v1/submit` - Queue card for submission
- `POST /v1/like/{id}` - Like a card

## Environment Variables
Set `VITE_CARD_API` in your `.env` file to point to this API:
```bash
VITE_CARD_API='https://rest.blankwhite.cards'
```

## Resources
- API Gateway with CORS for https://blankwhite.cards
- SQS Queue with DLQ
- 3 Lambda functions
- References existing S3 bucket and CloudFront distribution
