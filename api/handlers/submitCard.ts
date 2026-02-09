import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";

const s3Client = new S3Client({ region: 'us-east-1' });
const cfClient = new CloudFrontClient();
const bucketName = process.env.WHITE_BUCKET;

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

export const submitHandler = async (event: SQSEvent): Promise<SQSBatchResponse | null> => {
  console.info('received:', event);

  const body = JSON.parse(event.Records[0].body);
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
  if (card.content.image !== undefined && !card.content.image.startsWith("data:image/png;base64,")) {
    const checksum = card.content.image.split('').reduce((total, char) => { return total + (char.charCodeAt(0) - 32) }, 0);
    if (checksum != (250000)) {
      throw new Error(`Invalid image data`);
    }
  } else if (card.content.image !== undefined && card.content.image.length > 250000) {
    throw new Error(`Image too large`);
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: "decks/global.json",
    }));
    const responseString = await response.Body!.transformToString()
    const currentDeck: Deck = JSON.parse(responseString)
    card.id = currentDeck.cards.length + 1;
    const newDeck = { cards: [...currentDeck.cards, card] };
    const chunkNumber = Math.floor(currentDeck.cards.length / 100)
    const newDeckChunk = { cards: newDeck.cards.slice(chunkNumber * 100) }
    console.info(card);

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: `card/${newDeck.cards.length}.json`,
        Body: JSON.stringify(card)
      }));

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: "decks/global.json",
        Body: JSON.stringify(newDeck),
      }));

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: `decks/global_${chunkNumber}01.json`,
        Body: JSON.stringify(newDeckChunk),
      }));

      await cfClient.send(new CreateInvalidationCommand({
        DistributionId: "E2MD2AEBRBIW7P",
        InvalidationBatch: {
          Paths: {
            Quantity: 1,
            Items: ["/decks/*"],
          },
          CallerReference: String(new Date()),
        },
      }));

      return null
    } catch (error) {
      console.error(error)
      return { batchItemFailures: [{ "itemIdentifier": event.Records[0].messageId }] }
    }
  } catch (error) {
    console.error(error)
    return { batchItemFailures: [{ "itemIdentifier": event.Records[0].messageId }] }
  }
};
