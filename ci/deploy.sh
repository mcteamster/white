#!/bin/bash
distribution="E2RCDM21YWVYFB"
bucket="s3://white-customresourcestack-1jnvtik9vz8-s3bucketroot-ywxqmnekzlpf"

# cloudformation deploy
# aws --region us-east-1 cloudformation deploy --stack-name white --template-file ./template.yaml --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --parameter-overrides DomainName=mcteamster.com SubDomain=white HostedZoneId=Z0639363ZGUL9YOFVOMV CreateApex=no
# aws cloudfront get-distribution-config --id $distribution > distribution-config.json
# etag=$(jq -r ".ETag" < distribution-config.json)
# jq '.DistributionConfig.DefaultRootObject = "index.html" | .DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId = "e61eb60c-9c35-4d20-a928-2b84e02af89c" | .DistributionConfig' < distribution-config.json > new-config.json
# aws cloudfront update-distribution --id $distribution --distribution-config file://new-config.json --if-match $etag
# rm distribution-config.json
# rm new-config.json
# NEED TO RE-APPLY OAI to the S3 Origin?

# website deploy
npm ci
npm run build
aws s3 sync "./dist" "$bucket"

# invalidation
aws cloudfront create-invalidation --distribution-id=$distribution --path="/*"