import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { chunkKey } from '../lib/chunkKey.js';

const s3Client = new S3Client({ region: 'us-east-1' });
const cfClient = new CloudFrontClient();
const bucketName = process.env.WHITE_BUCKET;
const distributionId = process.env.DISTRIBUTION_ID;

const MAX_RETRIES = 3;

interface ModerateEvent {
  hide?: number[];
  show?: number[];
}

function isPreconditionFailed(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    return e['name'] === 'PreconditionFailed' || e['Code'] === 'PreconditionFailed';
  }
  return false;
}

export const hideCard = async (event: ModerateEvent) => {
  const { hide = [], show = [] } = event;
  if (hide.length === 0 && show.length === 0) {
    return { error: 'Provide at least one card ID in "hide" or "show"' };
  }

  // 2.3 Retry loop: re-read and re-apply hide/show mutations on PreconditionFailed
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // 2.1 Capture ETag from GetObjectCommand response for decks/global.json
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: "decks/global.json",
    }));
    const etag = response.ETag;
    const deck = JSON.parse(await response.Body!.transformToString());

    const affectedChunks = new Set<number>();
    const results: string[] = [];

    for (const id of hide) {
      const card = deck.cards.find((c: any) => c.id === id);
      if (card) {
        card.location = 'box';
        affectedChunks.add(Math.floor((id - 1) / 100));
        results.push(`${id}: hidden`);
      } else {
        results.push(`${id}: not found`);
      }
    }

    for (const id of show) {
      const card = deck.cards.find((c: any) => c.id === id);
      if (card) {
        card.location = 'deck';
        affectedChunks.add(Math.floor((id - 1) / 100));
        results.push(`${id}: shown`);
      } else {
        results.push(`${id}: not found`);
      }
    }

    try {
      // 2.2 Pass IfMatch: etag on PutObjectCommand for decks/global.json
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: "decks/global.json",
        Body: JSON.stringify(deck),
        IfMatch: etag,
      }));
    } catch (error) {
      // 2.3 On PreconditionFailed, re-read and re-apply on next iteration
      if (isPreconditionFailed(error)) {
        console.warn(`PreconditionFailed on attempt ${attempt + 1}/${MAX_RETRIES}; retrying`);
        continue;
      }
      // 2.4 Non-retryable error: propagate to caller
      throw error;
    }

    // Successful conditional write — update affected chunks (unconditional per Decision 3)
    const invalidationPaths = ["/decks/global.json"];
    for (const chunkIndex of affectedChunks) {
      const chunkCards = deck.cards.slice(chunkIndex * 100, (chunkIndex + 1) * 100);
      const chunkKeyStr = `decks/global_${chunkKey(chunkIndex)}.json`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: chunkKeyStr,
        Body: JSON.stringify({ cards: chunkCards }),
      }));
      invalidationPaths.push(`/${chunkKeyStr}`);
    }

    // Update individual card files
    for (const id of [...hide, ...show]) {
      const card = deck.cards.find((c: any) => c.id === id);
      if (!card) continue;
      try {
        const cardResponse = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: `card/${id}.json`,
        }));
        const cardData = JSON.parse(await cardResponse.Body!.transformToString());
        cardData.location = card.location;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: `card/${id}.json`,
          Body: JSON.stringify(cardData),
        }));
      } catch {
        // card file may not exist yet for newer cards
      }
    }

    // Invalidate CloudFront
    await cfClient.send(new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: { Quantity: invalidationPaths.length, Items: invalidationPaths },
        CallerReference: String(Date.now()),
      },
    }));

    return { results, invalidated: invalidationPaths };
  }

  // 2.4 Exhausted retries: propagate the error to the caller
  throw new Error(`Failed to update decks/global.json after ${MAX_RETRIES} attempts due to PreconditionFailed`);
};
