#!/bin/bash

## Extract from the API
echo '{"cards": [{"id": 1,"likes": 1,"title": "Card Number One","description": "Thank you so much for playing Blank White Cards! You ARE Number One! (+1 Point)","author": "mcteamster","date": "1.1.2000"'} > dump.json
for i in $(seq 2 384)
do 
  echo ',' >> dump.json; curl -X POST https://blankcard.me/card/$i | jq -r '.[]' >> dump.json
done
echo ']}' >> dump.json

## Transform
sed -i '' "s/&#x27;/'/g" dump.json
sed -i '' "s/&#x2F;/\//g" dump.json
sed -i '' "s/&amp;/\&/g" dump.json
sed -i '' "s/&quot;/\'/g" dump.json
sed -i '' "s/&lt;/\</g" dump.json
node transform.js > ../public/decks/global.json