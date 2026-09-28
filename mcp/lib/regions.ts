// Use CJS require for @mcteamster/virgo — consistent with the rest of the mcp workspace.
/* eslint-disable @typescript-eslint/no-require-imports */
const { Virgo2AWS } = require('@mcteamster/virgo');

export const SERVERS: Record<string, string> = {
  AP: 'https://ap.blankwhite.cards',
  EU: 'https://eu.blankwhite.cards',
  NA: 'https://na.blankwhite.cards',
};

const GAME_SERVER_OVERRIDE = process.env.GAME_SERVER_URL;

export function getRegionFromMatchID(matchID: string): string | undefined {
  if (matchID.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
    if (matchID.match(/[BCDFG]$/)) return 'AP';
    if (matchID.match(/[HJKLM]$/)) return 'EU';
    if (matchID.match(/[NPQRS]$/)) return 'NA';
  }
  return undefined;
}

export function getServerForMatch(matchID: string): string {
  if (GAME_SERVER_OVERRIDE) return GAME_SERVER_OVERRIDE;
  const region = getRegionFromMatchID(matchID);
  if (region && SERVERS[region]) return SERVERS[region];
  return 'http://localhost:3000';
}

export function getServerForCreate(region?: string): string {
  if (GAME_SERVER_OVERRIDE) return GAME_SERVER_OVERRIDE;
  if (region && SERVERS[region.toUpperCase()]) return SERVERS[region.toUpperCase()];
  // Auto-detect from timezone
  const { closestRegion } = Virgo2AWS.getClosestRegion({ regions: ['us-east-1', 'eu-central-1', 'ap-southeast-1'] });
  const awsToRegion: Record<string, string> = { 'us-east-1': 'NA', 'eu-central-1': 'EU', 'ap-southeast-1': 'AP' };
  const detected = awsToRegion[closestRegion];
  if (detected && SERVERS[detected]) return SERVERS[detected];
  return SERVERS.NA;
}
