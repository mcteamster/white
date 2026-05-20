import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

const s3Client = new S3Client({ region: 'us-east-1' });
const cfClient = new CloudFrontClient();
const bucketName = process.env.WHITE_BUCKET;

interface ModerateEvent {
  hide?: number[];
  show?: number[];
}

export const hideCard = async (event: ModerateEvent) => {
  const { hide = [], show = [] } = event;
  if (hide.length === 0 && show.length === 0) {
    return { error: 'Provide at least one card ID in "hide" or "show"' };
  }

  // Load global deck
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: "decks/global.json",
  }));
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

  // Update global deck
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: "decks/global.json",
    Body: JSON.stringify(deck),
  }));

  // Update affected chunks
  const invalidationPaths = ["/decks/global.json"];
  for (const chunkIndex of affectedChunks) {
    const chunkCards = deck.cards.slice(chunkIndex * 100, (chunkIndex + 1) * 100);
    const chunkKey = `decks/global_${String(chunkIndex * 100 + 1).padStart(3, '0')}.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: chunkKey,
      Body: JSON.stringify({ cards: chunkCards }),
    }));
    invalidationPaths.push(`/${chunkKey}`);
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
    DistributionId: "EZ5S4QE3SZ0Y7",
    InvalidationBatch: {
      Paths: { Quantity: invalidationPaths.length, Items: invalidationPaths },
      CallerReference: String(Date.now()),
    },
  }));

  return { results, invalidated: invalidationPaths };
};
