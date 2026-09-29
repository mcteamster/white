import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { chunkKey } from '../lib/chunkKey.js';

const s3Client = new S3Client({ region: 'us-east-1' });
const cfClient = new CloudFrontClient();
const bucketName = process.env.WHITE_BUCKET;
const distributionId = process.env.DISTRIBUTION_ID;

const MAX_RETRIES = 3;

interface CardContent {
  title: string;
  description: string;
  author: string;
  image?: string;
  date: number;
}

interface Card {
  id?: number;
  content: CardContent;
  location: string;
}

interface Deck {
  cards: Card[];
}

function isPreconditionFailed(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    return e['name'] === 'PreconditionFailed' || e['Code'] === 'PreconditionFailed';
  }
  return false;
}

export const submitHandler = async (event: SQSEvent): Promise<SQSBatchResponse | null> => {
  console.info('received:', event);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = JSON.parse(event.Records[0].body);
  } catch (err) {
    if (err instanceof SyntaxError) {
      const snippet = event.Records[0].body.slice(0, 200);
      console.warn(`Malformed SQS message body (messageId=${event.Records[0].messageId}): ${snippet}`);
      return { batchItemFailures: [{ itemIdentifier: event.Records[0].messageId }] };
    }
    throw err;
  }
  const card: Card = {
    content: {
      title: body.title,
      description: body.description,
      author: body.author || 'anon',
      image: body.image,
      date: Number(new Date()),
    },
    location: 'deck',
  }

  if (card.content.title.length > 50 || card.content.title.length < 1) {
    throw new Error(`Invalid title length`);
  }
  if (card.content.description.length > 140 || card.content.description.length < 1) {
    throw new Error(`Invalid description length`);
  }
  if (card.content.author.length > 25 || card.content.author.length < 1) {
    throw new Error(`Invalid author length`);
  }
  if (card.content.image !== undefined) {
    if (card.content.image.startsWith("data:image/")) {
      throw new Error(`PNG data URIs are not accepted — image must be in compressed 1-bit format`);
    }
    const checksum = card.content.image.split('').reduce((total, char) => { return total + (char.charCodeAt(0) - 32) }, 0);
    if (checksum != (250000)) {
      throw new Error(`Invalid image data`);
    }
  }

  try {
    // Retry loop: up to MAX_RETRIES attempts to handle PreconditionFailed (lost-update race)
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // 1.1 Capture ETag from GetObjectCommand response
        const response = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: "decks/global.json",
        }));
        const etag = response.ETag;
        const responseString = await response.Body!.transformToString();
        const currentDeck: Deck = JSON.parse(responseString);
        card.id = currentDeck.cards.length + 1;
        const newDeck = { cards: [...currentDeck.cards, card] };
        const chunkIndex = Math.floor(currentDeck.cards.length / 100);
        const newDeckChunk = { cards: newDeck.cards.slice(chunkIndex * 100).filter(c => c.location !== 'box') };
        console.info(card);

        // 1.2 Pass IfMatch: etag on the PutObjectCommand for decks/global.json
        // Gate the write — only proceed to derivative writes after winning the race.
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: "decks/global.json",
          Body: JSON.stringify(newDeck),
          IfMatch: etag,
        }));

        // Write individual card file and chunk/manifest only after winning the conditional write
        // (Decision 3: these are derived from the global deck and must not be written for a losing attempt)
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: `card/${newDeck.cards.length}.json`,
          Body: JSON.stringify(card)
        }));

        // Chunk and manifest PUTs are unconditional (Decision 3)
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: `decks/global_${chunkKey(chunkIndex)}.json`,
          Body: JSON.stringify(newDeckChunk),
        }));

        const manifest = {
          chunks: Math.ceil(newDeck.cards.length / 100),
          totalCards: newDeck.cards.length
        };
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: "decks/global_manifest.json",
          Body: JSON.stringify(manifest),
        }));

        await cfClient.send(new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            Paths: {
              Quantity: 3,
              Items: ["/decks/global.json", `/decks/global_${chunkKey(chunkIndex)}.json`, "/decks/global_manifest.json"],
            },
            CallerReference: String(new Date()),
          },
        }));

        return null;
      } catch (error) {
        // 1.3 On PreconditionFailed, re-read and re-apply on next iteration
        if (isPreconditionFailed(error)) {
          console.warn(`PreconditionFailed on attempt ${attempt + 1}/${MAX_RETRIES}; retrying`);
          lastError = error;
          continue;
        }
        // Non-retryable error: surface it to the outer handler
        throw error;
      }
    }

    // 1.4 Exhausted retries: return batchItemFailures to SQS
    console.error('Exhausted retries on PreconditionFailed:', lastError);
    return { batchItemFailures: [{ "itemIdentifier": event.Records[0].messageId }] };
  } catch (error) {
    console.error(error);
    return { batchItemFailures: [{ "itemIdentifier": event.Records[0].messageId }] };
  }
};
