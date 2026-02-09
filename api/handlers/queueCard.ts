import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const queueUrl = process.env.WHITE_QUEUE;

const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Origin": "https://blankwhite.cards",
  "Access-Control-Allow-Methods": "POST",
  "Content-Type": "application/json"
};

export const queueHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.info('received:', event);
  if (event.httpMethod !== 'POST') {
    throw new Error(`postMethod only accepts POST method, you tried: ${event.httpMethod} method.`);
  }

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: event.body || ''
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify('Items successfully queued for upload.')
    };
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify('Error queueing card for upload')
    };
  }
};
