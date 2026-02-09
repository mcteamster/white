import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'eu-central-1' });
const bucketName = process.env.WHITE_BUCKET;

const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Origin": "https://blankwhite.cards",
  "Access-Control-Allow-Methods": "POST",
  "Content-Type": "application/json"
};

interface Card {
  likes?: number;
  [key: string]: any;
}

export const likeHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod !== 'POST') {
    throw new Error(`postMethod only accepts POST method, you tried: ${event.httpMethod} method.`);
  }
  console.info('received:', event);
  const id = event.pathParameters?.id;

  try {
    const s3response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: `card/${id}.json`,
    }));
    const responseString = await s3response.Body!.transformToString()
    const currentCard: Card = JSON.parse(responseString)

    if (currentCard.likes && currentCard.likes > 0) {
      currentCard.likes += 1;
    } else {
      currentCard.likes = 1;
    }

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: `card/${id}.json`,
      Body: JSON.stringify(currentCard)
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ likes: currentCard.likes })
    };
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(`Error liking Card ${id}`)
    };
  }
};
