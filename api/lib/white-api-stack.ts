import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class WhiteApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference existing S3 bucket and CloudFront distribution
    const bucket = s3.Bucket.fromBucketName(this, 'WhiteBucket', 
      'blankwhitecards-customresourcestack-1-s3bucketroot-lq4ytptd6zk5');
    
    const distributionId = 'E2MD2AEBRBIW7P';

    // Dead Letter Queue
    const dlq = new sqs.Queue(this, 'WhiteDLQ', {
      queueName: 'BlankWhiteCardsDeadLetterQueue',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Main Queue
    const queue = new sqs.Queue(this, 'WhiteQueue', {
      queueName: 'BlankWhiteCardsQueue',
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 2 },
    });

    // Queue Handler Lambda
    const queueHandler = new lambda.Function(this, 'QueueHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handlers/queueCard.queueHandler',
      code: lambda.Code.fromAsset('dist'),
      timeout: cdk.Duration.seconds(20),
      environment: {
        WHITE_QUEUE: queue.queueUrl,
      },
    });
    queue.grantSendMessages(queueHandler);

    // Submit Handler Lambda
    const submitHandler = new lambda.Function(this, 'SubmitHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handlers/submitCard.submitHandler',
      code: lambda.Code.fromAsset('dist'),
      memorySize: 10240,
      reservedConcurrentExecutions: 1,
      timeout: cdk.Duration.seconds(20),
      environment: {
        WHITE_BUCKET: bucket.bucketName,
      },
    });
    bucket.grantReadWrite(submitHandler);
    submitHandler.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [`arn:aws:cloudfront::${this.account}:distribution/${distributionId}`],
    }));
    submitHandler.addEventSource(new SqsEventSource(queue, { batchSize: 1 }));

    // Like Handler Lambda
    const likeHandler = new lambda.Function(this, 'LikeHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'handlers/likeCard.likeHandler',
      code: lambda.Code.fromAsset('dist'),
      timeout: cdk.Duration.seconds(100),
      environment: {
        WHITE_BUCKET: bucket.bucketName,
      },
    });
    bucket.grantReadWrite(likeHandler);

    // Hosted Zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'blankwhite.cards',
    });

    // Certificate for *.blankwhite.cards in eu-central-1
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: '*.blankwhite.cards',
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'WhiteApi', {
      restApiName: 'Blank White Cards API',
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://blankwhite.cards'],
        allowMethods: ['POST'],
        allowHeaders: ['Content-Type'],
      },
    });

    // Custom Domain
    const domain = new apigateway.DomainName(this, 'CustomDomain', {
      domainName: 'rest.blankwhite.cards',
      certificate,
      endpointType: apigateway.EndpointType.REGIONAL,
    });

    domain.addBasePathMapping(api);

    // Route53 Record for Regional endpoint
    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: 'rest',
      target: route53.RecordTarget.fromAlias(
        new route53targets.ApiGatewayv2DomainProperties(
          domain.domainNameAliasDomainName,
          domain.domainNameAliasHostedZoneId
        )
      ),
    });

    const v1 = api.root.addResource('v1');
    
    v1.addResource('submit')
      .addMethod('POST', new apigateway.LambdaIntegration(queueHandler));
    
    v1.addResource('like')
      .addResource('{id}')
      .addMethod('POST', new apigateway.LambdaIntegration(likeHandler));

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'CustomDomainUrl', { value: `https://${domain.domainName}` });
  }
}
