import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getBoosterConfig } from '../lib/boosters';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://blankwhite.cards',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json',
};

/**
 * GET /v1/boosters
 * Returns the catalog of available booster packs.
 * Returns { boosters: [] } if no packs are configured.
 */
export const listBoostersHandler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const config = getBoosterConfig();

  // Strip server-side fields (theme) before responding
  const boosters = config.map(({ key, name, description, icon, cardCount, price, currency }) => ({
    key, name, description, icon, cardCount, price, currency,
  }));

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ boosters }),
  };
};
