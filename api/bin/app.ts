#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WhiteApiStack } from '../lib/white-api-stack';

const app = new cdk.App();
new WhiteApiStack(app, 'WhiteApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-central-1' },
  bucketName: 'white-siterootbucket12816fbb-nlukaymnqjqi',
  distributionId: 'E2WWTLPCJ11IFP',
});
