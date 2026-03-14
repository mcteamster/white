Blank White Cards
by tonz.io

/ - root
GET returns static homepage index.html

/app – client
GET returns app client page app.html

/card/:id – draw
(TODO) GET returns card with specified :id in html gallery style
POST returns a card in JSON with specified :id. If :id is undefined, returns a random card and also accepts an optional body with {like} feedback information.

/create/?{nonce} – make
GET passes a nonce as a query string. Returns create.html create-a-card screen if valid. Redirects to /error if invald.
POST submits card as JSON to database. Returns new card id on success. Redirects to /error if failed.

/about - information
GET returns general info on the game in about.html

/guidelines - rules
GET returns guidelines and tips on how to play in guidelines.html

/contact - communication
GET returns contact information in contact.html

/error - broken
GET returns error screen error.html

/:room/* - private
Prefixing URIs with a :room ID redirects the relevant function to a private lobby