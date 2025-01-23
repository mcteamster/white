#!/bin/bash

## Extract from the API
echo '{"cards": [' > dump.json
curl -X POST https://blankcard.me/card/1 | jq -r '.[]' >> dump.json
for i in $(seq 2 384)
do 
  echo ',' >> dump.json; curl -X POST https://blankcard.me/card/$i | jq -r '.[]' >> dump.json
done
echo ']}' >> dump.json

# Transform 
echo 'export const initialData =' > initialData.ts
node transform.js >> initialData.ts