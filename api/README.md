# White API

CDK stack for deploying the Blank White Cards submission API.

## Structure
```
api/
├── bin/app.ts              # CDK app entry point
├── lib/white-api-stack.ts  # Stack definition
├── handlers/               # Lambda function handlers
│   ├── queueCard.ts
│   ├── queueCard.test.ts
│   ├── submitCard.ts
│   ├── submitCard.test.ts
│   ├── likeCard.ts
│   ├── likeCard.test.ts
│   ├── moderateCard.ts
│   └── moderateCard.test.ts
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
The Lambda functions require the following environment variables:

| Variable | Description |
|---|---|
| `WHITE_BUCKET` | S3 bucket name for card and deck storage |
| `DISTRIBUTION_ID` | CloudFront distribution ID for cache invalidation |
| `WHITE_QUEUE` | SQS queue URL for card submission |

Set `VITE_CARD_API` in your `.env` file to point to this API:
```bash
VITE_CARD_API='https://rest.blankwhite.cards'
```

## Resources
- API Gateway with CORS for https://blankwhite.cards
- SQS Queue with DLQ
- 4 Lambda functions
- References existing S3 bucket and CloudFront distribution

## Moderation
The `moderateCard` handler provides admin-level card moderation. It reads and
writes cards and the global deck in S3, updates card `location` to `"box"` (hide)
or `"deck"` (show), and triggers a CloudFront invalidation to propagate changes.
